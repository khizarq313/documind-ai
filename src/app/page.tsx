'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as storage from '@/lib/storage';
import { buildDocumentProfile, generateId, stripResumeContactsFromText, truncate, isAskingForResumeMetadata, removeEmptySections } from '@/lib/utils';
import { retrieveTopChunks } from '@/lib/retrieval';
import type { ChatSession, Message, DocumentRecord, Citation, DocuMindUser } from '@/types';
import Navbar from '@/components/Navbar';
import ChatSidebar from '@/components/workspace/ChatSidebar';
import ChatMessages from '@/components/workspace/ChatMessages';
import ChatInput, { type ChatInputHandle } from '@/components/workspace/ChatInput';
import { ChevronRight, EllipsisVertical, Loader2, Share2, Upload } from 'lucide-react';
import Image from 'next/image';
import { reconstructText } from '@/lib/chunking';

const DOCUMENT_SUGGESTIONS = [
  'Summarize this document',
  'Key insights',
  'Explain this file',
  'Important points',
];
const DEFAULT_SUMMARY_MODE = 'normal';

function getChatStatusLabel(status?: string): string {
  if (status === 'indexed') return 'Ready';
  if (status === 'processing' || status === 'indexing' || status === 'uploading') return 'Indexing';
  if (status === 'failed') return 'Failed';
  return 'New chat';
}

function sortChatsByRecent(chatList: ChatSession[]): ChatSession[] {
  return [...chatList].sort((left, right) => {
    const lastActivityDiff = new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
    if (lastActivityDiff !== 0) return lastActivityDiff;

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export default function WorkspacePage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 size={32} className="animate-spin-slow" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!user) return null;

  return <WorkspaceView key={user.id} user={user} />;
}

function WorkspaceView({ user }: { user: DocuMindUser }) {
  const { addToast } = useToast();
  const [initialChatStore] = useState(() => storage.getChatStore(user.id));

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true,
  );
  const [chats, setChats] = useState<ChatSession[]>(() => sortChatsByRecent(initialChatStore.chats));
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatStore.activeChatId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summaryMode, setSummaryMode] = useState(DEFAULT_SUMMARY_MODE);
  const [draft, setDraft] = useState('');
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const chatInputRef = useRef<ChatInputHandle>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isUploadingRef = useRef(isUploading);
  const isStreamingRef = useRef(isStreaming);
  const chatsRef = useRef(chats);
  const activeChatIdRef = useRef(activeChatId);
  const swipeStartX = useRef<number>(0);
  const swipeStartY = useRef<number>(0);

  useEffect(() => { isUploadingRef.current = isUploading; }, [isUploading]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  // Close workspace menu on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!workspaceMenuRef.current?.contains(e.target as Node)) {
        setShowWorkspaceMenu(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const persistState = useCallback((nextChats: ChatSession[], nextActiveId: string | null) => {
    if (!user) return;
    const orderedChats = sortChatsByRecent(nextChats);
    setChats(orderedChats);
    setActiveChatId(nextActiveId);
    storage.setChatStore(user.id, { chats: orderedChats, activeChatId: nextActiveId });
  }, [user]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activeDocument = activeChat?.documentId
    ? storage.getDocumentById(user.id, activeChat.documentId)
    : null;

  const activeDocName = activeDocument?.filename || activeChat?.title || 'New Chat';
  const isIndexing = activeChat?.status === 'indexing' || activeChat?.status === 'processing' || activeChat?.status === 'uploading';
  const showCenteredUpload = !activeChat || (!activeChat.documentId && activeChat.messages.length === 0);
  const showFirstRunWelcome = chats.length === 0;

  const composerStatusText = (() => {
    if (isUploading) return 'Uploading document...';
    if (isStreaming) return 'Generating grounded answer...';
    if (activeChat?.status === 'failed') return 'This upload failed. Add the file again to retry.';
    if (isIndexing) return 'Indexing document...';
    if (!activeChat?.documentId) return '';
    return `Ready on ${activeDocName}`;
  })();

  // ── New Chat ──────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    const currentActive = chatsRef.current.find((c) => c.id === activeChatIdRef.current);
    // Don't create a new one if active is already fresh/empty
    if (currentActive && currentActive.messages.length === 0 && !currentActive.documentId) {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) setIsSidebarOpen(false);
      return;
    }
    const newChat: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      documentId: null,
      status: 'ready',
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isCustomTitle: false,
    };
    setDraft('');
    chatInputRef.current?.clearAttachment();
    persistState([newChat, ...chatsRef.current], newChat.id);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) setIsSidebarOpen(false);
  }, [persistState]);

  // ── Select Chat ───────────────────────────────────────
  const handleSelectChat = useCallback((chatId: string) => {
    const current = chatsRef.current;
    const currentActive = current.find((c) => c.id === activeChatIdRef.current);
    // Remove empty unsent chat when switching away
    const shouldRemoveEmpty =
      currentActive &&
      activeChatIdRef.current !== chatId &&
      currentActive.messages.length === 0 &&
      !currentActive.documentId;
    const nextChats = shouldRemoveEmpty
      ? current.filter((c) => c.id !== activeChatIdRef.current)
      : current;
    persistState(nextChats, chatId);
    setIsSidebarOpen(false);
  }, [persistState]);

  // ── Delete Chat ───────────────────────────────────────
  const handleDeleteChat = useCallback((chatId: string) => {
    const current = chatsRef.current;
    const next = current.filter((c) => c.id !== chatId);
    const newActiveId = activeChatIdRef.current === chatId ? (next[0]?.id ?? null) : activeChatIdRef.current;
    persistState(next, newActiveId);
  }, [persistState]);

  // ── Rename Chat ───────────────────────────────────────
  const handleRenameChat = useCallback((chatId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const updated = chatsRef.current.map((c) => c.id === chatId ? { ...c, title: trimmed, isCustomTitle: true } : c);
    persistState(updated, activeChatIdRef.current);
  }, [persistState]);

  // ── Clear All ─────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    persistState([], null);
  }, [persistState]);

  // ── Sidebar Toggle ────────────────────────────────────
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((v) => !v);
  }, []);

  // ── Query Stream ──────────────────────────────────────
  const handleQueryStream = useCallback(async (chatId: string, question: string, docOverride?: DocumentRecord | null) => {
    const doc = docOverride ?? (chatsRef.current.find((c) => c.id === chatId)?.documentId
      ? storage.getDocumentById(user.id, chatsRef.current.find((c) => c.id === chatId)!.documentId!)
      : null);

    const contextChunks = doc ? retrieveTopChunks(question, doc.chunks, doc.filename, 8) : [];
    const documentText = doc ? reconstructText(doc.chunks).slice(0, 24000) : '';
    const documentProfile = doc ? buildDocumentProfile(documentText) : undefined;

    const streamingMsgId = generateId();
    setChats((prev) => {
      const updated = prev.map((c) => c.id !== chatId ? c : {
        ...c, lastActivityAt: new Date().toISOString(),
        messages: [...c.messages, { id: streamingMsgId, role: 'assistant' as const, text: '', isStreaming: true, timestamp: new Date().toISOString() }],
      });
      const orderedChats = sortChatsByRecent(updated);
      if (user) storage.setChatStore(user.id, { chats: orderedChats, activeChatId: chatId });
      return orderedChats;
    });
    setActiveChatId(chatId);

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let renderedText = '';
    let pendingText = '';
    const updateStreamingMessage = (nextText: string) => {
      setChats((prev) => prev.map((chat) => chat.id !== chatId ? chat : {
        ...chat,
        messages: chat.messages.map((message) => message.id === streamingMsgId ? { ...message, text: nextText } : message),
      }));
    };
    const flushStreamingBuffer = () => {
      if (!pendingText) return;
      const chunkSize = pendingText.length > 30 ? 18 : pendingText.length > 12 ? 10 : pendingText.length;
      renderedText += pendingText.slice(0, chunkSize);
      pendingText = pendingText.slice(chunkSize);
      updateStreamingMessage(renderedText);
    };
    const drainStreamingBuffer = async () => {
      while (pendingText.length > 0) {
        flushStreamingBuffer();
        await new Promise((resolve) => setTimeout(resolve, 24));
      }
    };
    const streamFlushTimer = setInterval(flushStreamingBuffer, 24);

    try {
      const res = await fetch('/api/query/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          contextChunks,
          fullText: documentText,
          documentName: doc?.filename ?? 'Unknown',
          mode: summaryMode,
          documentProfile,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      const citations: Citation[] = [];
      let latencyMs = 0;
      let model = '';
      let eventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'token' && data.token) {
                fullText += data.token;
                pendingText += data.token;
              } else if (eventType === 'citation') {
                citations.push({ documentName: data.documentName, pageNumber: data.pageNumber });
              } else if (eventType === 'done') {
                latencyMs = data.latencyMs;
                model = data.model;
              } else if (eventType === 'error') {
                throw new Error(data.message);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                throw parseErr;
              }
            }
            eventType = '';
          } else if (line === '') {
            eventType = '';
          }
        }
      }

      await drainStreamingBuffer();
      const finalizedText = documentProfile?.isResume
        ? stripResumeContactsFromText(fullText, documentProfile.contactLinks)
        : fullText;
      const cleanedText = removeEmptySections(finalizedText);
      if (cleanedText !== renderedText) {
        updateStreamingMessage(cleanedText);
      }

      setChats((prev) => {
        const updated = prev.map((c) => c.id !== chatId ? c : {
          ...c, lastActivityAt: new Date().toISOString(),
          messages: c.messages.map((m) => m.id === streamingMsgId ? {
            ...m, text: cleanedText, isStreaming: false,
            citations: citations.length > 0 ? citations : undefined,
            latencyMs: latencyMs || undefined,
            model: model || undefined,
            documentType: documentProfile?.documentType,
            resumeMetadata: (() => {
              if (!documentProfile?.isResume) return undefined;
              // Only show metadata if:
              // 1. This is the first message in the chat (no previous messages from assistant), OR
              // 2. The user explicitly asked for ATS score, contact links, or skills
              const hasAnyPreviousAssistantMessage = c.messages.some((m) => m.role === 'assistant' && m.id !== streamingMsgId);
              const isFirstMessage = !hasAnyPreviousAssistantMessage;
              const userAskedForMetadata = isAskingForResumeMetadata(question);

              if (isFirstMessage || userAskedForMetadata) {
                return {
                  atsScore: documentProfile.atsScore ?? 0,
                  contactLinks: documentProfile.contactLinks,
                  skills: documentProfile.skills,
                  profileTitle: documentProfile.profileTitle,
                };
              }
              return undefined;
            })(),
          } : m),
        });
        const orderedChats = sortChatsByRecent(updated);
        if (user) storage.setChatStore(user.id, { chats: orderedChats, activeChatId: chatId });
        return orderedChats;
      });
      setActiveChatId(chatId);

      if (user && doc) {
        storage.addQueryLogEntry(user.id, {
          id: generateId(), question, documentId: doc.id, documentName: doc.filename,
          latencyMs: latencyMs || 0, model: model || 'unknown',
          citationCount: citations.length, timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const msg = err instanceof Error ? err.message : 'Failed to get response';
        addToast('error', msg);
        setChats((prev) => {
          const updated = prev.map((c) => c.id !== chatId ? c : {
            ...c,
            lastActivityAt: new Date().toISOString(),
            messages: c.messages.map((m) => m.id === streamingMsgId ? { ...m, text: msg, isStreaming: false } : m),
          });
          const orderedChats = sortChatsByRecent(updated);
          if (user) storage.setChatStore(user.id, { chats: orderedChats, activeChatId: chatId });
          return orderedChats;
        });
        setActiveChatId(chatId);
      }
    } finally {
      clearInterval(streamFlushTimer);
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [user, addToast, summaryMode]);

  // ── Send with file ────────────────────────────────────
  const handleSendWithFile = useCallback(async (question: string, file: File, deepScan: boolean): Promise<boolean> => {
    void deepScan;

    if (isUploadingRef.current) return false;

    const trimmedQuestion = question.trim();
    const timestamp = new Date().toISOString();

    let targetChatId: string;
    const currentActive = chatsRef.current.find((c) => c.id === activeChatIdRef.current);

    const uploadingMsg: Message = {
      id: generateId(), role: 'assistant', text: 'Uploading and indexing your PDF...', timestamp,
    };
    const userMsg: Message | null = trimmedQuestion ? {
      id: generateId(), role: 'user', text: trimmedQuestion, timestamp,
      attachment: { name: file.name, sizeBytes: file.size },
    } : null;

    if (currentActive) {
      targetChatId = currentActive.id;
      const newMsgs: Message[] = [...(userMsg ? [userMsg] : []), uploadingMsg];
      const updated = chatsRef.current.map((c) => c.id === targetChatId
        ? { ...c, title: c.isCustomTitle ? c.title : file.name, status: 'uploading' as const, lastActivityAt: timestamp, messages: [...c.messages, ...newMsgs] }
        : c);
      persistState(updated, targetChatId);
    } else {
      const freshChat: ChatSession = {
        id: generateId(), title: file.name, documentId: null, status: 'uploading',
        messages: [...(userMsg ? [userMsg] : []), uploadingMsg],
        createdAt: timestamp, lastActivityAt: timestamp, isCustomTitle: false,
      };
      targetChatId = freshChat.id;
      persistState([freshChat, ...chatsRef.current], freshChat.id);
    }

    if (typeof window !== 'undefined' && window.innerWidth <= 768) setIsSidebarOpen(false);

    void (async () => {
      let doc: DocumentRecord | null = null;
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || `Upload failed (${res.status})`);
        }
        const data = await res.json() as DocumentRecord;
        doc = { ...data, isServerBacked: true };
        storage.addDocument(user.id, doc);
        setChats((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetChatId) return c;
            const msgs = c.messages.filter((m) => m.text !== 'Uploading and indexing your PDF...');
            return { ...c, title: c.isCustomTitle ? c.title : doc!.filename, documentId: doc!.id, status: 'indexed' as const, lastActivityAt: new Date().toISOString(), messages: msgs };
          });
          const orderedChats = sortChatsByRecent(updated);
          storage.setChatStore(user.id, { chats: orderedChats, activeChatId: targetChatId });
          return orderedChats;
        });
        setActiveChatId(targetChatId);
        addToast('success', `"${doc.filename}" ready for queries`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setChats((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetChatId) return c;
            const msgs = c.messages.filter((m) => m.text !== 'Uploading and indexing your PDF...');
            return { ...c, status: 'failed' as const, lastActivityAt: new Date().toISOString(), messages: [...msgs, { id: generateId(), role: 'assistant' as const, text: msg, timestamp: new Date().toISOString() }] };
          });
          const orderedChats = sortChatsByRecent(updated);
          storage.setChatStore(user.id, { chats: orderedChats, activeChatId: targetChatId });
          return orderedChats;
        });
        setActiveChatId(targetChatId);
        addToast('error', msg);
        return;
      } finally {
        setIsUploading(false);
      }

      if (trimmedQuestion && doc) {
        await handleQueryStream(targetChatId, trimmedQuestion, doc);
      }
    })();

    return true;
  }, [user.id, addToast, persistState, handleQueryStream]);

  // ── Send Message ──────────────────────────────────────
  const handleSend = useCallback(async (text: string, deepScan: boolean): Promise<boolean> => {
    void deepScan;

    if (isUploadingRef.current || isStreamingRef.current) return false;

    const trimmed = text.trim();
    if (!trimmed) return false;

    let currentChats = chatsRef.current;
    let currentActiveId = activeChatIdRef.current;

    // If no active chat, create one
    if (!currentActiveId || !currentChats.find((c) => c.id === currentActiveId)) {
      const newChat: ChatSession = {
        id: generateId(), title: truncate(trimmed, 40), documentId: null, status: 'ready',
        messages: [], createdAt: new Date().toISOString(), lastActivityAt: new Date().toISOString(), isCustomTitle: false,
      };
      currentChats = [newChat, ...currentChats];
      currentActiveId = newChat.id;
    }

    const chatIdx = currentChats.findIndex((c) => c.id === currentActiveId);
    if (chatIdx === -1) return false;

    const chat = { ...currentChats[chatIdx] };
    if (!chat.isCustomTitle && chat.messages.length === 0) chat.title = truncate(trimmed, 40);

    const userMsg: Message = {
      id: generateId(), role: 'user', text: trimmed, timestamp: new Date().toISOString(),
    };
    chat.messages = [...chat.messages, userMsg];
    chat.lastActivityAt = new Date().toISOString();
    currentChats = [...currentChats];
    currentChats[chatIdx] = chat;
    persistState(currentChats, currentActiveId);

    await handleQueryStream(currentActiveId, trimmed);
    return true;
  }, [persistState, handleQueryStream]);

  return (
    <>
      <Navbar
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      <div className={`workspace-layout${isSidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`}>
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onClearAll={handleClearAll}
        />

        <main
          className="workspace-main animate-fade-in"
          onTouchStart={(e) => {
            swipeStartX.current = e.touches[0].clientX;
            swipeStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - swipeStartX.current;
            const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY.current);
            if (dx > 50 && dy < dx && swipeStartX.current < 40 && !isSidebarOpen) {
              setIsSidebarOpen(true);
            }
          }}
        >
          {showCenteredUpload ? (
            // ── Empty / first-run state ──
            <div className="chat-scroll-area">
              <div className="workspace-empty-state">
                <div className="workspace-empty-card animate-fade-in">
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <Image src="/brand-mark.svg" alt="DocuMind AI Logo" width={64} height={64} priority />
                  </div>
                  <span className="mono-label workspace-empty-label">Document-aware assistant</span>
                  <h1 className="workspace-empty-title">
                    {showFirstRunWelcome ? `Welcome, ${user.name} 👋` : 'Attach a PDF to start'}
                  </h1>
                  <p className="workspace-empty-copy">
                    {showFirstRunWelcome
                      ? 'Attach a PDF, add an optional prompt, and send when you are ready. DocuMind will index the file and answer with grounded citations.'
                      : 'Attach a PDF in the composer below. The chat will be created when you send it.'}
                  </p>
                  <button
                    type="button"
                    className="workspace-upload-button"
                    onClick={() => chatInputRef.current?.openFilePicker()}
                    disabled={isUploading}
                    id="workspace-center-upload"
                  >
                    <Upload size={18} />
                    <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Breadcrumb ── */}
              <div className="workspace-breadcrumb">
                <div className="breadcrumb-path">
                  <span className="breadcrumb-root">Workspace</span>
                  <ChevronRight size={14} className="breadcrumb-sep" />
                  <span className="breadcrumb-current">{activeDocName}</span>
                  <span className="chip chip-primary breadcrumb-badge">
                    {chats.filter((c) => c.status === 'indexed').length} sources active
                  </span>
                </div>
                <div className="breadcrumb-actions">
                  <span className={`chip breadcrumb-status ${activeChat?.status === 'indexed' ? 'chip-secondary' : activeChat?.status === 'failed' ? 'chip-error' : 'chip-warning'}`}>
                    {getChatStatusLabel(activeChat?.status)}
                  </span>
                  <button className="btn-icon breadcrumb-share-btn" type="button" aria-label="Share conversation">
                    <Share2 size={16} />
                  </button>
                  <div className="workspace-menu-anchor" ref={workspaceMenuRef}>
                    <button
                      className="btn-icon"
                      type="button"
                      aria-label="More workspace options"
                      onClick={() => setShowWorkspaceMenu((v) => !v)}
                    >
                      <EllipsisVertical size={16} />
                    </button>
                    {showWorkspaceMenu && (
                      <div className="workspace-menu-dropdown">
                        <button className="workspace-menu-item" type="button" onClick={() => setShowWorkspaceMenu(false)}>
                          <span className="workspace-menu-icon">📋</span> Copy link
                        </button>
                        <button className="workspace-menu-item" type="button" onClick={() => setShowWorkspaceMenu(false)}>
                          <span className="workspace-menu-icon">🔖</span> Bookmark chat
                        </button>
                        <button className="workspace-menu-item" type="button" onClick={() => setShowWorkspaceMenu(false)}>
                          <span className="workspace-menu-icon">⚙</span> Chat settings
                        </button>
                        <div className="workspace-menu-divider" />
                        <button
                          className="workspace-menu-item workspace-menu-item-danger"
                          type="button"
                          disabled={!activeChat}
                          onClick={() => { setShowWorkspaceMenu(false); setShowDeleteConfirm(true); }}
                        >
                          <span className="workspace-menu-icon">🗑️</span> Delete chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Messages ── */}
              <div className="chat-scroll-area">
                <div className="workspace-content-stack">
                  <ChatMessages messages={activeChat?.messages ?? []} isStreaming={isStreaming} />
                </div>
              </div>
            </>
          )}

          {/* ── Composer ── */}
          <ChatInput
            ref={chatInputRef}
            value={draft}
            onValueChange={setDraft}
            onSend={handleSend}
            onSendWithFile={handleSendWithFile}
            disabled={isStreaming || isIndexing}
            activeDoc={activeDocument?.filename || activeChat?.title || null}
            isUploading={isUploading}
            suggestions={DOCUMENT_SUGGESTIONS}
            statusText={composerStatusText}
            summaryMode={summaryMode}
            onSummaryModeChange={setSummaryMode}
          />
        </main>
      </div>

      {/* ── Delete chat confirmation ── */}
      {typeof document !== 'undefined' && showDeleteConfirm && createPortal(
        <div
          className="logout-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="logout-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="logout-dialog-icon">🗑️</div>
            <h3 className="logout-dialog-title">Delete this chat?</h3>
            <p className="logout-dialog-copy">
              This chat and its associated document will be permanently removed. This cannot be undone.
            </p>
            <div className="logout-dialog-actions">
              <button className="logout-btn logout-btn-cancel" type="button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="logout-btn logout-btn-confirm"
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  if (activeChat) handleDeleteChat(activeChat.id);
                }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
