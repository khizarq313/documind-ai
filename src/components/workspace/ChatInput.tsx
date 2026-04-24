'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { FileText, Paperclip, Plus, Send, X, Zap } from 'lucide-react';

const SUMMARY_MODES_LIST = [
  { value: 'normal', label: 'Normal' },
  { value: 'quick', label: 'Quick' },
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep' },
  { value: 'executive', label: 'Executive' },
  { value: 'student', label: 'Student Notes' },
];

const SUMMARY_MODES = SUMMARY_MODES_LIST;

export interface ChatInputHandle {
  openFilePicker: () => void;
  clearAttachment: () => void;
}

interface ChatInputProps {
  value: string;
  onValueChange: (v: string) => void;
  onSend: (text: string, deepScan: boolean) => Promise<boolean | void>;
  onSendWithFile?: (text: string, file: File, deepScan: boolean) => Promise<boolean | void>;
  disabled?: boolean;
  activeDoc?: string | null;
  isUploading?: boolean;
  suggestions?: string[];
  statusText?: string;
  summaryMode?: string;
  onSummaryModeChange?: (mode: string) => void;
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  value,
  onValueChange,
  onSend,
  onSendWithFile,
  disabled = false,
  activeDoc,
  isUploading = false,
  suggestions = [],
  statusText = '',
  summaryMode = 'normal',
  onSummaryModeChange,
}, ref) {
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSheetClosing, setIsSheetClosing] = useState(false);
  const sheetCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeSheet = useCallback(() => {
    setIsSheetClosing(true);
    sheetCloseTimer.current = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsSheetClosing(false);
    }, 240);
  }, []);

  useEffect(() => {
    return () => {
      if (sheetCloseTimer.current) clearTimeout(sheetCloseTimer.current);
    };
  }, []);

  const clearAttachment = useCallback(() => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useImperativeHandle(ref, () => ({
    openFilePicker: () => {
      if (!isUploading) fileInputRef.current?.click();
    },
    clearAttachment,
  }), [clearAttachment, isUploading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    }
  }, [value]);

  const placeholder = useMemo(() => {
    if (attachedFile) return 'Add an optional prompt to send with this PDF...';
    if (activeDoc) {
      const truncated = activeDoc.length > 24 ? `${activeDoc.slice(0, 22)}\u2026` : activeDoc;
      return `Ask a question about ${truncated}`;
    }
    return 'Ask a question or attach a PDF...';
  }, [activeDoc, attachedFile]);

  const canSend = Boolean(value.trim()) && !disabled && !isUploading;

  const clearComposer = useCallback(() => {
    onValueChange('');
    clearAttachment();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [onValueChange, clearAttachment]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!canSend) return;
    const didStart = attachedFile
      ? await onSendWithFile?.(trimmed, attachedFile, false)
      : await onSend(trimmed, false);
    if (didStart === false) return;
    clearComposer();
  }, [value, canSend, attachedFile, onSendWithFile, onSend, clearComposer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(e.target.value);
  };

  const handleSuggestionClick = useCallback((suggestion: string) => {
    onValueChange(suggestion);
    textareaRef.current?.focus();
  }, [onValueChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    e.target.value = '';
  };

  return (
    <div className="chat-input-wrapper">
      <div className="chat-input-container">
        <div className="chat-input-glow" />

        <div className="chat-input-inner">
          {statusText ? (
            <div className="chat-input-status">
              <span className="mono-label">{statusText}</span>
            </div>
          ) : null}

          {attachedFile ? (
            <div className="attachment-chip-row">
              <div className="attachment-chip">
                <FileText size={14} />
                <span className="attachment-chip-name">{attachedFile.name}</span>
                <button
                  type="button"
                  className="attachment-chip-remove"
                  aria-label="Remove attachment"
                  onClick={clearAttachment}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={placeholder}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled || isUploading}
            rows={1}
            id="chat-input"
            aria-label="Message input"
          />

          <div className="chat-input-actions">
            <div className="chat-input-left">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                hidden
                onChange={handleFileInput}
              />

              <button
                className="btn-icon"
                type="button"
                aria-label="Attach PDF"
                id="attach-file"
                onClick={() => !isUploading && fileInputRef.current?.click()}
                disabled={isUploading}
                title="Attach a PDF"
              >
                <Paperclip size={18} />
              </button>

              {/* Mobile-only + button */}
              <button
                className={`mobile-plus-btn${isMobileMenuOpen ? ' active' : ''}`}
                type="button"
                aria-label="More options"
                onClick={() => isMobileMenuOpen ? closeSheet() : setIsMobileMenuOpen(true)}
              >
                <Plus size={18} />
              </button>

              <div className="input-divider" />

              <div className="summary-mode-control">
                <select
                  className="summary-mode-select"
                  value={summaryMode}
                  onChange={(e) => onSummaryModeChange?.(e.target.value)}
                  disabled={isUploading}
                  aria-label="Summary Mode"
                  title="Choose summary mode"
                >
                  {SUMMARY_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="send-button"
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSend}
              id="send-button"
              aria-label="Send message"
            >
              {isUploading ? <span className="send-spinner" aria-hidden="true" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="quick-actions">
          {suggestions.map((s) => (
            <button
              key={s}
              className="quick-action-btn"
              type="button"
              onClick={() => handleSuggestionClick(s)}
              disabled={disabled || isUploading}
            >
              <Zap size={14} />
              <span>{s}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Mobile bottom-sheet: modes + suggestions */}
      {isMobileMenuOpen && (
        <div
          className={`mobile-sheet-overlay${isSheetClosing ? ' closing' : ''}`}
          onClick={closeSheet}
        >
          <div
            className={`mobile-sheet${isSheetClosing ? ' closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet-handle" />

            <div className="mobile-sheet-section">
              <p className="mobile-sheet-label">Mode</p>
              <div className="mobile-sheet-modes">
                {SUMMARY_MODES_LIST.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`mobile-mode-btn${summaryMode === value ? ' active' : ''}`}
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={() => { onSummaryModeChange?.(value); closeSheet(); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="mobile-sheet-section">
                <p className="mobile-sheet-label">Suggestions</p>
                <div className="mobile-sheet-hints">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      className="mobile-hint-btn"
                      type="button"
                      onClick={() => { handleSuggestionClick(s); closeSheet(); }}
                      disabled={disabled || isUploading}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatInput;
