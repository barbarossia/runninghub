import { NextRequest, NextResponse } from 'next/server';
import { readLogs, clearLogs, writeLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logs = await readLogs(limit);

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await clearLogs();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.message || !body.level) {
      return NextResponse.json(
        { error: 'Missing required fields: message, level' },
        { status: 400 }
      );
    }

    const validLevels = ['info', 'success', 'warning', 'error', 'debug'];
    if (!validLevels.includes(body.level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      );
    }

    const source = body.source || 'ui';
    const validSources = ['ui', 'api', 'cli'];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    await writeLog(body.message, body.level, body.taskId, source, body.metadata);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write log:', error);
    return NextResponse.json(
      { error: 'Failed to write log' },
      { status: 500 }
    );
  }
}

