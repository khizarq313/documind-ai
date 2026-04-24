// ═══════════════════════════════════════════════════
// POST /api/query/stream
// Receives question + context chunks, streams Groq response as SSE
// ═══════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

const PRIMARY_MODEL = 'llama-3.1-8b-instant';
const FALLBACK_MODEL = 'llama3-8b-8192';

const SYSTEM_PROMPT = `You are DocuMind AI, an expert document intelligence assistant. Your role is to help users understand, analyze, and extract insights from their documents.

RULES:
- Answer ONLY based on the provided context. If the context doesn't contain enough information, say so clearly.
- Cite sources by page number when referencing specific information (e.g., "According to Page 3...").
- Use clean, well-structured Markdown formatting.
- Structure your response with:
  ## Answer
  A direct, comprehensive answer to the question.
  
  ## Key Points
  - Bullet points highlighting the most important findings.
  
  ## Evidence
  - Specific quotes or references from the document with page numbers.

- Be precise, thorough, and structured.
- If the question is a greeting or not about the document, respond helpfully but briefly.`;

interface QueryRequestBody {
  question: string;
  contextChunks: Array<{
    content: string;
    pageNumber: number;
    documentName: string;
    relevanceScore: number;
  }>;
  documentName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequestBody = await request.json();
    const { question, contextChunks, documentName } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: 'Question is required' })}\n\n`,
        { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: 'GROQ_API_KEY is not configured. Create .env.local with GROQ_API_KEY=your_key' })}\n\n`,
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    const groq = new Groq({ apiKey });

    // Build context from chunks
    const contextStr = contextChunks
      .map((c) => `[Source: ${c.documentName}, Page ${c.pageNumber}, Relevance: ${c.relevanceScore}]\n${c.content}`)
      .join('\n\n---\n\n');

    const userMessage = contextStr
      ? `Document: "${documentName}"\n\nContext from document:\n${contextStr}\n\nQuestion: ${question}`
      : `Question: ${question}`;

    const startTime = Date.now();
    let modelUsed = PRIMARY_MODEL;

    // Try primary model, fallback on error
    let stream;
    try {
      stream = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        max_tokens: 2048,
        temperature: 0.3,
      });
    } catch {
      modelUsed = FALLBACK_MODEL;
      stream = await groq.chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        max_tokens: 2048,
        temperature: 0.3,
      });
    }

    // Create SSE ReadableStream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(
                encoder.encode(`event: token\ndata: ${JSON.stringify({ token: delta })}\n\n`)
              );
            }
          }

          // Emit citations
          for (const chunk of contextChunks) {
            controller.enqueue(
              encoder.encode(
                `event: citation\ndata: ${JSON.stringify({
                  documentName: chunk.documentName,
                  pageNumber: chunk.pageNumber,
                })}\n\n`
              )
            );
          }

          // Emit done event
          const latencyMs = Date.now() - startTime;
          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({
                latencyMs,
                model: modelUsed,
                chunkCount: contextChunks.length,
              })}\n\n`
            )
          );
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Stream error';
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: errMsg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Query Stream API Error]', error);
    const encoder = new TextEncoder();
    const errStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: 'Internal server error' })}\n\n`
          )
        );
        controller.close();
      },
    });
    return new Response(errStream, {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}
