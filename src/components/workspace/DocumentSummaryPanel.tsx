'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  X, RefreshCw, Loader2,
  Lightbulb, Target, TrendingUp, Shield, BookOpen, Star,
  Zap, Users, Clock, CheckCircle, FileText, Hash,
  Mail, Phone, Globe, Briefcase, GraduationCap, FolderOpen, BadgeCheck
} from 'lucide-react';
import type { DocumentRecord, DocumentSummaryResponse, SummaryMode } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as storage from '@/lib/storage';
import { reconstructText } from '@/lib/chunking';
import SmartText from '@/components/SmartText';
import { SummaryPanelSkeleton } from '@/components/Skeletons';

interface DocumentSummaryPanelProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

const MODES: { value: SummaryMode; label: string }[] = [
  { value: 'quick',     label: '⚡ Quick' },
  { value: 'normal',    label: 'Normal' },
  { value: 'standard',  label: 'Standard' },
  { value: 'deep',      label: '🔬 Deep' },
  { value: 'executive', label: '💼 Executive' },
  { value: 'student',   label: '📚 Student' },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  lightbulb: <Lightbulb size={16} />,
  target: <Target size={16} />,
  'trending-up': <TrendingUp size={16} />,
  shield: <Shield size={16} />,
  book: <BookOpen size={16} />,
  star: <Star size={16} />,
  zap: <Zap size={16} />,
  users: <Users size={16} />,
  clock: <Clock size={16} />,
  'check-circle': <CheckCircle size={16} />,
};

function getContactIcon(type: string) {
  switch (type) {
    case 'email':
      return <Mail size={14} />;
    case 'phone':
      return <Phone size={14} />;
    default:
      return <Globe size={14} />;
  }
}

export default function DocumentSummaryPanel({ document, isOpen, onClose }: DocumentSummaryPanelProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState<SummaryMode>('normal');
  const [summaryState, setSummaryState] = useState<{
    documentId: string;
    mode: SummaryMode;
    data: DocumentSummaryResponse | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    if (!document) return null;
    if (summaryState && summaryState.documentId === document.id && summaryState.mode === mode) {
      return summaryState.data;
    }
    return storage.getSummary(document.id, mode);
  }, [document, mode, summaryState]);

  const generateSummary = useCallback(async (force = false) => {
    if (!document || !user) return;
    if (!force) {
      const cached = storage.getSummary(document.id, mode);
      if (cached) {
        setSummaryState({ documentId: document.id, mode, data: cached });
        return;
      }
    }
    setLoading(true);
    try {
      const fullText = reconstructText(document.chunks);
      const res = await fetch('/api/documents/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullText, mode, filename: document.filename }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Summary generation failed');
      }
      const data: DocumentSummaryResponse = await res.json();
      setSummaryState({ documentId: document.id, mode, data });
      storage.setSummary(document.id, mode, data);
      addToast('success', 'Summary generated successfully');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [document, mode, user, addToast]);

  if (!isOpen || !document) return null;

  const contacts = summary?.contactInfo?.filter(Boolean) ?? [];
  const contactLinks = summary?.contactLinks ?? [];
  const isResume = summary?.documentType === 'Resume';
  const resumeSummary = summary?.resumeSummary;

  return (
    <div className="summary-panel animate-fade-in" id="summary-panel">
      {/* Header */}
      <div className="summary-panel-header">
        <div>
          <p className="summary-kicker" style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Document Intelligence</p>
          <h2 className="summary-title" style={{ fontSize: '1.1rem', marginTop: 4 }}>{document.filename}</h2>
          <div className="summary-meta-row" style={{ marginTop: 8 }}>
            <span className="chip chip-muted" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FileText size={10} /> {document.pageCount} pages
            </span>
            <span className="chip chip-cyan" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Hash size={10} /> {document.chunkCount} chunks
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="summary-refresh-btn"
            onClick={() => generateSummary(true)}
            disabled={loading}
            id="generate-summary-btn"
          >
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            {loading ? 'Generating...' : 'Regenerate'}
          </button>
          <button className="btn-icon" onClick={onClose} aria-label="Close summary panel" style={{ width: 36, height: 36 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="summary-mode-row">
        {MODES.map((m) => (
          <button
            key={m.value}
            className={`summary-mode-pill${mode === m.value ? ' active' : ''}`}
            onClick={() => setMode(m.value)}
            disabled={loading}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="summary-body">
        {!summary && !loading && (
          <div style={{ paddingTop: 16 }}>
            <button className="btn-primary" style={{ width: '100%', height: 48 }} onClick={() => generateSummary()}>
              <Zap size={16} /> Generate Summary
            </button>
          </div>
        )}

        {loading && <SummaryPanelSkeleton />}

        {summary && !loading && (
          <div className="animate-fade-in">
            {isResume && resumeSummary && (
              <>
                <div className="summary-section-card overview">
                  <div className="summary-section-heading">
                    <BadgeCheck size={16} style={{ color: 'var(--primary)' }} />
                    <h3>Candidate Snapshot</h3>
                  </div>
                  <div className="resume-summary-hero">
                    <div className="resume-summary-copy">
                      <p className="resume-summary-headline">{resumeSummary.headline || resumeSummary.targetRole}</p>
                      <p className="resume-summary-subtitle">{resumeSummary.profileSummary}</p>
                    </div>
                    <div className="resume-summary-meta">
                      <span className="chip chip-primary">Target Role: {resumeSummary.targetRole || 'Not clearly stated'}</span>
                      <span className="chip chip-secondary">Seniority: {resumeSummary.seniority || 'Unknown'}</span>
                      <span className="chip chip-cyan">ATS: {resumeSummary.atsScore}/100</span>
                    </div>
                  </div>
                </div>

                {contactLinks.length > 0 && (
                  <div className="summary-section-card">
                    <div className="summary-section-heading">
                      <Users size={16} style={{ color: 'var(--primary)' }} />
                      <h3>Contact Channels</h3>
                    </div>
                    <div className="summary-contact-grid">
                      {contactLinks.map((link) => {
                        const opensNewTab = /^https?:\/\//i.test(link.href);
                        return (
                          <a
                            key={`${link.type}-${link.value}`}
                            className="summary-contact-link"
                            href={link.href}
                            target={opensNewTab ? '_blank' : undefined}
                            rel={opensNewTab ? 'noreferrer noopener' : undefined}
                          >
                            <span className="summary-contact-link-icon">{getContactIcon(link.type)}</span>
                            <span className="summary-contact-link-copy">
                              <span className="summary-contact-link-label">{link.label}</span>
                              <span className="summary-contact-link-value">{link.value}</span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {resumeSummary.skills.length > 0 && (
                  <div className="summary-section-card">
                    <div className="summary-section-heading">
                      <Zap size={16} style={{ color: 'var(--primary)' }} />
                      <h3>Skills</h3>
                    </div>
                    <div className="resume-skill-list">
                      {resumeSummary.skills.map((skill) => (
                        <span key={skill} className="resume-skill-chip">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {resumeSummary.experience.length > 0 && (
                  <div className="summary-section-card">
                    <div className="summary-section-heading">
                      <Briefcase size={16} style={{ color: 'var(--primary)' }} />
                      <h3>Experience</h3>
                    </div>
                    <div className="resume-timeline-grid">
                      {resumeSummary.experience.map((item, index) => (
                        <div key={`${item.company}-${index}`} className="resume-timeline-card">
                          <h4>{item.role || 'Role not specified'}</h4>
                          <p className="resume-timeline-meta">{item.company || 'Company not specified'}{item.duration ? ` · ${item.duration}` : ''}</p>
                          <ul className="resume-list">
                            {item.highlights.map((highlight) => (
                              <li key={highlight}>{highlight}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resumeSummary.projects.length > 0 && (
                  <div className="summary-section-card">
                    <div className="summary-section-heading">
                      <FolderOpen size={16} style={{ color: 'var(--primary)' }} />
                      <h3>Projects</h3>
                    </div>
                    <div className="resume-project-grid">
                      {resumeSummary.projects.map((project, index) => (
                        <div key={`${project.name}-${index}`} className="resume-project-card">
                          <h4>{project.name}</h4>
                          <p>{project.detail}</p>
                          {project.technologies.length > 0 && (
                            <div className="resume-skill-list compact">
                              {project.technologies.map((technology) => (
                                <span key={technology} className="resume-skill-chip">{technology}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resumeSummary.education.length > 0 && (
                  <div className="summary-section-card">
                    <div className="summary-section-heading">
                      <GraduationCap size={16} style={{ color: 'var(--primary)' }} />
                      <h3>Education</h3>
                    </div>
                    <div className="resume-education-grid">
                      {resumeSummary.education.map((education, index) => (
                        <div key={`${education.institution}-${index}`} className="resume-education-card">
                          <h4>{education.degree || 'Degree not specified'}</h4>
                          <p className="resume-timeline-meta">{education.institution || 'Institution not specified'}</p>
                          <p>{education.stream || 'Stream not specified'}{education.year ? ` · ${education.year}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(resumeSummary.strengths.length > 0 || resumeSummary.gaps.length > 0) && (
                  <div className="resume-double-grid">
                    {resumeSummary.strengths.length > 0 && (
                      <div className="summary-section-card">
                        <div className="summary-section-heading">
                          <Star size={16} style={{ color: 'var(--primary)' }} />
                          <h3>Strengths</h3>
                        </div>
                        <ul className="resume-list">
                          {resumeSummary.strengths.map((strength) => (
                            <li key={strength}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {resumeSummary.gaps.length > 0 && (
                      <div className="summary-section-card">
                        <div className="summary-section-heading">
                          <Shield size={16} style={{ color: 'var(--secondary)' }} />
                          <h3>Attention Areas</h3>
                        </div>
                        <ul className="resume-list">
                          {resumeSummary.gaps.map((gap) => (
                            <li key={gap}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="summary-section-card overview">
              <div className="summary-section-heading">
                <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                <h3>Overview</h3>
              </div>
              <p>{summary.overview}</p>
            </div>

            {summary.whyItMatters && (
              <div className="summary-section-card">
                <div className="summary-section-heading">
                  <Target size={16} style={{ color: 'var(--secondary)' }} />
                  <h3>Why It Matters</h3>
                </div>
                <p>{summary.whyItMatters}</p>
              </div>
            )}

            {summary.keyInsights?.length > 0 && (
              <div className="summary-section-card">
                <div className="summary-section-heading">
                  <Lightbulb size={16} style={{ color: 'var(--primary)' }} />
                  <h3>Key Insights</h3>
                </div>
                <div className="summary-insights-grid">
                  {summary.keyInsights.map((insight, i) => (
                    <div key={i} className="summary-insight-card">
                      <div style={{ marginBottom: 6, color: 'var(--primary)' }}>{ICON_MAP[insight.icon] ?? <Lightbulb size={16} />}</div>
                      <h4>{insight.title}</h4>
                      <p>{insight.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isResume && summary.sections && summary.sections.length > 0 && (
              <div className="summary-analysis-stack">
                {summary.sections.map((section) => (
                  <div key={section.title} className="summary-section-card">
                    <div className="summary-section-heading">
                      <Target size={16} style={{ color: 'var(--primary)' }} />
                      <h3>{section.title}</h3>
                    </div>
                    {section.summary ? <p>{section.summary}</p> : null}
                    {section.bullets.length > 0 && (
                      <ul className="resume-list">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {summary.metrics?.length > 0 && (
              <div className="summary-section-card">
                <div className="summary-section-heading">
                  <TrendingUp size={16} style={{ color: 'var(--secondary)' }} />
                  <h3>Metrics &amp; Numbers</h3>
                </div>
                <div className="summary-metric-grid">
                  {summary.metrics.map((m, i) => (
                    <div key={i} className="summary-metric-card">
                      <div className="summary-metric-label">{m.label}</div>
                      <div className="summary-metric-value">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.finalTakeaway && (
              <div className="summary-section-card takeaway">
                <div className="summary-section-heading">
                  <Star size={16} style={{ color: 'var(--secondary)' }} />
                  <h3>Final Takeaway</h3>
                </div>
                <p>{summary.finalTakeaway}</p>
              </div>
            )}

            {isResume && contactLinks.length === 0 && contacts.length > 0 && (
              <div className="summary-section-card">
                <div className="summary-section-heading">
                  <Users size={16} style={{ color: 'var(--primary)' }} />
                  <h3>Contact Information</h3>
                </div>
                <div className="summary-contact-bar">
                  {contacts.map((c, i) => (
                    <div key={i} className="contact-chip">
                      <SmartText text={c} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
