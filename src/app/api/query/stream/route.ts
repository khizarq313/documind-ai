// ═══════════════════════════════════════════════════
// POST /api/query/stream
// Receives question + context chunks, streams Groq response as SSE
// ═══════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import type { DocumentProfile, SummaryMode } from '@/types';

const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';
const MAX_FULL_TEXT_PROMPT_LENGTH = 20000;
const MODE_MAX_TOKENS: Record<SummaryMode, number> = {
  quick: 700,
  normal: 1100,
  standard: 1400,
  deep: 2200,
  executive: 900,
  student: 1500,
};

const BASE_SYSTEM_PROMPT = `You are DocuMind AI, an expert document intelligence assistant. Your role is to help users understand, analyze, and extract insights from their documents.

RULES:
- Answer ONLY based on the provided document context. Never use outside knowledge.
- For SHORT factual questions (who, what, where, when, which, how many): give a brief direct answer — one sentence or a short paragraph. No headers.
- For SUMMARY or EXPLANATION requests: give a rich, well-structured response using Markdown headers and bullets.
- Use inline page references only when they genuinely help (e.g., "Page 3").
- If the document does not contain the answer, say so briefly and specifically.
- Do not include standalone Evidence or Sources sections.
- Do not copy raw source labels, bracketed source markers, or relevance scores into the answer.
- Never invent facts, authors, dates, or results that are not in the provided text.`;

const MODE_INSTRUCTIONS: Record<SummaryMode, string> = {
  quick: `For SUMMARY requests use:
## Summary
A focused 3-5 sentence overview of the document's core contribution or content.
## Key Points
- 3 high-value bullets.
For FACTUAL questions: skip headers; answer in 1-2 sentences.`,
  normal: `For SUMMARY requests use:
## Overview
A well-rounded explanation of what the document covers and why it matters.
## Key Points
- 4-6 bullets, each capturing a distinct, non-overlapping idea.
For FACTUAL questions: skip headers; give a clear, direct answer.`,
  standard: `For SUMMARY requests use:
## Overview
A polished, detailed explanation with meaningful synthesis.
## Key Points
- 5-7 bullets with supporting detail.
## Notable Details
- Additional facts, figures, or specifics worth highlighting.
For FACTUAL questions: give a thorough but focused answer without headers.`,
  deep: `For SUMMARY requests use:
## Overview
A thorough, analytical explanation.
## Core Concepts
- Key ideas, methods, or arguments with explanation.
## Findings & Results
- Concrete outcomes, measurements, or conclusions from the document.
## Limitations or Gaps
- What the document does not cover or explicitly acknowledges as future work.
For FACTUAL questions: give a comprehensive answer citing specific sections.`,
  executive: `For SUMMARY requests use:
## Executive Summary
3-5 high-signal sentences for a decision maker.
## Key Takeaways
- 4-5 decision-oriented bullets.
## Recommended Action
- Only if the document clearly supports one.
For FACTUAL questions: one sentence answer + brief context if needed.`,
  student: `For SUMMARY requests use:
## What This Document Is About
A plain-language explanation of the main idea.
## Key Concepts to Know
- 5-8 memorable bullets, each defined simply.
## Important Terms
- Term: plain-English definition (only from the document).
## Why It Matters
One short paragraph on the significance.
For FACTUAL questions: give a clear, example-driven answer.`,
};

type QuestionIntent = 'summary' | 'resume-summary' | 'targeted' | 'general';

function inferQuestionIntent(question: string, documentProfile?: DocumentProfile): QuestionIntent {
  const normalized = question.toLowerCase().trim();

  // Broad summary / exploration patterns (includes all quick-action suggestions)
  const summaryLike = /summari[sz]e|summary|overview|analy[sz]e|analysis|key (points|insights?|takeaways?|findings?)|important (points|parts|info|information|concepts?)|student notes|executive summary|explain (this )?(file|document|pdf|paper|text)|describe (this )?(resume|document|paper|file)|what (is|does|are) (this|the) (document|paper|file|pdf)|tell me (about|what)|main (idea|point|contribution|finding|concept)|give me (a |an )?(summary|overview|breakdown)|break (this|it) down|what('s| is) in (this|the)/i.test(normalized);

  if (documentProfile?.isResume && summaryLike) {
    return 'resume-summary';
  }

  if (summaryLike) {
    return 'summary';
  }

  // Short factual lookup patterns — expect brief, direct answers
  if (/^(what|who|when|where|which|how many|how much|does|did|is|are|was|were|list|find|show|extract|name|give me the)\b/i.test(normalized)) {
    return 'targeted';
  }

  return 'general';
}

function getIntentInstructions(intent: QuestionIntent, documentProfile?: DocumentProfile): string {
  if (intent === 'resume-summary') {
    return `QUESTION INTENT: The user wants a high-quality resume summary.
- Write a human, polished summary that reads like a recruiter or hiring manager wrote it.
- Use sections with distinct purposes and do not repeat the same fact across sections.
- For broad resume summaries, prefer this structure when the resume supports it:
  ## Candidate Snapshot
  A concise paragraph describing the candidate's profile, fit, and strongest differentiators.
  ## Experience
  - Start each bullet with the job role title in bold, then company and duration when available, followed by a short supporting sentence.
  ## Projects
  - Start each bullet with the project name in bold, then add a short line about what was built and the main technologies.
  ## Education
  - Start each bullet with the degree name in bold, then institution, stream, and year when available.
  ## Skills
  - Include only real skills from the resume, never links.
- Include the candidate's likely profile or target role if supported by the resume.
- Use bullet points for Experience, Projects, and Education.
- If the candidate appears to be a fresher or has limited formal experience, keep experience concise and expand the projects section.
- Omit any section that the resume does not support instead of inventing content.
- Mention strengths and notable gaps only if they add value and can be stated briefly and professionally.
- Do not add a standalone Evidence or Sources section; source chips are already rendered separately in the UI.
- Do not print raw contact details in the body; they are shown separately by the product UI.
- Keep every section grounded only in the provided resume context.`;
  }

  if (intent === 'summary') {
    const docType = documentProfile?.documentType ?? 'General Document';
    const docTypeHint = {
      'Research Paper': 'Focus on: what problem it solves, the proposed method, key results/metrics, and the main conclusion. Explain technical concepts in plain language.',
      'Legal Document': 'Focus on: parties involved, key obligations, rights, clauses, and implications.',
      'Financial Report': 'Focus on: financial highlights, revenue/profit trends, key metrics, risks, and outlook.',
      'Technical Manual': 'Focus on: what the system does, key components, how it works, and critical steps or requirements.',
      'Resume': 'Summarize the candidate profile, skills, experience, and education.',
    }[docType] ?? 'Cover the main subject, key arguments or findings, important details, and the overall significance.';

    return `QUESTION INTENT: The user wants a comprehensive document summary.
- Produce a genuine, descriptive analysis — not a shallow recap.
- Document type is: ${docType}. ${docTypeHint}
- Use clear Markdown sections. Do not repeat the same fact in multiple sections.
- Every bullet must carry unique information.`;
  }

  if (intent === 'targeted') {
    return `QUESTION INTENT: Narrow factual question.
- Give a SHORT, DIRECT answer — ideally 1-2 sentences.
- Do NOT use headers or long sections for simple factual answers.
- If the answer is a single word or phrase, just say it.
- Only expand if the document provides important context that changes the meaning.
- If the answer is not in the document, say: "This document doesn't mention [topic]."`;
  }

  return documentProfile?.isResume
    ? `QUESTION INTENT: General resume question.
- Stay grounded in the resume text.
- Prefer clear, professional language.`
    : `QUESTION INTENT: General document question.
- Answer helpfully and concisely based only on the provided text.
- If the question can be answered briefly, do so without adding headers.`;
}

function getSystemPrompt(mode: SummaryMode, intent: QuestionIntent, documentProfile?: DocumentProfile): string {
  const resumeInstructions = documentProfile?.isResume
    ? `\n\nRESUME-SPECIFIC INSTRUCTIONS:
- This document is a resume.
- Never print raw phone numbers, email addresses, or raw URLs inside the main answer body.
- Contact channels are rendered separately by the product UI.
- Keep resume feedback grounded only in the resume text.
- When evaluating quality, focus on clarity, measurable impact, structure, skills coverage, and ATS readability.
- Skills inferred from the resume should be treated as skills, not websites or contact channels.`
    : '';

  return `${BASE_SYSTEM_PROMPT}\n\nMODE-SPECIFIC INSTRUCTIONS:\n${MODE_INSTRUCTIONS[mode]}\n\n${getIntentInstructions(intent, documentProfile)}${resumeInstructions}`;
}

function isSmallTalkQuestion(question: string): boolean {
  return /^(hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)\b/i.test(question.trim());
}

function createSseTextResponse(message: string, model: string, chunkCount: number = 0): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token: message })}\n\n`));
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ latencyMs: 0, model, chunkCount })}\n\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function truncatePromptText(text: string, maxLen: number = MAX_FULL_TEXT_PROMPT_LENGTH): string {
  if (text.length <= maxLen) return text;

  // Weight the beginning heavily (50%) because intros/abstracts summarise the whole document.
  // Give 30% to the middle (methodology / body) and 20% to the end (conclusions / results).
  const startLen = Math.floor(maxLen * 0.50);
  const midLen   = Math.floor(maxLen * 0.30);
  const endLen   = maxLen - startLen - midLen;

  const start    = text.substring(0, startLen);
  const midStart = Math.floor(text.length / 2) - Math.floor(midLen / 2);
  const middle   = text.substring(midStart, midStart + midLen);
  const end      = text.substring(text.length - endLen);

  return `${start}\n\n[...document continues — middle section sampled below...]\n\n${middle}\n\n[...document continues — final section sampled below...]\n\n${end}`;
}

interface StreamSanitizerState {
  pending: string;
  skippingSection: boolean;
}

function isFilteredSectionHeading(line: string): boolean {
  return /^#{1,6}\s+(evidence|sources)\s*:?\s*$/i.test(line.trim());
}

function isMarkdownHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line.trim());
}

function isRawSourceMarkerLine(line: string): boolean {
  return /^(?:[-*]\s+)?\[Source:.*\]\s*$/i.test(line.trim());
}

function stripInlineSourceMarkers(line: string): string {
  return line
    .replace(/\s*\[Source:[^\]]+\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[ \t]+$/g, '');
}

function sanitizeAssistantLine(line: string, state: StreamSanitizerState): string | null {
  if (isFilteredSectionHeading(line)) {
    state.skippingSection = true;
    return null;
  }

  if (state.skippingSection) {
    if (!line.trim()) {
      return null;
    }

    if (isMarkdownHeading(line)) {
      state.skippingSection = false;
    } else {
      return null;
    }
  }

  if (isRawSourceMarkerLine(line)) {
    return null;
  }

  const withoutSourceMarkers = stripInlineSourceMarkers(line);
  if (!withoutSourceMarkers.trim()) {
    return null;
  }

  if (/^[-*]\s*$/.test(withoutSourceMarkers.trim())) {
    return null;
  }

  return withoutSourceMarkers;
}

function sanitizeAssistantDelta(delta: string, state: StreamSanitizerState, flush: boolean = false): string {
  const normalized = `${state.pending}${delta}`.replace(/\r\n/g, '\n');

  if (!normalized) {
    state.pending = '';
    return '';
  }

  const lines = normalized.split('\n');
  const completeLines = flush ? lines : lines.slice(0, -1);
  state.pending = flush ? '' : lines.at(-1) ?? '';

  if (completeLines.length === 0) {
    return '';
  }

  const result = completeLines
    .map((line) => sanitizeAssistantLine(line, state))
    .filter((line): line is string => line !== null)
    .join('\n');

  // Always append a trailing newline so the next token batch starts on a new line.
  // Without this, consecutive batches merge: "## Heading" + "paragraph" = "## Headingparagraph".
  return result ? result + '\n' : '';
}

interface QueryRequestBody {
  question: string;
  contextChunks: Array<{
    content: string;
    pageNumber: number;
    documentName: string;
    relevanceScore: number;
  }>;
  fullText?: string;
  documentName: string;
  mode?: SummaryMode;
  documentProfile?: DocumentProfile;
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequestBody = await request.json();
    const { question, contextChunks, fullText = '', documentName, mode = 'normal', documentProfile } = body;

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
    const intent = inferQuestionIntent(question, documentProfile);
    const hasFullText = typeof fullText === 'string' && fullText.trim().length > 100;
    const hasAnyContext = hasFullText || contextChunks.length > 0;

    // Use the full document for summary/exploration, or as fallback when BM25 returns nothing.
    const useFullDocumentContext = hasFullText && (
      intent === 'summary' ||
      intent === 'resume-summary' ||
      contextChunks.length === 0
    );

    // Only block with local-guard when there is truly NO document loaded at all.
    if (!hasAnyContext) {
      if (isSmallTalkQuestion(question)) {
        return createSseTextResponse(`Hi! Attach a PDF and ask me anything about it.`, 'local-guard');
      }
      return createSseTextResponse(
        `No document is loaded yet. Please upload a PDF first, then ask your question.`,
        'local-guard'
      );
    }

    // Build context from chunks
    const contextStr = contextChunks
      .map((c) => `Excerpt from ${c.documentName} (Page ${c.pageNumber})\n${c.content}`)
      .join('\n\n---\n\n');
    const fullDocumentContext = useFullDocumentContext ? truncatePromptText(fullText.trim()) : '';

    const profileContext = documentProfile
      ? `Detected document type: ${documentProfile.documentType}
Resume detected: ${documentProfile.isResume ? 'yes' : 'no'}
Precomputed ATS heuristic: ${documentProfile.atsScore ?? 'n/a'}
Detected profile title: ${documentProfile.profileTitle ?? 'not clearly stated'}
Detected skills: ${documentProfile.skills.join(', ') || 'none detected'}
Available contact channels: ${documentProfile.contactLinks.map((link) => link.label).join(', ') || 'none'}`
      : 'Detected document type: unknown';

    const promptContext = useFullDocumentContext
      ? `Full document text:\n${fullDocumentContext}`
      : contextStr
        ? `Context from document:\n${contextStr}`
        : '';

    const userMessage = promptContext
      ? `Document: "${documentName}"\n\nDocument profile:\n${profileContext}\n\nQuestion intent: ${intent}\n\n${promptContext}\n\nQuestion: ${question}`
      : `Question: ${question}`;

    const startTime = Date.now();
    let modelUsed = PRIMARY_MODEL;

    // Try primary model, fallback on error
    let stream;
    try {
      stream = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          { role: 'system', content: getSystemPrompt(mode, intent, documentProfile) },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        max_tokens: MODE_MAX_TOKENS[mode],
        temperature: 0.2,
      });
    } catch {
      modelUsed = FALLBACK_MODEL;
      stream = await groq.chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [
          { role: 'system', content: getSystemPrompt(mode, intent, documentProfile) },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        max_tokens: MODE_MAX_TOKENS[mode],
        temperature: 0.2,
      });
    }

    // Create SSE ReadableStream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const sanitizerState: StreamSanitizerState = { pending: '', skippingSection: false };

          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              const sanitizedDelta = sanitizeAssistantDelta(delta, sanitizerState);

              if (sanitizedDelta) {
                controller.enqueue(
                  encoder.encode(`event: token\ndata: ${JSON.stringify({ token: sanitizedDelta })}\n\n`)
                );
              }
            }
          }

          const finalDelta = sanitizeAssistantDelta('', sanitizerState, true);
          if (finalDelta) {
            controller.enqueue(
              encoder.encode(`event: token\ndata: ${JSON.stringify({ token: finalDelta })}\n\n`)
            );
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
