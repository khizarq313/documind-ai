// ═══════════════════════════════════════════════════
// DocuMind AI — General Utilities
// ═══════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';
import type { ContactLink, DocumentProfile } from '@/types';

const SKILL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'JavaScript', pattern: /\bjavascript\b/i },
  { label: 'TypeScript', pattern: /\btypescript\b/i },
  { label: 'React.js', pattern: /\breact(?:\.js)?\b/i },
  { label: 'Next.js', pattern: /\bnext(?:\.js)?\b/i },
  { label: 'Vue.js', pattern: /\bvue(?:\.js)?\b/i },
  { label: 'Angular', pattern: /\bangular\b/i },
  { label: 'Node.js', pattern: /\bnode(?:\.js)?\b/i },
  { label: 'Express.js', pattern: /\bexpress(?:\.js)?\b/i },
  { label: 'HTML', pattern: /\bhtml5?\b/i },
  { label: 'CSS', pattern: /\bcss3?\b/i },
  { label: 'Tailwind CSS', pattern: /\btailwind\b/i },
  { label: 'Bootstrap', pattern: /\bbootstrap\b/i },
  { label: 'Redux', pattern: /\bredux\b/i },
  { label: 'React Native', pattern: /\breact native\b/i },
  { label: 'Python', pattern: /\bpython\b/i },
  { label: 'Java', pattern: /\bjava\b/i },
  { label: 'C++', pattern: /c\+\+/i },
  { label: 'SQL', pattern: /\bsql\b/i },
  { label: 'PostgreSQL', pattern: /\bpostgres(?:ql)?\b/i },
  { label: 'MySQL', pattern: /\bmysql\b/i },
  { label: 'MongoDB', pattern: /\bmongodb\b/i },
  { label: 'Firebase', pattern: /\bfirebase\b/i },
  { label: 'AWS', pattern: /\baws\b|amazon web services/i },
  { label: 'Docker', pattern: /\bdocker\b/i },
  { label: 'Kubernetes', pattern: /\bkubernetes\b/i },
  { label: 'Git', pattern: /\bgit\b/i },
  { label: 'GitHub', pattern: /\bgithub\b/i },
  { label: 'REST APIs', pattern: /\brest(?:ful)? api/i },
  { label: 'GraphQL', pattern: /\bgraphql\b/i },
  { label: 'Figma', pattern: /\bfigma\b/i },
  { label: 'Machine Learning', pattern: /\bmachine learning\b/i },
  { label: 'Data Structures', pattern: /\bdata structures?\b/i },
  { label: 'Algorithms', pattern: /\balgorithms?\b/i },
];

const ROLE_LINE_PATTERN = /\b(?:developer|engineer|designer|architect|analyst|consultant|specialist|manager|intern|student|lead|frontend|front-end|backend|back-end|full stack|software|web)\b/i;
const SKILL_LIKE_TLDS = new Set(['js', 'ts', 'jsx', 'tsx', 'vue']);

/**
 * Generate a UUID v4 string.
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Format bytes into human-readable size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format a relative time string (e.g., "3 minutes ago").
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Get user initials from display name (e.g., "John Doe" → "JD").
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/**
 * Classify document type based on content analysis.
 */
export function classifyDocumentType(text: string): string {
  const lower = text.toLowerCase();

  // Research Paper
  if (
    lower.includes('abstract') &&
    (lower.includes('methodology') || lower.includes('conclusion') || lower.includes('references'))
  ) {
    return 'Research Paper';
  }

  // Legal Document
  if (
    lower.includes('hereby') ||
    lower.includes('whereas') ||
    lower.includes('jurisdiction') ||
    lower.includes('plaintiff') ||
    lower.includes('defendant')
  ) {
    return 'Legal Document';
  }

  // Financial Report
  if (
    lower.includes('revenue') &&
    (lower.includes('profit') || lower.includes('loss') || lower.includes('balance sheet'))
  ) {
    return 'Financial Report';
  }

  // Technical Manual
  if (
    lower.includes('installation') &&
    (lower.includes('configuration') || lower.includes('troubleshooting'))
  ) {
    return 'Technical Manual';
  }

  // Resume/CV
  if (getResumeSignalScore(text) >= 7) {
    return 'Resume';
  }

  return 'General Document';
}

/**
 * Get document type badge color class.
 */
export function getDocTypeBadgeColor(docType: string): string {
  const colors: Record<string, string> = {
    'Resume': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Research Paper': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Legal Document': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Financial Report': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Technical Manual': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'General Document': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  return colors[docType] ?? colors['General Document'];
}

/**
 * Extract contact information from text using regex patterns.
 */
export function extractContactInfo(text: string): {
  emails: string[];
  phones: string[];
  githubUrls: string[];
  linkedinUrls: string[];
  otherUrls: string[];
} {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const urlPatterns = [
    /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
    /(?:www\.)[^\s<>"{}|\\^`\[\]]+/g,
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?/gi,
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_.-]+/gi,
    /\b[a-zA-Z0-9-]+\.(?:dev|app|ai|io|com|org|net|co)(?:\/[a-zA-Z0-9_./-]+)?\b/gi,
  ];

  const emails = [...new Set(text.match(emailPattern) ?? [])];
  const phones = [...new Set(text.match(phonePattern) ?? [])].filter((value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 12) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    if (/^(?:0123456789|1234567890|9876543210|12345678901|123456789012)$/.test(digits)) return false;
    return true;
  });
  const rawUrls = urlPatterns.flatMap((pattern) => text.match(pattern) ?? []);
  const allUrls = [...new Set(
    rawUrls.filter((value) => {
      if (!/\./.test(value)) return false;
      if (emails.some((email) => email.toLowerCase().includes(value.toLowerCase()))) return false;
      const tld = value.split('?')[0].split('/')[0].split('.').pop()?.toLowerCase() ?? '';
      return !SKILL_LIKE_TLDS.has(tld);
    })
  )];

  const githubUrls = allUrls.filter((u) => u.toLowerCase().includes('github.com'));
  const linkedinUrls = allUrls.filter((u) => u.toLowerCase().includes('linkedin.com'));
  const otherUrls = allUrls.filter((u) => !u.toLowerCase().includes('github.com') && !u.toLowerCase().includes('linkedin.com'));

  return { emails, phones, githubUrls, linkedinUrls, otherUrls };
}

function getResumeSignalScore(text: string): number {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const topLines = lines.slice(0, 40);
  const topRegion = topLines.join('\n');
  const lowerTopRegion = topRegion.toLowerCase();
  const contactInfo = extractContactInfo(topRegion);

  let score = 0;

  if (/\b(resume|curriculum vitae|cv)\b/i.test(lowerTopRegion)) score += 5;
  if (contactInfo.emails.length > 0) score += 2;
  if (contactInfo.phones.length > 0) score += 2;
  if (contactInfo.linkedinUrls.length > 0 || contactInfo.githubUrls.length > 0) score += 1;
  if (extractProfileTitle(topRegion)) score += 2;

  const headingPatterns = [
    /^(professional\s+)?summary\b/i,
    /^objective\b/i,
    /^skills?\b/i,
    /^(work\s+)?experience\b/i,
    /^education\b/i,
    /^projects?\b/i,
    /^certifications?\b/i,
    /^contact\b/i,
  ];

  const headingHits = headingPatterns.reduce((count, pattern) => (
    topLines.some((line) => pattern.test(line)) ? count + 1 : count
  ), 0);

  score += headingHits * 2;

  if (headingHits >= 3 && (contactInfo.emails.length > 0 || contactInfo.phones.length > 0)) {
    score += 2;
  }

  return score;
}

function ensureUrlProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function extractSkills(text: string): string[] {
  const matches = SKILL_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

  return [...new Set(matches)].slice(0, 18);
}

export function extractProfileTitle(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 14);

  return lines.find((line) => (
    line.length <= 80 &&
    ROLE_LINE_PATTERN.test(line) &&
    !/@|https?:\/\/|linkedin\.com|github\.com|^\+?\d/.test(line)
  ));
}

function normalizePhoneForHref(value: string): string {
  const normalized = value.replace(/[^\d+]/g, '');
  return normalized.startsWith('+') ? normalized : normalized.replace(/^00/, '+');
}

function createContactLinks(text: string): ContactLink[] {
  const contactInfo = extractContactInfo(text);
  const links: ContactLink[] = [];

  for (const email of contactInfo.emails) {
    links.push({ type: 'email', label: 'Email', value: email, href: `mailto:${email}` });
  }

  for (const phone of contactInfo.phones) {
    links.push({ type: 'phone', label: 'Call', value: phone, href: `tel:${normalizePhoneForHref(phone)}` });
  }

  for (const linkedin of contactInfo.linkedinUrls) {
    links.push({ type: 'linkedin', label: 'LinkedIn', value: linkedin, href: ensureUrlProtocol(linkedin) });
  }

  for (const github of contactInfo.githubUrls) {
    links.push({ type: 'github', label: 'GitHub', value: github, href: ensureUrlProtocol(github) });
  }

  for (const website of contactInfo.otherUrls) {
    links.push({ type: 'website', label: 'Website', value: website, href: ensureUrlProtocol(website) });
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.type}:${link.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateResumeAtsScore(text: string, contactLinks: ContactLink[]): number {
  const lower = text.toLowerCase();
  let score = 32;

  const sectionChecks = [
    ['experience', 12],
    ['education', 10],
    ['skills', 10],
    ['projects', 8],
    ['summary', 6],
    ['certification', 4],
  ] as const;

  for (const [term, points] of sectionChecks) {
    if (lower.includes(term)) score += points;
  }

  if (/\b\d+%\b/.test(text) || /\b\d+\+\b/.test(text)) score += 8;
  if (/managed|built|developed|designed|led|optimized|implemented|launched/i.test(text)) score += 8;
  if (contactLinks.some((link) => link.type === 'email')) score += 5;
  if (contactLinks.some((link) => link.type === 'phone')) score += 5;
  if (contactLinks.some((link) => link.type === 'linkedin' || link.type === 'github')) score += 4;
  if (text.length < 1200) score -= 10;
  if (!/\bskills\b/i.test(text)) score -= 8;

  return Math.max(38, Math.min(96, score));
}

export function buildDocumentProfile(text: string): DocumentProfile {
  const documentType = classifyDocumentType(text);
  const isResume = documentType === 'Resume';
  const contactLinks = createContactLinks(text);
  const skills = extractSkills(text);
  const profileTitle = isResume ? extractProfileTitle(text) : undefined;

  return {
    documentType,
    isResume,
    contactLinks,
    skills,
    profileTitle,
    atsScore: isResume ? calculateResumeAtsScore(text, contactLinks) : undefined,
  };
}

export function stripResumeContactsFromText(text: string, contactLinks: ContactLink[]): string {
  if (contactLinks.length === 0) return text;

  const lines = text.split(/\r?\n/);
  const contactValues = contactLinks.map((link) => link.value.toLowerCase());

  const filtered = lines.filter((line) => {
    const normalized = line.toLowerCase();
    const matchesKnownContact = contactValues.some((value) => normalized.includes(value));
    const matchesGenericContact = /mailto:|https?:\/\/|linkedin\.com|github\.com|@[a-z0-9.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,}\d/i.test(line);
    return !(matchesKnownContact || matchesGenericContact);
  });

  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Check if a question is asking for ATS score, contact links, or skills.
 */
export function isAskingForResumeMetadata(question: string): boolean {
  const normalized = question.toLowerCase().trim();
  return /\b(ats|score|contact|phone|email|linkedin|github|skills?|website|link)\b/i.test(normalized);
}

/**
 * Remove empty sections (heading followed by nothing or just whitespace/bullets).
 */
export function removeEmptySections(text: string): string {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const isHeading = /^#{1,6}\s+/.test(line.trim());

    if (isHeading) {
      // Look ahead to check if section has content
      let j = i + 1;
      let hasContent = false;

      while (j < lines.length && !/^#{1,6}\s+/.test(lines[j].trim())) {
        const nextLine = lines[j].trim();
        // Skip empty lines and bullet points with no text
        if (nextLine && !/^[-*]\s*$/.test(nextLine)) {
          hasContent = true;
          break;
        }
        j++;
      }

      if (hasContent) {
        result.push(line);
      }
      i++;
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
