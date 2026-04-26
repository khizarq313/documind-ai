'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, LogOut, MoonStar, PencilLine, ShieldCheck, Sparkles, SunMedium, UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import * as storage from '@/lib/storage';

const PROFILE_CARDS = [
  {
    title: 'Default Model',
    value: 'Workspace Auto',
    detail: 'Placeholder preference until model switching is connected.',
    icon: Sparkles,
  },
  {
    title: 'Privacy Mode',
    value: 'Local Only',
    detail: 'Your chats and document metadata stay in local storage right now.',
    icon: ShieldCheck,
  },
  {
    title: 'Display Name',
    value: 'Editable',
    detail: 'Update how your name appears across the workspace and profile menu.',
    icon: PencilLine,
  },
];

export default function ProfilePage() {
  const { user, isLoading: authLoading, renameUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const workspaceStats = useMemo(() => {
    if (!user) {
      return { documents: 0, chats: 0, favorites: 0, queries: 0 };
    }

    return {
      documents: storage.getDocuments(user.id).length,
      chats: storage.getChatStore(user.id).chats.length,
      favorites: storage.getFavorites(user.id).length,
      queries: storage.getQueryLog(user.id).length,
    };
  }, [user]);

  const memberSince = useMemo(() => {
    if (!user) return 'Recently';
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(user.createdAt));
  }, [user]);

  const profileName = draftName ?? user?.name ?? '';
  const hasNameChanges = !!user && profileName.trim() !== user.name;

  const handleSaveName = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextName = profileName.trim();

    if (!nextName) {
      addToast('warning', 'Enter a display name before saving.');
      return;
    }

    if (!renameUser(nextName)) {
      addToast('error', 'Unable to update your profile right now.');
      return;
    }

    addToast('success', 'Profile name updated.');
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

      <div className="profile-page">
        <div className="profile-content page-enter">
          <div className="profile-header">
            <p className="profile-kicker">Profile</p>
            <div className="profile-hero">
              <div className="profile-avatar-block">
                <div className="profile-avatar-large">
                  <span>{user.name[0]?.toUpperCase() ?? 'D'}</span>
                </div>
                <div className="profile-hero-copy">
                  <h1 className="profile-title">{user.name}</h1>
                  <p className="profile-subtitle">Rename your local account, review workspace stats, and manage your session.</p>
                </div>
              </div>

              <div className="profile-hero-meta">
                <div className="profile-meta-pill">
                  <UserRound size={14} />
                  <span>Local account</span>
                </div>
                <div className="profile-meta-pill">
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>
          </div>

          <section className="profile-panel profile-rename-panel">
            <div className="profile-panel-header">
              <div>
                <p className="mono-label">Identity</p>
                <h2 className="profile-panel-title">Rename your display name</h2>
              </div>
            </div>

            <form className="profile-rename-form" onSubmit={handleSaveName}>
              <label className="profile-field-label" htmlFor="profile-name-input">Display name</label>
              <input
                id="profile-name-input"
                className="profile-name-input"
                value={profileName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Enter your name"
                maxLength={40}
              />
              <div className="profile-form-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setDraftName(null)}
                  disabled={!hasNameChanges}
                >
                  Reset
                </button>
                <button className="btn-primary" type="submit" disabled={!hasNameChanges}>
                  Save name
                </button>
              </div>
            </form>
          </section>

          <div className="profile-stats-grid">
            <div className="profile-stat-card">
              <span className="profile-stat-label">Documents</span>
              <p className="profile-stat-value">{workspaceStats.documents}</p>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-label">Chats</span>
              <p className="profile-stat-value">{workspaceStats.chats}</p>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-label">Favorites</span>
              <p className="profile-stat-value">{workspaceStats.favorites}</p>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-label">Queries</span>
              <p className="profile-stat-value">{workspaceStats.queries}</p>
            </div>
          </div>

          <div className="profile-layout-grid">
            <section className="profile-panel">
              <div className="profile-panel-header">
                <div>
                  <p className="mono-label">Workspace</p>
                  <h2 className="profile-panel-title">Quick settings</h2>
                </div>
                <button className="btn-secondary" type="button" onClick={toggleTheme}>
                  {isDark ? <SunMedium size={14} /> : <MoonStar size={14} />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
              </div>

              <div className="profile-card-stack">
                {PROFILE_CARDS.map(({ title, value, detail, icon: Icon }) => (
                  <article key={title} className="profile-info-card">
                    <div className="profile-info-icon">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="profile-info-title">{title}</p>
                      <p className="profile-info-value">{value}</p>
                      <p className="profile-info-detail">{detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="profile-panel profile-panel-danger">
              <div className="profile-panel-header">
                <div>
                  <p className="mono-label">Session</p>
                  <h2 className="profile-panel-title">Logout</h2>
                </div>
              </div>

              <p className="profile-danger-copy">
                Signing out clears your local chats, favorites, query history, and uploaded document metadata from this browser.
              </p>

              <button className="profile-logout-button" type="button" onClick={() => setShowLogoutConfirm(true)}>
                <LogOut size={16} />
                Logout
              </button>
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign out?"
        message="All local chats and workspace data will be removed from this browser."
        confirmLabel="Logout"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
      />
    </>
  );
}