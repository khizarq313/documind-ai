// ═══════════════════════════════════════════════════
// DocuMind AI — General Utilities
// ═══════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';

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
  
  // Resume/CV
  if (
    (lower.includes('experience') && lower.includes('education')) ||
    lower.includes('curriculum vitae') ||
    lower.includes('resume') ||
    (lower.includes('skills') && lower.includes('contact'))
  ) {
    return 'Resume';
  }

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
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

  const emails = [...new Set(text.match(emailPattern) ?? [])];
  const phones = [...new Set(text.match(phonePattern) ?? [])];
  const allUrls = [...new Set(text.match(urlPattern) ?? [])];

  const githubUrls = allUrls.filter((u) => u.includes('github.com'));
  const linkedinUrls = allUrls.filter((u) => u.includes('linkedin.com'));
  const otherUrls = allUrls.filter((u) => !u.includes('github.com') && !u.includes('linkedin.com'));

  return { emails, phones, githubUrls, linkedinUrls, otherUrls };
}
