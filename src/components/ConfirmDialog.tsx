'use client';

import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  icon?: React.ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  icon,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="logout-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="logout-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {icon && <div className="logout-dialog-icon">{icon}</div>}
        <h3 id="confirm-dialog-title" className="logout-dialog-title">
          {title}
        </h3>
        <p className="logout-dialog-copy">
          {message}
        </p>
        <div className="logout-dialog-actions">
          <button className="logout-btn logout-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="logout-btn logout-btn-confirm"
            onClick={onConfirm}
            id="confirm-dialog-confirm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
