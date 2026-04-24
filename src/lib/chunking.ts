// ═══════════════════════════════════════════════════
// DocuMind AI — Text Chunking Utility
// Sliding window chunker for PDF text
// ═══════════════════════════════════════════════════

import type { ChunkRecord } from '@/types';

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 150;

interface PageTextSource {
  num: number;
  text: string;
}

function chunkSegment(
  text: string,
  pageNumber: number,
  initialChunkIndex: number,
  chunkSize: number,
  overlap: number,
): ChunkRecord[] {
  const chunks: ChunkRecord[] = [];
  let start = 0;
  let chunkIndex = initialChunkIndex;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const lookback = text.substring(Math.max(start, end - 100), end);
      const lastBreak = Math.max(
        lookback.lastIndexOf('. '),
        lookback.lastIndexOf('.\n'),
        lookback.lastIndexOf('! '),
        lookback.lastIndexOf('? '),
        lookback.lastIndexOf('\n\n'),
      );

      if (lastBreak > 0) {
        end = end - (lookback.length - lastBreak - 1);
      }
    }

    const content = text.substring(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        pageNumber,
        chunkIndex,
        startChar: start,
        endChar: end,
      });
      chunkIndex += 1;
    }

    if (end >= text.length) {
      break;
    }

    const step = end - start - overlap;
    start += Math.max(step, 1);
  }

  return chunks;
}

/**
 * Splits raw text into overlapping chunks using a sliding window approach.
 * Each chunk is annotated with page number (estimated), character positions, and index.
 */
export function chunkText(
  fullText: string,
  pageCount: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): ChunkRecord[] {
  if (!fullText || fullText.trim().length === 0) return [];

  const chunks: ChunkRecord[] = [];
  const totalChars = fullText.length;
  const charsPerPage = pageCount > 0 ? Math.ceil(totalChars / pageCount) : totalChars;

  let start = 0;
  let chunkIndex = 0;

  while (start < totalChars) {
    let end = Math.min(start + chunkSize, totalChars);

    // Try to break at a sentence boundary (., !, ?, newline) within last 100 chars
    if (end < totalChars) {
      const lookback = fullText.substring(Math.max(start, end - 100), end);
      const lastBreak = Math.max(
        lookback.lastIndexOf('. '),
        lookback.lastIndexOf('.\n'),
        lookback.lastIndexOf('! '),
        lookback.lastIndexOf('? '),
        lookback.lastIndexOf('\n\n')
      );
      if (lastBreak > 0) {
        end = end - (lookback.length - lastBreak - 1);
      }
    }

    const content = fullText.substring(start, end).trim();
    if (content.length > 0) {
      // Estimate page number based on character position
      const midChar = start + Math.floor((end - start) / 2);
      const pageNumber = Math.min(Math.floor(midChar / charsPerPage) + 1, pageCount);

      chunks.push({
        content,
        pageNumber,
        chunkIndex,
        startChar: start,
        endChar: end,
      });
      chunkIndex++;
    }

    if (end >= totalChars) {
      break;
    }

    // Move window forward
    const step = end - start - overlap;
    start += Math.max(step, 1); // Ensure we always advance at least 1 char
  }

  // Cap at 500 chunks to avoid localStorage quota issues
  if (chunks.length > 500) {
    return chunks.slice(0, 500);
  }

  return chunks;
}

/**
 * Chunk already page-separated text so retrieval citations map to real page numbers.
 */
export function chunkPages(
  pages: PageTextSource[],
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP,
): ChunkRecord[] {
  if (pages.length === 0) return [];

  const chunks: ChunkRecord[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text?.trim();
    if (!pageText) continue;

    const pageChunks = chunkSegment(pageText, page.num, chunkIndex, chunkSize, overlap);
    chunks.push(...pageChunks);
    chunkIndex += pageChunks.length;
  }

  if (chunks.length > 500) {
    return chunks.slice(0, 500);
  }

  return chunks;
}

/**
 * Reconstruct approximate full text from chunks (for summarization).
 * Handles overlap by using only non-overlapping portions.
 */
export function reconstructText(chunks: ChunkRecord[]): string {
  if (chunks.length === 0) return '';
  
  const sorted = [...chunks].sort((a, b) => a.startChar - b.startChar);
  let result = sorted[0].content;
  let lastEnd = sorted[0].endChar;

  for (let i = 1; i < sorted.length; i++) {
    const chunk = sorted[i];
    if (chunk.startChar >= lastEnd) {
      // No overlap — just append
      result += '\n' + chunk.content;
    } else {
      // Overlapping — take only the new portion
      const overlapSize = lastEnd - chunk.startChar;
      if (overlapSize < chunk.content.length) {
        result += chunk.content.substring(overlapSize);
      }
    }
    lastEnd = Math.max(lastEnd, chunk.endChar);
  }

  return result;
}
