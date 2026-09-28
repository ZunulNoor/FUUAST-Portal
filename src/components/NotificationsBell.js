'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsBell({ portal = 'staff' }) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ unread_count: 0, notifications: [] });
  const rootRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  const openDetail = (item) => {
    setOpen(false);
    router.push(`/${portal}/notifications/${item.id}`);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await staffApi.get('/notifications');
      setData(response.data || { unread_count: 0, notifications: [] });
    } catch {
      // silently ignore — the bell just stays quiet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portal !== 'staff' || !hydrated || !user) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  }, [portal, hydrated, user]);

  useEffect(() => {
    if (portal !== 'staff' || !hydrated || !user || !pathname) return;
    fetchNotifications();
  }, [portal, hydrated, user, pathname]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (portal !== 'staff' || !user) return null;

  const markAllRead = async () => {
    try {
      await staffApi.post('/notifications/read-all');
      setData((current) => ({
        ...current,
        unread_count: 0,
        notifications: (current.notifications || []).map((item) => ({ ...item, is_read: 1 })),
      }));
    } catch {
      // ignore
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const unread = Number(data.unread_count || 0);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-line bg-paper text-ink transition hover:bg-surface"
      >
        <Bell size={17} />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-line bg-paper shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span className="text-[13px] font-bold text-ink">Notifications</span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unread}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-action transition hover:bg-brand-soft disabled:cursor-default disabled:text-muted"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </header>
          <div className="max-h-[340px] overflow-y-auto">
            {loading && !data.notifications.length ? (
              <p className="px-4 py-8 text-center text-xs text-muted">Checking notifications…</p>
            ) : data.notifications.length ? (
              data.notifications.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className={`block w-full border-b border-line/60 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface ${
                    Number(item.is_read) ? '' : 'bg-brand-soft/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${Number(item.is_read) ? 'text-ink' : 'text-brand-dark'}`}
                    >
                      {item.title}
                      {!Number(item.is_read) ? (
                        <span className="ml-2 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-action" />
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                  {item.message ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted">{item.message}</p>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-xs text-muted">You&apos;re all caught up.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
