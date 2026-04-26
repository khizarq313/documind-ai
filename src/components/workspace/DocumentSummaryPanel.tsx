'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  X, RefreshCw, Loader2,
  Lightbulb, Target, TrendingUp, Shield, BookOpen, Star,
  Zap, Users, Clock, CheckCircle, FileText, Hash
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
  const isResume = summary?.documentType === 'Resume';

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

            {isResume && contacts.length > 0 && (
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
