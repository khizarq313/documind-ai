// ═══════════════════════════════════════════════════
// POST /api/documents/summarize
// Generates structured document summary via Groq
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { SummaryMode } from '@/types';

const MODEL = 'llama-3.1-8b-instant';
const MAX_TEXT_LENGTH = 8000;

// Mode-specific configurations
const MODE_CONFIGS: Record<SummaryMode, { insightCount: number; metricCount: number; style: string }> = {
  quick: { insightCount: 3, metricCount: 3, style: 'brief and concise' },
  normal: { insightCount: 4, metricCount: 4, style: 'balanced and informative' },
  standard: { insightCount: 4, metricCount: 4, style: 'balanced and informative' },
  deep: { insightCount: 6, metricCount: 6, style: 'detailed and thorough with in-depth analysis' },
  executive: { insightCount: 4, metricCount: 5, style: 'executive-level, focused on strategic implications and decisions' },
  student: { insightCount: 4, metricCount: 3, style: 'simple, clear language suitable for students, emphasize learning points' },
};

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  
  // Take from beginning, middle, and end for better coverage
  const partSize = Math.floor(maxLen / 3);
  const start = text.substring(0, partSize);
  const midStart = Math.floor(text.length / 2) - Math.floor(partSize / 2);
  const middle = text.substring(midStart, midStart + partSize);
  const end = text.substring(text.length - partSize);
  
  return `${start}\n\n[...middle section...]\n\n${middle}\n\n[...later section...]\n\n${end}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullText, mode, filename } = body as { fullText: string; mode: SummaryMode; filename: string };

    if (!fullText || typeof fullText !== 'string') {
      return NextResponse.json({ error: 'fullText is required' }, { status: 400 });
    }

    if (!mode || !MODE_CONFIGS[mode]) {
      return NextResponse.json({ error: 'Invalid summary mode' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });
    const config = MODE_CONFIGS[mode];
    const truncatedText = truncateText(fullText, MAX_TEXT_LENGTH);

    const prompt = `Analyze the following document and provide a structured summary.

Document filename: "${filename}"
Analysis style: ${config.style}

DOCUMENT TEXT:
${truncatedText}

Respond with ONLY valid JSON (no markdown fences, no extra text) in this exact format:
{
  "overview": "A ${config.style} overview paragraph of the document",
  "whyItMatters": "Why this document is important or relevant",
  "keyInsights": [
    {"title": "Insight title", "detail": "Detailed explanation", "icon": "lightbulb"}
  ],
  "metrics": [
    {"label": "Metric name", "value": "Metric value"}
  ],
  "finalTakeaway": "The most important conclusion or action item",
  "documentType": "One of: Resume, Research Paper, Legal Document, Financial Report, Technical Manual, General Document",
  "contactInfo": ["any emails, phones, URLs found in the document"],
  "confidence": 0.85
}

Requirements:
- Provide exactly ${config.insightCount} key insights
- Provide exactly ${config.metricCount} metrics (quantitative data from the document, or descriptive stats like page count, word count estimates)
- For icon field use one of: lightbulb, target, trending-up, shield, book, star, zap, users, clock, check-circle
- confidence should be between 0.0 and 1.0 based on how well you could analyze the text
- If the document appears to be a resume/CV, extract all contact information into contactInfo array
- Return ONLY the JSON object, nothing else`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a document analysis AI. You respond with ONLY valid JSON. Never use markdown fences or extra text.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    // Parse JSON — try to extract JSON from the response even if wrapped
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Try to extract JSON from markdown fences or surrounding text
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse AI response as JSON' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'AI response did not contain valid JSON' },
          { status: 500 }
        );
      }
    }

    // Validate and provide defaults
    const summary = {
      overview: parsed.overview ?? 'Summary not available',
      whyItMatters: parsed.whyItMatters ?? 'Analysis pending',
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
      finalTakeaway: parsed.finalTakeaway ?? '',
      documentType: parsed.documentType ?? 'General Document',
      contactInfo: Array.isArray(parsed.contactInfo) ? parsed.contactInfo : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error('[Summarize API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error during summarization' },
      { status: 500 }
    );
  }
}
