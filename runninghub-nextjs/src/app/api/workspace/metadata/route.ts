import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFileMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const filePath = body?.path as string | undefined;

		if (!filePath) {
			return NextResponse.json(
				{ error: 'Missing path' },
				{ status: 400 },
			);
		}

		const resolved = path.resolve(filePath);
		const stats = await fs.stat(resolved);
		if (!stats.isFile()) {
			return NextResponse.json(
				{ error: 'Path is not a file' },
				{ status: 400 },
			);
		}

		const extension = path.extname(resolved).toLowerCase();
		const imageExtensions = new Set([
			'.png',
			'.jpg',
			'.jpeg',
			'.gif',
			'.bmp',
			'.webp',
		]);
		const videoExtensions = new Set([
			'.mp4',
			'.webm',
			'.mkv',
			'.avi',
			'.mov',
			'.flv',
		]);

		const fileType = imageExtensions.has(extension)
			? 'image'
			: videoExtensions.has(extension)
				? 'video'
				: null;

		if (!fileType) {
			return NextResponse.json(
				{ error: 'Unsupported file type' },
				{ status: 400 },
			);
		}

		const metadata = await getFileMetadata(resolved, fileType);

		return NextResponse.json(
			{
				success: true,
				metadata,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	} catch (error) {
		console.error('Error reading metadata:', error);
		return NextResponse.json(
			{ error: 'Failed to read metadata' },
			{ status: 500, headers: { 'Cache-Control': 'no-store' } },
		);
	}
}
