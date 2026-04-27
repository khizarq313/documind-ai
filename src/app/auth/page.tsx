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

      {/* ── Mobile-only hero section ── */}
      <div className="auth-mobile-hero">
        <div className="auth-mobile-hero-inner">
          <Image src="/brand-mark.svg" alt="DocuMind AI" width={60} height={60} priority className="auth-mobile-logo-img" />
          <h1 className="auth-mobile-brand">DocuMind AI</h1>
          <p className="auth-mobile-tagline">Intelligent Document Analysis</p>
        </div>
        {/* Wave separator */}
        <div className="auth-mobile-wave" aria-hidden="true">
          <svg viewBox="0 0 375 72" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,48 C60,10 130,72 210,42 C270,18 320,60 375,38 L375,72 L0,72 Z" className="auth-wave-path" />
          </svg>
        </div>
      </div>

      {/* ── Card (desktop) / flat form (mobile) ── */}
      <div className="auth-card animate-slide-up">

        {/* Desktop-only logo block */}
        <div className="auth-desktop-logo">
          <Image src="/brand-mark.svg" alt="DocuMind AI Logo" width={72} height={72} priority />
          <h1 className="auth-desktop-brand">DocuMind AI</h1>
          <p className="auth-desktop-sub">Intelligent Document Analysis</p>
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
        <div className="auth-feature-pills">
          {[
            { icon: Sparkles, label: 'AI-Powered Analysis' },
            { icon: Shield, label: 'Privacy First' },
            { icon: Zap, label: 'Instant Insights' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="auth-feature-pill">
              <Icon size={12} style={{ color: 'var(--color-primary)' }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
