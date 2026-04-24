'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, FileText, BarChart3, User } from 'lucide-react';

const TABS = [
  { href: '/', icon: MessageSquare, label: 'Workspace' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  if (pathname === '/auth') return null;

  return (
    <div className="mobile-tab-bar mobile-only" id="mobile-tab-bar">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.href === '/' ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-tab-item ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
          >
            <Icon size={20} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
