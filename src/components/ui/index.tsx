'use client';
// src/components/ui/index.tsx — All base UI components

import React, { forwardRef, ReactNode } from 'react';
import { cn, avatarColor, avatarInitials, STATUS_CONFIG, SOURCE_CONFIG } from '@/lib/utils';
import type { LeadStatus, LeadSource } from '@/types';
// ✅ Top pe import add karo
import { createPortal } from 'react-dom';

// ── Avatar ────────────────────────────────────────────────────────
interface AvatarProps { name: string; size?: number; className?: string; }
export function Avatar({ name, size = 32, className }: AvatarProps) {
  const bg = avatarColor(name);
  const initials = avatarInitials(name);
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0', className)}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as LeadStatus];
  if (!cfg) return <span className="badge bg-gray-100 text-gray-600">{status}</span>;
  return <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>;
}

// ── Source Badge ─────────────────────────────────────────────────
export function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source as LeadSource];
  if (!cfg) return <span className="badge bg-gray-100 text-gray-600">{source}</span>;
  return <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>;
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-green-700', className)}
      style={{ width: size, height: size }}
      fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────
export function Skeleton({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...p} />;
}

// ── Empty State ───────────────────────────────────────────────────
interface EmptyProps { icon?: string; title: string; description?: string; action?: ReactNode; }
export function Empty({ icon = '📋', title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn('modal-box w-full', widths[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-display text-lg font-semibold text-forest-DEFAULT">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon text-gray-500">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading, danger }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm"
      footer={
        <>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={cn('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size={14} /> : 'Confirm'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">{message}</p>
    </Modal>
  );
}

// ── Pagination ────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}
export function Pagination({ page, pages, total, limit, onChange }: PaginationProps) {
  if (pages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <span className="text-xs text-gray-500">Showing {start}–{end} of {total}</span>
      <div className="flex gap-1">
        <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => onChange(page - 1)}>← Prev</button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page - 2 + i;
          if (p < 1 || p > pages) return null;
          return (
            <button key={p} onClick={() => onChange(p)}
              className={cn('btn btn-sm', p === page ? 'btn-primary' : 'btn-outline')}>{p}</button>
          );
        })}
        <button className="btn btn-outline btn-sm" disabled={page === pages} onClick={() => onChange(page + 1)}>Next →</button>
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────
interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; }
export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 rounded-full transition-colors',
        checked ? 'bg-green-600' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 bg-white rounded-full shadow transition-transform mt-0.5',
        checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
      )} />
    </button>
  );
}

// ── Copy Field ────────────────────────────────────────────────────
export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div>
      <label className="form-label">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1.5">{hint}</p>}
      <div className="flex gap-2">
        <input
          readOnly value={value}
          className="form-input font-mono text-xs bg-gray-50"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button className="btn btn-outline btn-sm flex-shrink-0 min-w-[70px]" onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ── Stats card ────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  color?: 'green' | 'amber' | 'blue' | 'purple' | 'red';
  trend?: number;
  onClick?: () => void;
}
export function StatCard({ label, value, sub, icon, color = 'green', trend, onClick }: StatCardProps) {
  const iconBg = {
    green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={cn('kpi-card', `kpi-${color}`, onClick && 'cursor-pointer')} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0', iconBg[color])}>
            {icon}
          </div>
        )}
        {trend != null && (
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="font-display text-2xl font-semibold text-forest-DEFAULT">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Data table header sort ────────────────────────────────────────
export function TableHeader({ children, sorted, order, onClick }: {
  children: ReactNode; sorted?: boolean; order?: 'ASC' | 'DESC'; onClick?: () => void;
}) {
  return (
    <th className={cn('data-table-th', onClick && 'cursor-pointer select-none')} onClick={onClick}>
      <span className="flex items-center gap-1">
        {children}
        {sorted && <span className="text-green-700">{order === 'ASC' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );
}

// ── Info row ──────────────────────────────────────────────────────
export function InfoRow({ label, value, highlight }: { label: string; value?: ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className={cn('font-medium text-gray-800', highlight && 'text-green-800 font-semibold')}>{value || '—'}</span>
    </div>
  );
}

// ── Search input ──────────────────────────────────────────────────
export const SearchInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
      <input ref={ref} className={cn('form-input pl-8', className)} {...props} />
    </div>
  )
);
SearchInput.displayName = 'SearchInput';
