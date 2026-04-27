'use client';

import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ContactLink, Message } from '@/types';
import { FileText, Clock, Bot, User, Mail, Phone, Globe } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
}

function getContactIcon(type: ContactLink['type']) {
  switch (type) {
    case 'email':
      return <Mail size={14} />;
    case 'phone':
      return <Phone size={14} />;
    case 'linkedin':
    case 'github':
      return <Globe size={14} />;
    default:
      return <Globe size={14} />;
  }
}

const markdownComponents = {
  a: ({ href = '', children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const opensNewTab = /^https?:\/\//i.test(href);
    return (
      <a
        {...props}
        href={href}
        target={opensNewTab ? '_blank' : undefined}
        rel={opensNewTab ? 'noreferrer noopener' : undefined}
      >
        {children}
      </a>
    );
  },
};

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
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.text}</ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="ai-message-wrapper">
              <div className={`ai-content${msg.isStreaming ? ' cursor-blink' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.text || ' '}</ReactMarkdown>
              </div>

              {msg.resumeMetadata && !msg.isStreaming && (
                <div className="resume-answer-banner animate-fade-in">
                  <div className="resume-ats-card">
                    <span className="resume-ats-label">ATS Score</span>
                    <strong className="resume-ats-value">{msg.resumeMetadata.atsScore}/100</strong>
                    <span className="resume-ats-copy">{msg.resumeMetadata.profileTitle || 'Resume detected'}</span>
                  </div>

                  {msg.resumeMetadata.contactLinks.length > 0 && (
                    <div className="resume-contact-grid">
                      {msg.resumeMetadata.contactLinks.map((link) => {
                        const opensNewTab = /^https?:\/\//i.test(link.href);
                        return (
                          <a
                            key={`${link.type}-${link.value}`}
                            className={`resume-contact-chip resume-contact-${link.type}`}
                            href={link.href}
                            target={opensNewTab ? '_blank' : undefined}
                            rel={opensNewTab ? 'noreferrer noopener' : undefined}
                          >
                            <span className="resume-contact-icon">{getContactIcon(link.type)}</span>
                            <span className="resume-contact-content">
                              <span className="resume-contact-label">{link.label}</span>
                              <span className="resume-contact-value">{link.value}</span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {(msg.resumeMetadata.skills?.length ?? 0) > 0 && (
                    <div className="resume-skills-card">
                      <span className="resume-ats-label">Skills</span>
                      <div className="resume-skill-list compact">
                        {msg.resumeMetadata.skills?.map((skill) => (
                          <span key={skill} className="resume-skill-chip">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
