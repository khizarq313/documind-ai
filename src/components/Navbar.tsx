'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ArrowLeft, Bell, LogOut, Menu, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({ onToggleSidebar, isSidebarOpen = true }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  if (pathname === '/auth') return null;

  const avatarLabel = user?.name?.[0]?.toUpperCase() || 'D';
  const canUsePortal = typeof document !== 'undefined';
  const isWorkspacePage = pathname === '/';

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    setIsProfileOpen(false);
    await new Promise((r) => setTimeout(r, 400));
    logout();
  };

  const navLinks = [
    { href: '/', label: 'Workspace' },
    { href: '/documents', label: 'Documents' },
    { href: '/analytics', label: 'Analytics' },
  ];

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <button
            className={`sidebar-toggle-btn${isWorkspacePage && isSidebarOpen ? ' open' : ''}`}
            type="button"
            onClick={isWorkspacePage ? (onToggleSidebar ?? (() => router.push('/'))) : () => router.push('/')}
            aria-label={isWorkspacePage ? (isSidebarOpen ? 'Collapse sidebar' : 'Open sidebar') : 'Go to workspace'}
            id="workspace-sidebar-toggle"
          >
            {isWorkspacePage ? <Menu size={18} /> : <ArrowLeft size={18} />}
          </button>

          <div className="navbar-brand">
            <Image className="navbar-logo-mark" src="/brand-mark.svg" alt="DocuMind AI Logo" width={28} height={28} priority />
            <div className="navbar-logo" aria-label="DocuMind AI">
              <span className="navbar-logo-word">DocuMind</span>
              <span className="navbar-logo-accent">AI</span>
            </div>
          </div>

          <nav className="navbar-links">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-pill${pathname === href ? ' active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="navbar-right">
          <button type="button" className="model-selector-btn" aria-label="Model selector">
            <Sparkles size={12} className="model-dot" />
            <span>Model Selector</span>
          </button>

          <button className="btn-icon" type="button" aria-label="Notifications" id="nav-notifications">
            <Bell size={18} />
          </button>

          <div className="profile-menu" ref={dropdownRef}>
            <button
              className="profile-trigger"
              type="button"
              onClick={() => setIsProfileOpen((v) => !v)}
              aria-expanded={isProfileOpen}
              aria-label="Open profile menu"
            >
              <div className="avatar-ring">
                <div className="avatar-placeholder">
                  <span>{avatarLabel}</span>
                </div>
              </div>
              <span className="profile-name">{user?.name}</span>
            </button>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <span className="profile-dropdown-name">{user?.name}</span>
                  <span className="mono-label">Local profile</span>
                </div>
                <button
                  className="profile-dropdown-action"
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push('/profile');
                  }}
                >
                  <UserRound size={15} />
                  Profile
                </button>
                <button
                  className="profile-dropdown-action profile-dropdown-action-danger"
                  type="button"
                  onClick={() => { setIsProfileOpen(false); setShowLogoutConfirm(true); }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {canUsePortal && showLogoutConfirm && createPortal(
        <div
          className="logout-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div className="logout-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="logout-dialog-icon">⚠️</div>
            <h3 className="logout-dialog-title">Sign out?</h3>
            <p className="logout-dialog-copy">
              All your local chats and data will be permanently deleted. This cannot be undone.
            </p>
            <div className="logout-dialog-actions">
              <button className="logout-btn logout-btn-cancel" type="button" onClick={() => setShowLogoutConfirm(false)}>
                No, stay
              </button>
              <button className="logout-btn logout-btn-confirm" type="button" onClick={handleLogout}>
                Yes, sign out
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {canUsePortal && isLoggingOut && createPortal(
        <div className="logout-overlay" role="status" aria-label="Signing out">
          <div className="logout-progress-box">
            <span className="logout-progress-spinner" aria-hidden="true" />
            <p className="logout-progress-label">Signing out…</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
