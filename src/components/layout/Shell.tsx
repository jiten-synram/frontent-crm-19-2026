'use client';
// src/components/layout/Shell.tsx — App shell with sidebar + header

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { followUpsAPI } from '@/lib/api';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

// ── Icons ─────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICONS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  leads:     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  pipeline:  'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10',
  campaigns:    'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  customers: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
  followups: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  orders:    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10',
  reports:   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  team:      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  integrations:'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  settings:  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  logout:    'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
};

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
  adminOnly?: boolean;
}

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' }] as NavItem[],
  },
  {
    title: 'Sales',
    items: [
      { href: '/leads',     label: 'Leads',      icon: 'leads' },
      { href: '/pipeline',  label: 'Pipeline',   icon: 'pipeline' },
      { href: '/customers', label: 'Customers',  icon: 'customers' },
      { href: '/follow-ups',label: 'Follow-ups', icon: 'followups' },
      { href: '/orders',    label: 'Orders',     icon: 'orders' },
    ] as NavItem[],
  },
  {
    title: 'Management',
    items: [
      { href: '/reports',      label: 'Reports',      icon: 'reports' },
      { href: '/campaigns',    label: 'Campaigns',    icon: 'campaigns',    adminOnly: true },
      { href: '/team',         label: 'Team',         icon: 'team',         adminOnly: true },
      { href: '/integrations', label: 'Integrations', icon: 'integrations', adminOnly: true },
      { href: '/settings',     label: 'Settings',     icon: 'settings' },
    ] as NavItem[],
  },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, clearAuth, isAdmin, _hasHydrated } = useAuthStore();  // ✅ _hasHydrated add kiya
  const router   = useRouter();
  const pathname = usePathname();
  const [mini, setMini]       = useState(false);
  const [fuCount, setFuCount] = useState(0);

  useEffect(() => {
    if (!_hasHydrated) return; // ✅ hydrate hone ka wait karo
    if (!isAuthenticated) { router.push('/login'); return; }
    followUpsAPI.counts().then((d: any) => {
      // setFuCount((d?.counts?.overdue || 0) + (d?.counts?.today || 0));
      setFuCount((d?.counts?.overdue || 0) + (d?.counts?.today || 0) + (d?.counts?.upcoming || 0));
    }).catch(() => {});
  }, [isAuthenticated, _hasHydrated]);  // ✅ _hasHydrated dependency add kiya

  const handleLogout = async () => {
    try { await import('@/lib/api').then(m => m.authAPI.logout()); } catch {}
    clearAuth();
    router.push('/login');
  };

  // ✅ Hydration complete hone tak blank screen dikhao (loop nahi hoga)
  if (!_hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-200 relative"
        style={{ width: mini ? 60 : 224, background: '#162B20' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-white/10 flex-shrink-0 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-base flex-shrink-0 shadow-sm">
            🌿
          </div>
          {!mini && (
            <div className="overflow-hidden">
              <div className="font-display text-[15px] text-white font-semibold leading-tight whitespace-nowrap">Yogveda</div>
              <div className="text-[9px] text-white/30 tracking-wider whitespace-nowrap">Healthcare CRM</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setMini(!mini)}
          className="absolute -right-3 top-5 w-6 h-6 bg-amber-500 rounded-full border-2 flex items-center justify-center text-white text-xs z-10 hover:bg-amber-400 transition-colors"
          style={{ borderColor: '#162B20' }}
        >
          {mini ? '›' : '‹'}
        </button>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin());
            if (!visibleItems.length) return null;
            return (
              <div key={section.title} className="mb-2">
                {!mini && (
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 px-2 py-1.5">
                    {section.title}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const badge = item.href === '/follow-ups' ? fuCount : item.badge;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={cn('nav-item', active && 'active', mini && 'justify-center px-2')} title={item.label}>
                        <Icon d={ICONS[item.icon]} size={16} />
                        {!mini && <span className="flex-1 truncate">{item.label}</span>}
                        {!mini && badge ? (
                          <span className="ml-auto bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User foot */}
        <div className={cn('px-3 py-3 border-t border-white/10 flex items-center gap-2.5 overflow-hidden', mini && 'justify-center')}>
          <Avatar name={user.name} size={28} />
          {!mini && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white font-medium truncate">{user.name}</div>
              <div className="text-[10px] text-white/30 capitalize truncate">{user.role.replace('_', ' ')}</div>
            </div>
          )}
          {!mini && (
            <button onClick={handleLogout} className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0" title="Logout">
              <Icon d={ICONS.logout} size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header fuCount={fuCount} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────
function Header({ fuCount, onLogout }: { fuCount: number; onLogout: () => void }) {
  const { user } = useAuthStore();
  const router   = useRouter();
  const [search, setSearch] = useState('');
  const [showNotif, setShowNotif] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/leads?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header className="h-[58px] bg-white border-b border-gray-200 flex items-center px-6 gap-3 flex-shrink-0 z-10">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search leads, phone, email… (Enter)"
          className="form-input pl-8 text-xs"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            className="btn btn-ghost btn-icon relative"
            onClick={() => { setShowNotif(!showNotif); }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {fuCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white" />
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-10 w-64 card shadow-modal z-50 py-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 border-b border-gray-100">Notifications</div>
              {fuCount > 0 ? (
                <Link href="/follow-ups" onClick={() => setShowNotif(false)}>
                  <div className="px-3 py-2.5 hover:bg-amber-50 cursor-pointer flex items-center gap-2">
                    <span className="text-amber-500">📅</span>
                    <span className="text-xs text-gray-700"><b>{fuCount}</b> follow-up{fuCount > 1 ? 's' : ''} need attention</span>
                  </div>
                </Link>
              ) : (
                <div className="px-3 py-2.5 text-xs text-gray-500">No pending notifications</div>
              )}
            </div>
          )}
        </div>

        {/* New Lead */}
        <Link href="/leads?action=new">
          <button className="btn btn-amber text-xs">+ New Lead</button>
        </Link>

        {/* User */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-gray-300 transition-colors"
          onClick={onLogout} title="Click to logout"
        >
          <Avatar name={user?.name || 'U'} size={22} />
          <span className="text-xs font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
        </button>
      </div>
    </header>
  );
}
