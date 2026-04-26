'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as storage from '@/lib/storage';
import { formatRelativeTime, truncate } from '@/lib/utils';
import type { QueryLogEntry, DocumentRecord, AnalyticsStats, DailyQueryCount } from '@/types';
import Navbar from '@/components/Navbar';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  FileText, MessageSquare, Clock, Hash, BarChart3, Loader2, TrendingUp, Database
} from 'lucide-react';

type TabKey = 'overview' | 'documents' | 'history' | 'models';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'documents', label: 'Documents' },
  { key: 'history', label: 'History' },
  { key: 'models', label: 'Models' },
];

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const queryLog: QueryLogEntry[] = useMemo(() => (
    user ? storage.getQueryLog(user.id) : []
  ), [user]);
  const documents: DocumentRecord[] = useMemo(() => (
    user ? storage.getDocuments(user.id) : []
  ), [user]);

  const stats: AnalyticsStats = useMemo(() => {
    const totalQueries = queryLog.length;
    const avgLatency = totalQueries > 0
      ? Math.round(queryLog.reduce((s, q) => s + q.latencyMs, 0) / totalQueries)
      : 0;
    const totalChunks = documents.reduce((s, d) => s + d.chunkCount, 0);
    return { totalDocuments: documents.length, totalQueries, avgLatencyMs: avgLatency, totalChunks };
  }, [queryLog, documents]);

  const dailyData: DailyQueryCount[] = useMemo(() => {
    const days: DailyQueryCount[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = queryLog.filter((q) => q.timestamp.startsWith(dateStr)).length;
      days.push({ date: dateStr.slice(5), count });
    }
    return days;
  }, [queryLog]);

  const modelUsage = useMemo(() => {
    const map = new Map<string, number>();
    queryLog.forEach((q) => { map.set(q.model, (map.get(q.model) ?? 0) + 1); });
    return Array.from(map.entries()).map(([model, count]) => ({ model, count }));
  }, [queryLog]);

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 size={32} className="animate-spin-slow" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  const STAT_CARDS = [
    { label: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'var(--color-primary)' },
    { label: 'Total Queries', value: stats.totalQueries, icon: MessageSquare, color: 'var(--color-secondary)' },
    { label: 'Avg Latency', value: `${stats.avgLatencyMs}ms`, icon: Clock, color: 'var(--color-success)' },
    { label: 'Total Chunks', value: stats.totalChunks, icon: Hash, color: 'var(--color-warning)' },
  ];

  return (
    <>
      <Navbar />
      <div className="analytics-page">
        <div className="analytics-content page-enter">
          <div className="analytics-header">
            <div>
              <p className="analytics-kicker" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Dashboard</p>
              <h1 className="analytics-title" style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 8 }}>Analytics</h1>
              <p className="analytics-subtitle">Insights from your document analysis activity</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="analytics-tab-strip">
            <div className="analytics-tab-scroll">
              <div className="tab-bar">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`tab-item${activeTab === tab.key ? ' active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="kpi-card">
                <div className="kpi-info">
                  <span className="kpi-label">{label}</span>
                  <p className="kpi-value">{value}</p>
                </div>
                <div className="kpi-icon" style={{ background: `${color}18` }}>
                  <Icon size={22} style={{ color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              <div className="chart-section">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
                    <h3 className="chart-title">Queries Over Time (Last 14 Days)</h3>
                  </div>
                </div>
                <div style={{ height: 240, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height={240} minWidth={0}>
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(197,200,190,0.6)" />
                      <XAxis dataKey="date" stroke="#6d7169" fontSize={11} />
                      <YAxis stroke="#6d7169" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'rgba(var(--panel-rgb),0.96)', border: '1px solid rgba(var(--border-rgb),0.35)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, boxShadow: '0 16px 32px rgba(var(--primary-rgb),0.12)' }} />
                      <Area type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} fill="url(#queryGradient)" name="Queries" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="queries-section">
                <div className="queries-header">
                  <h3 className="queries-title">Recent Queries</h3>
                </div>
                {queryLog.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '24px 0' }}>No queries yet. Start asking questions!</p>
                ) : (
                  <table className="queries-table">
                    <thead>
                      <tr>
                        <th>Query</th>
                        <th>Document</th>
                        <th style={{ textAlign: 'right' }}>Latency</th>
                        <th style={{ textAlign: 'right' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queryLog.slice(0, 10).map((q) => (
                        <tr key={q.id} className="query-row">
                          <td><span className="query-text">{truncate(q.question, 50)}</span></td>
                          <td><span className="query-text">{truncate(q.documentName, 30)}</span></td>
                          <td style={{ textAlign: 'right' }}><span className="badge badge-info" style={{ fontSize: '0.6rem' }}>{q.latencyMs}ms</span></td>
                          <td style={{ textAlign: 'right' }}><span className="query-timestamp">{formatRelativeTime(q.timestamp)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="queries-section animate-fade-in">
              <div className="queries-header"><h3 className="queries-title">Document Statistics</h3></div>
              {documents.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '24px 0' }}>No documents uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-container)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(85,98,77,0.08)', flexShrink: 0 }}>
                        <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.pageCount} pages · {doc.chunkCount} chunks · {formatRelativeTime(doc.createdAt)}</p>
                      </div>
                      <span className={`badge ${doc.status === 'indexed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>{doc.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="queries-section animate-fade-in">
              <div className="queries-header"><h3 className="queries-title">Full Query History</h3></div>
              {queryLog.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '24px 0' }}>No queries in history.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {queryLog.map((q) => (
                    <div key={q.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-container)' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8 }}>{q.question}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📄 {truncate(q.documentName, 25)}</span>
                        <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>{q.latencyMs}ms</span>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6rem' }}>{q.model}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatRelativeTime(q.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="queries-section animate-fade-in">
              <div className="queries-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Database size={16} style={{ color: 'var(--color-primary)' }} />
                  <h3 className="queries-title">Model Usage</h3>
                </div>
              </div>
              {modelUsage.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '24px 0' }}>No model usage data yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {modelUsage.map(({ model, count }) => (
                    <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12, background: 'var(--surface-container)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(254,215,210,0.56)', flexShrink: 0 }}>
                        <BarChart3 size={18} style={{ color: 'var(--color-secondary)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{model}</p>
                        <div style={{ width: '100%', height: 6, borderRadius: 999, marginTop: 8, background: 'rgba(197,200,190,0.4)' }}>
                          <div style={{ height: '100%', borderRadius: 999, background: 'var(--gradient-accent)', width: `${Math.min((count / Math.max(...modelUsage.map((m) => m.count))) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
