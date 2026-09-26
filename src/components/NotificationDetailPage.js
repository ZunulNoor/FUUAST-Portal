'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Bell, Inbox } from 'lucide-react';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PortalSidebar from '@/components/PortalSidebar';
import PageHeader from '@/components/PageHeader';
import { panel, portalMain, portalContent, btnSecondary, formError } from '@/components/ui/cx';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const typeLabels = {
  class_shortfall: { label: 'Class shortfall', tone: 'bg-[#fff5e8] text-warning' },
};

export default function NotificationDetailPage({ portal = 'staff' }) {
  const params = useParams();
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (hydrated && !user) {
      router.push(`/${portal}/login`);
      return;
    }
    if (!hydrated || !user) return;

    let active = true;
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      setError('No notification specified.');
      setLoading(false);
      return;
    }
    setLoading(true);
    staffApi
      .get(`/notifications/${id}`)
      .then((response) => {
        if (!active) return;
        setItem(response.data?.notification || null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.error?.message || 'Unable to load this notification.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, user, router, portal, params.id]);

  if (!hydrated || !user) return null;

  const typeMeta = typeLabels[item?.type] || { label: 'Notification', tone: 'bg-brand-soft text-brand' };

  return (
    <>
      <PortalSidebar portal={portal} />
      <main className={portalMain}>
        <PageHeader
          eyebrowText={portal === 'staff' ? 'STAFF NOTIFICATIONS' : 'NOTIFICATIONS'}
          title="Notification details"
          portal={portal}
        />
        <div className={portalContent}>
          <LinkBack portal={portal} />

          {loading ? (
            <p className="py-14 text-center text-sm text-muted">Loading notification…</p>
          ) : error ? (
            <div className={`${panel} p-6`}>
              <p className={formError}>{error}</p>
            </div>
          ) : item ? (
            <article className={`${panel} overflow-hidden`}>
              <header className="flex items-start justify-between gap-4 border-b border-line bg-gradient-to-br from-paper to-[#f0f3e9] p-6">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                    <Bell size={20} />
                  </span>
                  <div>
                    <span className={`w-max rounded-[4px] px-2 py-[5px] text-[10px] font-bold ${typeMeta.tone}`}>
                      {typeMeta.label}
                    </span>
                    <h2 className="mt-2 text-lg font-semibold text-brand-dark">{item.title}</h2>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{formatDate(item.created_at)}</span>
              </header>
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_220px]">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#b9c89a]">
                    Message
                  </span>
                  <p className="mt-2 text-sm leading-relaxed text-ink">{item.message || '—'}</p>

                  {item.entity_type && item.entity_id ? (
                    <div className="mt-6">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#b9c89a]">
                        Reference
                      </span>
                      <p className="mt-2 text-sm text-muted">
                        {item.entity_type} # {item.entity_id}
                      </p>
                    </div>
                  ) : null}
                </div>
                <aside className="grid content-start gap-3 rounded-md border border-line bg-surface p-4">
                  <div>
                    <span className="block text-[10px] text-muted">Status</span>
                    <strong
                      className={`mt-0.5 block text-sm ${Number(item.is_read) ? 'text-muted' : 'text-action'}`}
                    >
                      {Number(item.is_read) ? 'Read' : 'Unread'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted">Type</span>
                    <strong className="mt-0.5 block text-sm capitalize text-ink">{item.type}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted">Received</span>
                    <strong className="mt-0.5 block text-sm text-ink">{formatDate(item.created_at)}</strong>
                  </div>
                </aside>
              </div>
            </article>
          ) : (
            <div className={`${panel} p-6`}>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
                  <Inbox size={20} />
                </span>
                <p className="text-sm text-muted">This notification is no longer available.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function LinkBack({ portal }) {
  const router = useRouter();
  const page = portal === 'staff' ? '/staff' : '/student';
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => router.push(page)}
        className={`${btnSecondary} h-8 px-3 text-xs`}
      >
        <ChevronLeft size={14} /> Back to {portal === 'staff' ? 'dashboard' : 'attendance'}
      </button>
    </div>
  );
}