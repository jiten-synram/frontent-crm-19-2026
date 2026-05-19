// src/lib/utils.ts — Shared helpers and constants

import { type ClassValue, clsx } from 'clsx';
import type { LeadStatus, LeadSource } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ── Date formatters ──────────────────────────────────────────────
export function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d: string | Date | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtRelative(d: string | Date): string {
  const now = Date.now();
  const then = new Date(d).getTime();
  const diff = now - then;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return fmtDate(d);
}

// ── Currency formatter ───────────────────────────────────────────
export function fmtCurrency(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function fmtINR(n: number | undefined | null): string {
  if (n == null) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}

// ── Duration formatter ───────────────────────────────────────────
export function fmtDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Status config ────────────────────────────────────────────────
export const STATUS_CONFIG: Record<LeadStatus, {
  label: string;
  badgeClass: string;
  color: string;
  bg: string;
  dot: string;
}> = {
  new:         { label: 'New',         badgeClass: 'badge-new',        color: '#1447c0', bg: '#EFF6FF', dot: '#3b82f6' },
  in_process:  { label: 'In Process',  badgeClass: 'badge-in_process', color: '#92400e', bg: '#FEF3C7', dot: '#f59e0b' },
  follow_up:   { label: 'Follow-up',   badgeClass: 'badge-follow_up',  color: '#5b21b6', bg: '#F3E8FF', dot: '#8b5cf6' },
  converted:   { label: 'Converted',   badgeClass: 'badge-converted',  color: '#166534', bg: '#F0FDF4', dot: '#22c55e' },
  delivered:   { label: 'Delivered',   badgeClass: 'badge-delivered',  color: '#065f46', bg: '#ECFDF5', dot: '#10b981' },
  closed_lost: { label: 'Closed Lost', badgeClass: 'badge-closed_lost',color: '#991b1b', bg: '#FEF2F2', dot: '#ef4444' },
};

// ── Source config ────────────────────────────────────────────────
export const SOURCE_CONFIG: Record<LeadSource, { label: string; badgeClass: string }> = {
  call:      { label: 'Call',      badgeClass: 'src-call' },
  whatsapp:  { label: 'WhatsApp',  badgeClass: 'src-whatsapp' },
  meta_ads:  { label: 'Meta Ads',  badgeClass: 'src-meta_ads' },
  referral:  { label: 'Referral',  badgeClass: 'src-referral' },
  website:   { label: 'Website',   badgeClass: 'src-website' },
  shopify:   { label: 'Shopify',   badgeClass: 'src-shopify' },
  campaign:  { label: 'Campaign',  badgeClass: 'src-campaign' },
};

// ── CRM constants ────────────────────────────────────────────────
export const CATEGORIES = [
  'Kidney Stone Treatment', 'Gall Stone Treatment', 'UTI Treatment',
  'CKD Treatment', 'Thyroid Treatment', 'Piles Treatment',
  'PCOS/PCOD Treatment', 'Arthritis Treatment', 'Diabetes Treatment',
  'High Blood Pressure', 'Heart Treatment', 'Prostate Treatment',
  'Supplements', 'General',
];

export const SUPPLEMENTS = [
  'Gut Health', 'Apple Cider Vinegar', 'Ashwagandha', 'Neem Karela Jamun Juice',
  'Vitamin ADK', 'Spirulina', 'Selenium', 'Vitamin D', 'UTI Support',
  'Triphala', 'Kidney Care Plus', 'Liver Detox',
];

export const SOURCES: LeadSource[] = [
  'call', 'whatsapp', 'meta_ads', 'referral', 'website', 'campaign', 'shopify',
];

export const ALL_STATUSES: LeadStatus[] = [
  'new', 'in_process', 'follow_up', 'converted', 'delivered', 'closed_lost',
];

// ── Avatar colour by index ───────────────────────────────────────
const AVATAR_COLORS = [
  '#162B20', '#1E5038', '#2A6B4A', '#D06300', '#7C3AED',
  '#1447c0', '#991b1b', '#065f46', '#92400e', '#1e3a5f',
];
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── Status badge component helper ───────────────────────────────
export function getStatusBadgeClass(status: string): string {
  return `badge badge-${status}`;
}

// ── Phone normaliser ─────────────────────────────────────────────
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

// ── Pagination helper ────────────────────────────────────────────
export function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// ── Export CSV helper ────────────────────────────────────────────
export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
