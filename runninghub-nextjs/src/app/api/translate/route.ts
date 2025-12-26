/**
 * Translation API
 * Provides server-side translation using official Google Cloud Translation API v2
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

    const target = targetLang === 'zh' ? 'zh-CN' : targetLang;
    const source = sourceLang && sourceLang !== 'auto' ? sourceLang : undefined;

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured');
    }

    // Official Google Cloud Translation API v2
    const googleUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: target,
        source: source,
        format: 'text'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error: ${response.status}`, errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.data && data.data.translations && data.data.translations[0]) {
      return NextResponse.json({
        success: true,
        translatedText: data.data.translations[0].translatedText,
        detectedSourceLanguage: data.data.translations[0].detectedSourceLanguage
      });
    } else {
      throw new Error('Unexpected response format from Google API');
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

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured');
    }

    // Official Google Cloud Translation API v2 Detection
    const googleUrl = `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`;

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Detection error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.data && data.data.detections && data.data.detections[0] && data.data.detections[0][0]) {
      const detected = data.data.detections[0][0].language;
      // Map Google language codes to our internal ones
      let detectedLang = 'en';
      if (detected.startsWith('zh')) detectedLang = 'zh';
      else if (detected === 'en') detectedLang = 'en';
      else detectedLang = detected;

      return NextResponse.json({
        success: true,
        detectedLang,
      });
    }

    throw new Error('Failed to detect language');
  } catch (error) {
    console.error('Language detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Language detection failed' },
      { status: 500 }
    );
  }
}

