// ═══════════════════════════════════════════════════
// DocuMind AI — BM25 Retrieval Engine
// Client-side keyword retrieval for RAG pipeline
// ═══════════════════════════════════════════════════

import type { ChunkRecord, ContextChunk } from '@/types';

// ── Tokenizer ─────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'with', 'from', 'by', 'as', 'be', 'was', 'were', 'been',
  'are', 'am', 'has', 'had', 'have', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her',
  'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'when', 'where',
  'why', 'how', 'if', 'then', 'so', 'no', 'yes', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
  'very', 'just', 'about', 'above', 'after', 'again', 'also', 'any', 'because',
  'before', 'between', 'during', 'into', 'only', 'over', 'same', 'through',
  'under', 'until', 'up', 'while',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// ── BM25 Implementation ──────────────────────────

const K1 = 1.5; // term frequency saturation parameter
const B = 0.75; // document length normalization parameter

interface BM25Index {
  docFreq: Map<string, number>; // term → number of chunks containing it
  totalDocs: number;
  avgDocLength: number;
}

function buildIndex(chunks: ChunkRecord[]): BM25Index {
  const docFreq = new Map<string, number>();
  let totalLength = 0;

  for (const chunk of chunks) {
    const tokens = new Set(tokenize(chunk.content));
    totalLength += tokenize(chunk.content).length;
    for (const token of tokens) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }

  return {
    docFreq,
    totalDocs: chunks.length,
    avgDocLength: chunks.length > 0 ? totalLength / chunks.length : 0,
  };
}

function idf(term: string, index: BM25Index): number {
  const df = index.docFreq.get(term) ?? 0;
  // BM25 IDF formula with smoothing
  return Math.log(1 + (index.totalDocs - df + 0.5) / (df + 0.5));
}

function scoreChunk(queryTokens: string[], chunkTokens: string[], index: BM25Index): number {
  const docLength = chunkTokens.length;
  const termFreqs = new Map<string, number>();

  for (const token of chunkTokens) {
    termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
  }

  let score = 0;
  for (const qt of queryTokens) {
    const tf = termFreqs.get(qt) ?? 0;
    if (tf === 0) continue;

    const idfScore = idf(qt, index);
    const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLength / index.avgDocLength)));
    score += idfScore * tfNorm;
  }

  return score;
}

// ── Public API ────────────────────────────────────

/**
 * Retrieve the top-k most relevant chunks for a given query using BM25 scoring.
 */
export function retrieveTopChunks(
  query: string,
  chunks: ChunkRecord[],
  documentName: string,
  topK: number = 5
): ContextChunk[] {
  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    // If no meaningful tokens, return first k chunks
    return chunks.slice(0, topK).map((c) => ({
      content: c.content,
      pageNumber: c.pageNumber,
      documentName,
      relevanceScore: 0,
      chunkIndex: c.chunkIndex,
    }));
  }

  const index = buildIndex(chunks);

  // Score all chunks
  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.content);
    const score = scoreChunk(queryTokens, chunkTokens, index);
    return { chunk, score };
  });

  // Sort by score descending, take top-k
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, topK);

  return topChunks.map(({ chunk, score }) => ({
    content: chunk.content,
    pageNumber: chunk.pageNumber,
    documentName,
    relevanceScore: Math.round(score * 1000) / 1000,
    chunkIndex: chunk.chunkIndex,
  }));
}

/**
 * Build a formatted context string from retrieved chunks for the AI prompt.
 */
export function buildContextString(contextChunks: ContextChunk[]): string {
  return contextChunks
    .map((c) => `[Source: ${c.documentName}, Page ${c.pageNumber}]\n${c.content}`)
    .join('\n\n---\n\n');
}
