'use client';

import React from 'react';
import { Mail, Phone, Globe, GitFork, Link } from 'lucide-react';

interface SmartTextProps {
  text: string;
}

interface LinkMatch {
  start: number;
  end: number;
  type: 'email' | 'phone' | 'github' | 'linkedin' | 'url';
  value: string;
  href: string;
}

const ICON_MAP = {
  email: Mail,
  phone: Phone,
  github: GitFork,
  linkedin: Link,
  url: Globe,
};

function findLinks(text: string): LinkMatch[] {
  const matches: LinkMatch[] = [];
  const patterns: { regex: RegExp; type: LinkMatch['type']; makeHref: (v: string) => string }[] = [
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'email', makeHref: (v) => `mailto:${v}` },
    { regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, type: 'phone', makeHref: (v) => `tel:${v.replace(/[^\d+]/g, '')}` },
    { regex: /https?:\/\/github\.com\/[^\s<>"{}|\\^`\[\])]+/g, type: 'github', makeHref: (v) => v },
    { regex: /https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s<>"{}|\\^`\[\])]+/g, type: 'linkedin', makeHref: (v) => v },
    { regex: /https?:\/\/[^\s<>"{}|\\^`\[\])]+/g, type: 'url', makeHref: (v) => v },
  ];

  for (const { regex, type, makeHref } of patterns) {
    let m;
    while ((m = regex.exec(text)) !== null) {
      // Check for overlap with existing matches
      const overlaps = matches.some((e) => m!.index < e.end && m!.index + m![0].length > e.start);
      if (!overlaps) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          type,
          value: m[0],
          href: makeHref(m[0]),
        });
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

export default function SmartText({ text }: SmartTextProps) {
  const links = findLinks(text);

  if (links.length === 0) return <span>{text}</span>;

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  links.forEach((link, i) => {
    if (link.start > lastEnd) {
      parts.push(<span key={`t-${i}`}>{text.slice(lastEnd, link.start)}</span>);
    }
    const Icon = ICON_MAP[link.type];
    parts.push(
      <a
        key={`l-${i}`}
        href={link.href}
        target={link.type === 'email' || link.type === 'phone' ? undefined : '_blank'}
        rel="noopener noreferrer"
        className="smart-link"
      >
        <Icon size={14} />
        {link.value}
      </a>
    );
    lastEnd = link.end;
  });

  if (lastEnd < text.length) {
    parts.push(<span key="t-end">{text.slice(lastEnd)}</span>);
  }

  return <span>{parts}</span>;
}
