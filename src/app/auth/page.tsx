'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';
import Image from 'next/image';

export default function AuthPage() {
  const { login, user, isLoading } = useAuth();
  const [name, setName] = useState('');

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0) login(name.trim());
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            className="animate-pulse-glow"
            style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}
          >
            <Image src="/brand-mark.svg" alt="DocuMind AI Logo" width={72} height={72} priority />
          </div>
          <h1 style={{ color: 'white', fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>DocuMind AI</h1>
          <p style={{ color: 'rgba(148,163,184,0.72)', fontSize: '0.875rem', marginTop: 6 }}>Intelligent Document Analysis</p>
        </div>

        <p className="auth-kicker">GET STARTED</p>
        <h2 className="auth-title" style={{ fontSize: 'clamp(1.6rem,3vw,2rem)' }}>Welcome</h2>
        <p className="auth-copy">Enter your name to begin analyzing documents with AI.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="auth-name-input">Your Name</label>
          <input
            id="auth-name-input"
            type="text"
            className="input-field auth-input"
            placeholder="Enter your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={50}
            aria-label="Display name"
          />
          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={name.trim().length === 0}
            id="auth-submit-btn"
          >
            Continue to Workspace
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
          {[
            { icon: Sparkles, label: 'AI-Powered Analysis' },
            { icon: Shield, label: 'Privacy First' },
            { icon: Zap, label: 'Instant Insights' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 9999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.7)', fontSize: '0.72rem' }}
            >
              <Icon size={12} style={{ color: 'var(--color-primary)' }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
