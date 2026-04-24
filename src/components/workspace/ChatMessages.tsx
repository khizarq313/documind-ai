'use client';

import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types';
import { FileText, Clock, Bot, User } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
}

export default function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) return null;

  return (
    <div className="chat-messages" id="chat-messages">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message-row message-enter ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}
        >
          {msg.role === 'assistant' && (
            <div className="ai-avatar">
              <Bot size={16} />
            </div>
          )}

          {msg.role === 'user' ? (
            <div className="user-message-wrapper">
              <div className="user-bubble">
                {msg.attachment && (
                  <div className="user-attachment-chip">
                    <FileText size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <div className="user-attachment-meta">
                      <span className="user-attachment-name">{msg.attachment.name}</span>
                      <span className="user-attachment-size">{formatFileSize(msg.attachment.sizeBytes)}</span>
                    </div>
                  </div>
                )}
                {msg.text ? (
                  <div className="user-bubble-text">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="ai-message-wrapper">
              <div className={`ai-content${msg.isStreaming ? ' cursor-blink' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text || ' '}</ReactMarkdown>
              </div>

              {!msg.isStreaming && (
                <>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="citations-section">
                      <span className="citations-label">SOURCES</span>
                      <div className="citations-list">
                        {msg.citations.map((c, i) => (
                          <span key={i} className="citation-chip">
                            <FileText size={10} />
                            {c.documentName} · p.{c.pageNumber}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="message-actions">
                    {msg.latencyMs && (
                      <span className="latency-label">
                        <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                        {(msg.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {msg.model && (
                      <span className="latency-label">{msg.model}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {msg.role === 'user' && (
            <div className="user-avatar">
              {user ? getInitials(user.name) : <User size={14} />}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
