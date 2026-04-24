// ═══════════════════════════════════════════════════
// POST /api/documents/upload
// Accepts PDF, extracts text with pdf-parse, chunks it
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdf = (await import('pdf-parse')).default;

    let fullText = '';
    let pageCount = 1;

    try {
      const textResult = await pdf(buffer);
      fullText = textResult.text || '';
      pageCount = textResult.numpages || 1;
    } catch (error) {
      console.error('[Upload API Parse Error]', error);
      return NextResponse.json({ error: 'Failed to parse PDF. The file may be corrupted or password-protected.' }, { status: 422 });
    }

    if (fullText.trim().length === 0) {
      return NextResponse.json({ error: 'PDF contains no extractable text. It may be image-based.' }, { status: 422 });
    }

    // Chunk the text using real page boundaries when available.
    const { chunkText } = await import('@/lib/chunking');
    const chunks = chunkText(fullText, pageCount);

    const now = new Date().toISOString();
    const docId = uuidv4();

    const response = {
      id: docId,
      filename: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      pageCount,
      chunkCount: chunks.length,
      status: 'indexed' as const,
      createdAt: now,
      updatedAt: now,
      chunks,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Upload API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error during file processing' },
      { status: 500 }
    );
  }
}
