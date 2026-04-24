'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import type { ChatSession } from '@/types';

function getChatMeta(chat: ChatSession): string {
  if (chat.status === 'indexed') return 'Document ready';
  if (chat.status === 'uploading' || chat.status === 'indexing' || chat.status === 'processing') return 'Indexing document...';
  if (chat.status === 'failed') return 'Upload failed';
  if (chat.documentId) return 'Document attached';
  return 'Start by uploading a document';
}

function StatusBadge({ status }: { status?: string }) {
  if (status === 'indexed') return <span className="chip chip-secondary" style={{ fontSize: '0.6rem' }}>Ready</span>;
  if (status === 'uploading' || status === 'indexing' || status === 'processing') return <span className="chip chip-warning" style={{ fontSize: '0.6rem' }}>Indexing</span>;
  if (status === 'failed') return <span className="chip chip-error" style={{ fontSize: '0.6rem' }}>Failed</span>;
  return null;
}

interface ChatSidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onClearAll: () => void;
}

export default function ChatSidebar({
  chats,
  activeChatId,
  isOpen,
  onClose,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onClearAll,
}: ChatSidebarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [clearAllPending, setClearAllPending] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingChatId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingChatId]);

  // Click outside clears pending delete / clear-all
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.chat-delete-btn') || target.closest('.clear-all-btn')) return;
      setPendingDeleteId(null);
      setClearAllPending(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleChatSelect = (chatId: string) => {
    setPendingDeleteId(null);
    setClearAllPending(false);
    onSelectChat(chatId);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) onClose();
  };

  const startRename = (chat: ChatSession) => {
    setPendingDeleteId(null);
    setClearAllPending(false);
    setEditingChatId(chat.id);
    setDraftTitle(chat.title);
  };

  const finishRename = (chat: ChatSession) => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== chat.title) onRenameChat(chat.id, trimmed);
    setEditingChatId(null);
    setDraftTitle('');
  };

  const cancelRename = () => {
    setEditingChatId(null);
    setDraftTitle('');
  };

  const handleDeleteClick = (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    setClearAllPending(false);
    setEditingChatId(null);
    if (pendingDeleteId === chat.id) {
      onDeleteChat(chat.id);
      setPendingDeleteId(null);
      return;
    }
    setPendingDeleteId(chat.id);
  };

  const handleClearAllClick = () => {
    setPendingDeleteId(null);
    if (clearAllPending) {
      onClearAll();
      setClearAllPending(false);
      return;
    }
    setClearAllPending(true);
  };

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${isOpen ? ' open' : ''}`}
        aria-label="Close sidebar"
        onClick={onClose}
      />

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" type="button" onClick={onNewChat} id="new-chat-button">
            <Plus size={16} />
            <span>New Chat</span>
          </button>

          {chats.length > 0 ? (
            <button
              className={`clear-all-btn${clearAllPending ? ' pending' : ''}`}
              type="button"
              onClick={handleClearAllClick}
            >
              {clearAllPending ? 'Confirm clear' : 'Clear all'}
            </button>
          ) : null}

          <button
            className="sidebar-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-section">
          <span className="mono-label">Chats</span>
        </div>

        <div className="chat-list">
          {chats.length === 0 ? (
            <div className="chat-empty-state">
              <p className="chat-empty-title">No chats yet</p>
              <p className="chat-empty-copy">Upload a document from the workspace to start a new conversation.</p>
            </div>
          ) : (
            chats.map((chat) => {
              const isEditing = editingChatId === chat.id;
              const isConfirmingDelete = pendingDeleteId === chat.id;
              const isActive = activeChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`chat-item${isActive ? ' active' : ''}${isConfirmingDelete ? ' danger' : ''}`}
                  id={`chat-${chat.id}`}
                >
                  {isEditing ? (
                    <div className="chat-select-btn editing">
                      <MessageSquare size={18} className="chat-item-icon" />
                      <div className="chat-item-info">
                        <input
                          ref={editInputRef}
                          className="chat-title-input"
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onBlur={() => finishRename(chat)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') finishRename(chat);
                            if (e.key === 'Escape') cancelRename();
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="chat-select-btn"
                      onClick={() => handleChatSelect(chat.id)}
                    >
                      <MessageSquare size={18} className="chat-item-icon" />
                      <div className="chat-item-info">
                        <p
                          className="chat-item-name"
                          onDoubleClick={() => startRename(chat)}
                        >
                          {chat.title}
                        </p>
                        <p className={`chat-item-meta${isConfirmingDelete ? ' danger' : ''}`}>
                          {isConfirmingDelete ? 'Click trash again to delete' : getChatMeta(chat)}
                        </p>
                      </div>
                    </button>
                  )}

                  <div className="chat-item-side">
                    {!isConfirmingDelete ? <StatusBadge status={chat.status} /> : null}
                    <button
                      className="chat-delete-btn"
                      type="button"
                      aria-label={`Delete ${chat.title}`}
                      title={isConfirmingDelete ? 'Click again to confirm delete' : 'Delete chat'}
                      onClick={(e) => handleDeleteClick(e, chat)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <div className="storage-card">
            <div className="storage-header">
              <span className="mono-label">Workspace</span>
              <span className="mono-label" style={{ color: 'white' }}>{chats.length}</span>
            </div>
            <p className="storage-copy">
              Double-click a title to rename it. Remove chats without affecting your stored documents.
            </p>
          </div>
          <div className="sidebar-meta">
            <span className="version-label">v1.2.0-beta</span>
          </div>
        </div>
      </aside>
    </>
  );
}
