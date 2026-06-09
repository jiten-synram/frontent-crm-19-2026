'use client';
import { useEffect, useState, useRef } from 'react';
import { notificationsAPI } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const router = useRouter();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread,        setUnread]        = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // ── Polling — har 30 seconds mein check karo ─────────────────
  const load = async () => {
    try {
      const res: any = await notificationsAPI.list();
      setNotifications(res?.notifications || []);
      setUnread(res?.unread || 0);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // 30 sec polling
    return () => clearInterval(interval);
  }, []);

  // Outside click se close karo
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRead = async (n: any) => {
    if (!n.is_read) {
      await notificationsAPI.read(n.id);
      setUnread(u => Math.max(0, u - 1));
      setNotifications(ns => ns.map(x => x.id === n.id ? { ...x, is_read: 1 } : x));
    }
    if (n.lead_id) {
      router.push(`/leads/${n.lead_id}`);
      setOpen(false);
    }
  };

  const handleReadAll = async () => {
    await notificationsAPI.readAll();
    setUnread(0);
    setNotifications(ns => ns.map(n => ({ ...n, is_read: 1 })));
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => { setOpen(o => !o); if (!open) load(); }}>
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500
            text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-modal
          border border-gray-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">
              Notifications {unread > 0 && <span className="text-red-500">({unread})</span>}
            </span>
            {unread > 0 && (
              <button className="text-xs text-gray-400 hover:text-forest-DEFAULT"
                onClick={handleReadAll}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">
                🔔 Koi notification nahi
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id}
                  onClick={() => handleRead(n)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer
                    hover:bg-gray-50 transition-colors
                    ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center
                      flex-shrink-0 text-sm
                      ${n.type === 'lead_assigned' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      {n.type === 'lead_assigned' ? '👤' : '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </div>
                      {n.message && (
                        <div className="text-[10px] text-gray-500 mt-0.5">{n.message}</div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">{fmtDate(n.created_at)}</div>
                    </div>
                    {/* Unread dot */}
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <button className="text-xs text-gray-400 hover:text-forest-DEFAULT"
                onClick={() => { setOpen(false); router.push('/leads'); }}>
                View all leads →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}