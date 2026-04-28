'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as storage from '@/lib/storage';
import { formatFileSize, formatRelativeTime, generateId } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { DocumentCardSkeleton } from '@/components/Skeletons';
import {
  FileText, Search, Grid3X3, List, Star, StarOff,
  MoreVertical, Trash2, ExternalLink, Loader2, Hash, File
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type TabKey = 'all' | 'recent' | 'favorites';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Files' },
  { key: 'recent', label: 'Recent' },
  { key: 'favorites', label: 'Favorites' },
];

export default function DocumentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [storageVersion, setStorageVersion] = useState(0);
  const [referenceTime] = useState(() => Date.now());
  const userId = user?.id ?? null;

  const storageSnapshot = useMemo(() => {
    void storageVersion;

    return {
      documents: userId ? storage.getDocuments(userId) : [],
      favorites: userId ? storage.getFavorites(userId) : [],
    };
  }, [userId, storageVersion]);

  const { documents, favorites } = storageSnapshot;

  const loading = false;

  const filtered = useMemo(() => {
    let docs = [...documents];
    if (activeTab === 'recent') {
      const weekAgo = referenceTime - 7 * 24 * 60 * 60 * 1000;
      docs = docs.filter((d) => new Date(d.createdAt).getTime() > weekAgo);
    } else if (activeTab === 'favorites') {
      docs = docs.filter((d) => favorites.includes(d.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter((d) => d.filename.toLowerCase().includes(q));
    }
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return docs;
  }, [documents, activeTab, favorites, referenceTime, search]);

  const handleToggleFavorite = (docId: string) => {
    if (!user) return;
    const added = storage.toggleFavorite(user.id, docId);
    setStorageVersion((version) => version + 1);
    addToast('info', added ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleDelete = (docId: string) => {
    if (!user) return;
    storage.deleteDocumentFull(user.id, docId);
    setStorageVersion((version) => version + 1);
    setDeleteTarget(null);
    addToast('success', 'Document deleted');
  };

  const handleOpenInWorkspace = (docId: string) => {
    if (!user) return;
    const doc = storage.getDocumentById(user.id, docId);
    if (!doc) return;
    const chatStore = storage.getChatStore(user.id);
    const existing = chatStore.chats.find((c) => c.documentId === docId);
    if (existing) {
      storage.setActiveChatId(user.id, existing.id);
    } else {
      const chat = {
        id: generateId(),
        title: doc.filename,
        documentId: doc.id,
        status: 'ready' as const,
        messages: [],
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isCustomTitle: false,
      };
      storage.addChat(user.id, chat);
    }
    router.push('/');
  };

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 size={32} className="animate-spin-slow" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="documents-page page-enter">
        <div className="documents-content">
          {/* Header */}
          <div className="documents-header">
            <p className="documents-kicker" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Library</p>
            <h1 className="documents-title" style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 8 }}>Documents</h1>
            <p className="documents-subtitle">{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded</p>
          </div>

          {/* Controls */}
          <div className="documents-controls">
            <div className="documents-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`doc-tab${activeTab === tab.key ? ' active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="documents-actions">
              <div className="documents-search">
                <Search size={16} className="search-icon" />
                <input
                  className="search-input"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  id="doc-search"
                  aria-label="Search documents"
                />
              </div>
              <div className="documents-view-toggle">
                <button
                  className="btn-icon doc-view-btn"
                  type="button"
                  style={{ borderRadius: 0, background: viewMode === 'grid' ? 'var(--bg-elevated)' : 'transparent', color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  className="btn-icon doc-view-btn"
                  type="button"
                  style={{ borderRadius: 0, background: viewMode === 'list' ? 'var(--bg-elevated)' : 'transparent', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="documents-grid">
              {Array.from({ length: 6 }).map((_, i) => <DocumentCardSkeleton key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="documents-empty-state animate-fade-in">
              <File size={48} style={{ color: 'var(--text-muted)' }} />
              <h3 className="documents-empty-title">
                {activeTab === 'favorites' ? 'No favorites yet' : search ? 'No documents found' : 'No documents uploaded'}
              </h3>
              <p className="documents-empty-copy">
                {activeTab === 'favorites'
                  ? 'Star documents to add them to your favorites.'
                  : search
                    ? 'Try a different search term.'
                    : 'Upload a PDF from the workspace to get started.'}
              </p>
            </div>
          )}

          {/* Documents grid/list */}
          {!loading && filtered.length > 0 && (
            <div className={viewMode === 'grid' ? 'documents-grid' : 'documents-list'}>
              {filtered.map((doc) => {
                const isFav = favorites.includes(doc.id);
                const isMenuOpen = menuOpen === doc.id;

                if (viewMode === 'list') {
                  return (
                    <div
                      key={doc.id}
                      className="document-card document-card-list"
                      onClick={() => handleOpenInWorkspace(doc.id)}
                    >
                      <div className="doc-card-file-icon pdf"><FileText size={20} /></div>
                      <div className="document-card-list-main">
                        <h4 className="doc-card-title">{doc.filename}</h4>
                        <p className="doc-card-meta">{formatFileSize(doc.sizeBytes)} · {doc.pageCount} pages · {formatRelativeTime(doc.createdAt)}</p>
                      </div>
                      <button
                        className="btn-icon"
                        style={{ width: 32, height: 32 }}
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(doc.id); }}
                        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFav ? <Star size={16} style={{ color: 'var(--primary)' }} fill="currentColor" /> : <StarOff size={16} />}
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: 32, height: 32, color: 'var(--color-error)' }}
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc.id); }}
                        aria-label="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={doc.id}
                    className="document-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOpenInWorkspace(doc.id)}
                  >
                    <div className="doc-card-body">
                      <div className="doc-card-icon-row">
                        <div className="doc-card-file-icon pdf"><FileText size={22} /></div>
                        <div className="doc-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-icon"
                            style={{ width: 32, height: 32 }}
                            onClick={() => setMenuOpen(isMenuOpen ? null : doc.id)}
                            aria-label="More options"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {isMenuOpen && (
                            <div className="doc-menu-dropdown animate-fade-in">
                              <button onClick={() => { handleOpenInWorkspace(doc.id); setMenuOpen(null); }}>
                                <ExternalLink size={13} /> Open
                              </button>
                              <button style={{ color: 'var(--color-error)' }} onClick={() => { setDeleteTarget(doc.id); setMenuOpen(null); }}>
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <h4 className="doc-card-title">{doc.filename}</h4>
                      <p className="doc-card-meta">{formatFileSize(doc.sizeBytes)} · {formatRelativeTime(doc.createdAt)}</p>
                      <div className="doc-card-footer">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="chip chip-muted" style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <FileText size={9} /> {doc.pageCount}p
                          </span>
                          <span className="chip chip-cyan" style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Hash size={9} /> {doc.chunkCount}
                          </span>
                        </div>
                        <button
                          className="btn-icon"
                          style={{ width: 32, height: 32 }}
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(doc.id); }}
                          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFav ? <Star size={16} style={{ color: 'var(--primary)' }} fill="currentColor" /> : <StarOff size={16} style={{ color: 'var(--text-muted)' }} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Document"
        message="This document, its chunks, related chats, and cached summaries will be permanently deleted."
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(null)} />
      )}
    </>
  );
}
