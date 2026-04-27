// ═══════════════════════════════════════════════════
// POST /api/documents/summarize
// Generates structured document summary via Groq
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { buildDocumentProfile } from '@/lib/utils';
import type {
  AnalysisSection,
  ContactLink,
  DocumentSummaryResponse,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem,
  ResumeSummaryDetails,
  SummaryMode,
} from '@/types';

const MODEL = 'llama-3.1-8b-instant';
const MAX_TEXT_LENGTH = 12000;

const MODE_CONFIGS: Record<SummaryMode, {
  insightCount: number;
  metricCount: number;
  sectionCount: number;
  style: string;
  emphasis: string;
  maxTokens: number;
}> = {
  quick: {
    insightCount: 3,
    metricCount: 2,
    sectionCount: 2,
    style: 'brief, high-signal, and fast to scan',
    emphasis: 'speed and clarity',
    maxTokens: 1400,
  },
  normal: {
    insightCount: 4,
    metricCount: 3,
    sectionCount: 3,
    style: 'balanced, human, and informative',
    emphasis: 'clarity with practical detail',
    maxTokens: 1800,
  },
  standard: {
    insightCount: 5,
    metricCount: 4,
    sectionCount: 4,
    style: 'polished, descriptive, and well-synthesized',
    emphasis: 'strong narrative quality and useful detail',
    maxTokens: 2200,
  },
  deep: {
    insightCount: 6,
    metricCount: 5,
    sectionCount: 5,
    style: 'deep, analytical, and comprehensive',
    emphasis: 'thoroughness and nuanced analysis',
    maxTokens: 2800,
  },
  executive: {
    insightCount: 4,
    metricCount: 4,
    sectionCount: 3,
    style: 'executive-ready, concise, and decision-oriented',
    emphasis: 'strategic implications and quick comprehension',
    maxTokens: 1700,
  },
  student: {
    insightCount: 5,
    metricCount: 3,
    sectionCount: 4,
    style: 'student-friendly, memorable, and easy to revise',
    emphasis: 'learning value and retention',
    maxTokens: 2200,
  },
};

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;

  const partSize = Math.floor(maxLen / 3);
  const start = text.substring(0, partSize);
  const midStart = Math.floor(text.length / 2) - Math.floor(partSize / 2);
  const middle = text.substring(midStart, midStart + partSize);
  const end = text.substring(text.length - partSize);

  return `${start}\n\n[...middle section...]\n\n${middle}\n\n[...later section...]\n\n${end}`;
}

function normalizeStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean)
  )].slice(0, maxItems);
}

function normalizeContactLinks(value: unknown, fallback: ContactLink[]): ContactLink[] {
  if (!Array.isArray(value)) return fallback;

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<ContactLink>;
      if (!candidate.type || !candidate.label || !candidate.value || !candidate.href) return null;
      return {
        type: candidate.type,
        label: candidate.label,
        value: candidate.value,
        href: candidate.href,
      } as ContactLink;
    })
    .filter((item): item is ContactLink => Boolean(item));

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeSections(value: unknown, fallbackTitle: string, maxSections: number): AnalysisSection[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<AnalysisSection>;
      const bullets = normalizeStringArray(candidate.bullets, 6);
      const title = typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim()
        : `${fallbackTitle} ${index + 1}`;
      const summary = typeof candidate.summary === 'string' ? candidate.summary.trim() : '';
      if (!summary && bullets.length === 0) return null;
      return { title, summary, bullets };
    })
    .filter((item): item is AnalysisSection => Boolean(item))
    .slice(0, maxSections);
}

function normalizeExperience(value: unknown): ResumeExperienceItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<ResumeExperienceItem>;
      const role = typeof candidate.role === 'string' ? candidate.role.trim() : '';
      const company = typeof candidate.company === 'string' ? candidate.company.trim() : '';
      const duration = typeof candidate.duration === 'string' ? candidate.duration.trim() : '';
      const highlights = normalizeStringArray(candidate.highlights, 4);
      if (!role && !company && highlights.length === 0) return null;
      return { role, company, duration, highlights };
    })
    .filter((item): item is ResumeExperienceItem => Boolean(item))
    .slice(0, 6);
}

function normalizeProjects(value: unknown): ResumeProjectItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<ResumeProjectItem>;
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      const detail = typeof candidate.detail === 'string' ? candidate.detail.trim() : '';
      const technologies = normalizeStringArray(candidate.technologies, 8);
      if (!name && !detail) return null;
      return { name, detail, technologies };
    })
    .filter((item): item is ResumeProjectItem => Boolean(item))
    .slice(0, 6);
}

function normalizeEducation(value: unknown): ResumeEducationItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<ResumeEducationItem>;
      const institution = typeof candidate.institution === 'string' ? candidate.institution.trim() : '';
      const degree = typeof candidate.degree === 'string' ? candidate.degree.trim() : '';
      const stream = typeof candidate.stream === 'string' ? candidate.stream.trim() : '';
      const year = typeof candidate.year === 'string' ? candidate.year.trim() : undefined;
      if (!institution && !degree && !stream) return null;
      return year ? { institution, degree, stream, year } : { institution, degree, stream };
    })
    .filter((item): item is ResumeEducationItem => Boolean(item))
    .slice(0, 4);
}

function buildPrompt(fullText: string, filename: string, mode: SummaryMode): string {
  const config = MODE_CONFIGS[mode];
  const profile = buildDocumentProfile(fullText);
  const truncatedText = truncateText(fullText, MAX_TEXT_LENGTH);

  return `Analyze the following document and produce the best possible human summary.

Document filename: "${filename}"
Mode: ${mode}
Requested style: ${config.style}
Mode emphasis: ${config.emphasis}

PRECOMPUTED DOCUMENT PROFILE:
${JSON.stringify(profile, null, 2)}

DOCUMENT TEXT:
${truncatedText}

Return ONLY valid JSON in this exact shape:
{
  "overview": "...",
  "whyItMatters": "...",
  "keyInsights": [{"title": "...", "detail": "...", "icon": "lightbulb"}],
  "metrics": [{"label": "...", "value": "..."}],
  "finalTakeaway": "...",
  "documentType": "Resume | Research Paper | Legal Document | Financial Report | Technical Manual | General Document",
  "contactInfo": ["..."],
  "contactLinks": [{"type": "email", "label": "Email", "value": "user@example.com", "href": "mailto:user@example.com"}],
  "sections": [{"title": "...", "summary": "...", "bullets": ["...", "..."]}],
  "resumeSummary": null,
  "confidence": 0.88
}

If the document is a resume, set "resumeSummary" to:
{
  "headline": "Candidate headline or profile title",
  "targetRole": "Likely role or role being pursued",
  "seniority": "Fresher | Early-career | Mid-level | Senior | Unknown",
  "profileSummary": "A polished human summary of the candidate",
  "skills": ["React.js", "TypeScript"],
  "experience": [{"role": "...", "company": "...", "duration": "...", "highlights": ["...", "..."]}],
  "projects": [{"name": "...", "detail": "...", "technologies": ["...", "..."]}],
  "education": [{"institution": "...", "degree": "...", "stream": "...", "year": "..."}],
  "strengths": ["..."],
  "gaps": ["..."],
  "atsScore": 76
}

Requirements:
- Make the writing feel human, polished, and genuinely descriptive.
- Do not repeat the same fact across overview, keyInsights, sections, and finalTakeaway.
- Provide exactly ${config.insightCount} key insights.
- Provide exactly ${config.metricCount} metrics.
- Provide exactly ${config.sectionCount} sections for non-resume documents. For resumes, sections may be 0 because resumeSummary carries the primary structure.
- For icon use one of: lightbulb, target, trending-up, shield, book, star, zap, users, clock, check-circle.
- confidence must be between 0.0 and 1.0.
- If the document is a resume:
  - Use the precomputed contactLinks when available. Do not invent new contact links.
  - skills must contain skills only, never links, emails, or phone numbers.
  - Include company and duration in experience whenever the resume supports them.
  - If the candidate seems fresher or has limited formal experience, keep experience short and expand the projects section.
  - Include education institution, degree, and stream when available.
  - atsScore should reflect resume quality and ATS readiness.
- If the document is not a resume:
  - resumeSummary must be null.
  - sections should provide a detailed but non-repetitive analysis of the document.
- Keep all claims grounded in the document text.
- Return JSON only. No markdown fences, no prose outside JSON.`;
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
    const profile = buildDocumentProfile(fullText);
    const prompt = buildPrompt(fullText, filename, mode);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a world-class document summarization AI. You respond with ONLY valid JSON and you avoid repetitive writing.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: config.maxTokens,
      temperature: 0.15,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: 'AI response did not contain valid JSON' }, { status: 500 });
      }

      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response as JSON' }, { status: 500 });
      }
    }

    const contactLinks = normalizeContactLinks(parsed.contactLinks, profile.contactLinks);
    const resumeSummary = profile.isResume
      ? (() => {
          const candidate = (parsed.resumeSummary && typeof parsed.resumeSummary === 'object')
            ? parsed.resumeSummary as Record<string, unknown>
            : {};

          const normalized: ResumeSummaryDetails = {
            headline: typeof candidate.headline === 'string' && candidate.headline.trim()
              ? candidate.headline.trim()
              : profile.profileTitle ?? 'Candidate profile',
            targetRole: typeof candidate.targetRole === 'string' && candidate.targetRole.trim()
              ? candidate.targetRole.trim()
              : profile.profileTitle ?? 'Not clearly specified',
            seniority: typeof candidate.seniority === 'string' && candidate.seniority.trim()
              ? candidate.seniority.trim()
              : 'Unknown',
            profileSummary: typeof candidate.profileSummary === 'string' && candidate.profileSummary.trim()
              ? candidate.profileSummary.trim()
              : (typeof parsed.overview === 'string' ? parsed.overview : 'Resume summary not available.'),
            skills: normalizeStringArray(candidate.skills, 18).length > 0
              ? normalizeStringArray(candidate.skills, 18)
              : profile.skills,
            experience: normalizeExperience(candidate.experience),
            projects: normalizeProjects(candidate.projects),
            education: normalizeEducation(candidate.education),
            strengths: normalizeStringArray(candidate.strengths, 6),
            gaps: normalizeStringArray(candidate.gaps, 6),
            atsScore: typeof candidate.atsScore === 'number'
              ? Math.max(0, Math.min(100, Math.round(candidate.atsScore)))
              : (profile.atsScore ?? 70),
          };

          return normalized;
        })()
      : null;

    const summary: DocumentSummaryResponse = {
      overview: typeof parsed.overview === 'string' ? parsed.overview : 'Summary not available',
      whyItMatters: typeof parsed.whyItMatters === 'string' ? parsed.whyItMatters : 'Analysis pending',
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights as DocumentSummaryResponse['keyInsights'] : [],
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics as DocumentSummaryResponse['metrics'] : [],
      finalTakeaway: typeof parsed.finalTakeaway === 'string' ? parsed.finalTakeaway : '',
      documentType: typeof parsed.documentType === 'string' ? parsed.documentType : profile.documentType,
      contactInfo: normalizeStringArray(parsed.contactInfo, 12).length > 0
        ? normalizeStringArray(parsed.contactInfo, 12)
        : contactLinks.map((link) => link.value),
      contactLinks,
      sections: normalizeSections(parsed.sections, 'Analysis Section', config.sectionCount),
      resumeSummary,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.78,
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