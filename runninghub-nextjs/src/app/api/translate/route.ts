/**
 * Translation API
 * Provides server-side translation using MyMemory Translation API (free, no API key)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }
    
    const { text, targetLang, sourceLang } = body;

    if (!text || !targetLang) {
      return NextResponse.json(
        { success: false, error: 'Text and target language are required' },
        { status: 400 }
      );
    }

    // Language code mapping
    const langMap: Record<string, string> = {
      'en': 'en-GB',
      'zh': 'zh-CN',
    };

    const target = langMap[targetLang] || targetLang;
    const source = sourceLang && langMap[sourceLang] ? langMap[sourceLang] : 'autodetect';

    // Use MyMemory Translation API (free, no API key required)
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;

    const response = await fetch(myMemoryUrl);

    if (!response.ok) {
      console.error(`Translation service error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Service response body:', text);
      throw new Error(`Translation service error: ${response.status}`);
    }

    const responseText = await response.text();
    // console.log('MyMemory Raw Response:', responseText); // Uncomment for deep debugging if needed

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse MyMemory response:', responseText);
      throw new Error('Invalid JSON from translation service');
    }

    if (data.responseStatus === 200) {
      return NextResponse.json({
        success: true,
        translatedText: data.responseData.translatedText,
      });
    } else {
      throw new Error(data.responseDetails || 'Translation failed');
    }
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
      },
      { status: 500 }
    );
  }
}

// Language detection endpoint
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text');

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    // Simple language detection
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const englishRegex = /[a-zA-Z]/;

    const hasChinese = chineseRegex.test(text);
    const hasEnglish = englishRegex.test(text);

    let detectedLang = 'en';
    if (hasChinese && !hasEnglish) {
      detectedLang = 'zh';
    }

    return NextResponse.json({
      success: true,
      detectedLang,
    });
  } catch (error) {
    console.error('Language detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Language detection failed' },
      { status: 500 }
    );
  }
}

