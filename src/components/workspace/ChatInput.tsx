'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { FileText, Plus, ArrowUp, X, Zap, File, Brain, Search, Sparkles, ChevronRight, Lightbulb } from 'lucide-react';

const SUMMARY_MODES_LIST = [
  { value: 'normal', label: 'Normal' },
  { value: 'quick', label: 'Quick' },
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep' },
  { value: 'executive', label: 'Executive' },
  { value: 'student', label: 'Student Notes' },
];

const ACTION_MENU_ITEMS = [
  { id: 'attach', label: 'Add photos & files', icon: File, type: 'file' },
  { id: 'thinking', label: 'Thinking', icon: Brain, type: 'mode', value: 'normal' },
  { id: 'deep', label: 'Deep research', icon: Search, type: 'mode', value: 'deep' },
  { id: 'quick', label: 'Quick mode', icon: Sparkles, type: 'mode', value: 'quick' },
  { id: 'standard', label: 'Standard', icon: Zap, type: 'mode', value: 'standard' },
  { id: 'executive', label: 'Executive', icon: Zap, type: 'mode', value: 'executive' },
  { id: 'student', label: 'Student notes', icon: Zap, type: 'mode', value: 'student' },
];

const HINTS = [
  'Summarize this document',
  'Key insights',
  'Explain this file',
  'Important points',
];

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
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isHintsOpen, setIsHintsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

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
      ta.style.height = '0px';
      const nextHeight = Math.min(ta.scrollHeight, 132);
      ta.style.height = `${nextHeight}px`;
    }
  }, [value]);

  const placeholder = useMemo(() => {
    return 'Ask anything';
  }, []);

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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    e.target.value = '';
  };

  const handlePlusMenuAction = (item: typeof ACTION_MENU_ITEMS[0]) => {
    if (item.type === 'file') {
      fileInputRef.current?.click();
    } else if (item.type === 'mode' && item.value) {
      onSummaryModeChange?.(item.value);
    }
    setIsPlusMenuOpen(false);
    setIsHintsOpen(false);
  };

  const handleHintClick = (hint: string) => {
    onValueChange(hint);
    setIsPlusMenuOpen(false);
    setIsHintsOpen(false);
    textareaRef.current?.focus();
  };

  const closePlusMenu = useCallback(() => {
    setIsPlusMenuOpen(false);
    setIsHintsOpen(false);
  }, []);

  // Close plus menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isPlusMenuOpen &&
        plusMenuRef.current &&
        plusButtonRef.current &&
        !plusMenuRef.current.contains(e.target as Node) &&
        !plusButtonRef.current.contains(e.target as Node)
      ) {
        closePlusMenu();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isPlusMenuOpen, closePlusMenu]);

  return (
    <div className="chat-input-wrapper">
      <div className="chat-input-container">
        <div className="chat-input-glow" />

        <div className="chat-input-inner">
          {/* Attachment card — above the form row, ChatGPT style */}
          {attachedFile && (
            <div className="attachment-file-row">
              <div className="attachment-file-card">
                <div className="attachment-file-icon">
                  <FileText size={22} />
                </div>
                <div className="attachment-file-info">
                  <span className="attachment-file-name">{attachedFile.name}</span>
                  <span className="attachment-file-type">PDF</span>
                </div>
                <button
                  type="button"
                  className="attachment-file-remove"
                  aria-label="Remove attachment"
                  onClick={clearAttachment}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          <div className="chat-input-form">
            {/* Plus button (left) */}
            <div className="chat-input-left">
              <div className="plus-button-wrapper">
                <button
                  ref={plusButtonRef}
                  className="plus-button"
                  type="button"
                  aria-label="Add options"
                  onClick={() => { setIsPlusMenuOpen(!isPlusMenuOpen); setIsHintsOpen(false); }}
                  disabled={isUploading}
                >
                  <Plus size={20} />
                </button>

                {/* Plus menu — opens above */}
                {isPlusMenuOpen && (
                  <div ref={plusMenuRef} className="plus-menu">
                    {ACTION_MENU_ITEMS.map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = item.type === 'mode' && item.value === summaryMode;
                      return (
                        <button
                          key={item.id}
                          className={`plus-menu-item${isSelected ? ' plus-menu-item--selected' : ''}`}
                          type="button"
                          onClick={() => handlePlusMenuAction(item)}
                          disabled={disabled || isUploading}
                        >
                          <IconComponent size={16} />
                          <span>{item.label}</span>
                          {isSelected && <span className="plus-menu-item-check" aria-hidden="true">✓</span>}
                        </button>
                      );
                    })}

                    {/* Hints submenu trigger */}
                    <div
                      className={`plus-menu-item plus-menu-more${isHintsOpen ? ' active' : ''}`}
                      onClick={() => setIsHintsOpen(!isHintsOpen)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setIsHintsOpen(!isHintsOpen)}
                      aria-label="Hints"
                    >
                      <Lightbulb size={16} />
                      <span>Hints</span>
                      <ChevronRight size={14} className="plus-menu-more-arrow" />

                      {/* Hints submenu — appears to the right */}
                      {isHintsOpen && (
                        <div className="hints-submenu">
                          {HINTS.map((hint) => (
                            <button
                              key={hint}
                              className="hints-submenu-item"
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleHintClick(hint); }}
                              disabled={disabled || isUploading}
                            >
                              {hint}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Textarea (center) */}
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

            {/* Send button (right) */}
            <button
              className={`send-button${canSend ? ' active' : ''}`}
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSend}
              id="send-button"
              aria-label="Send message"
            >
              {isUploading ? <span className="send-spinner" aria-hidden="true" /> : <ArrowUp size={20} />}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            hidden
            onChange={handleFileInput}
          />
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="quick-actions">
          {suggestions.map((s) => (
            <button
              key={s}
              className="quick-action-btn"
              type="button"
              onClick={() => onValueChange(s)}
              disabled={disabled || isUploading}
            >
              <Zap size={14} />
              <span>{s}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

export default ChatInput;
