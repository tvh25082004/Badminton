'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api<{ items: Notification[]; total: number }>('/notifications?page=1&limit=30')
      .then((d) => setItems(d.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'POST' });
      setItems((arr) => arr.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch {
      /* ignore */
    }
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      SessionJoined: 'Phiên chơi',
      SessionLeft: 'Phiên chơi',
      SessionUpdated: 'Phiên chơi',
      MatchResultConfirmRequired: 'Trận đấu',
      DisputeOpened: 'Tranh chấp',
      DisputeUpdated: 'Tranh chấp',
      RatingApplied: 'Elo',
    };
    return map[t] ?? 'Thông báo';
  };

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Thông báo</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Hoạt động gần đây: phiên chơi, trận đấu cần xác nhận, thay đổi Elo.
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : items.length === 0 ? (
          <p className="muted small">Chưa có thông báo nào.</p>
        ) : (
          <div className="list">
            {items.map((n) => (
              <div
                key={n.id}
                className="list-item"
                style={{
                  opacity: n.readAt ? 0.6 : 1,
                  cursor: n.readAt ? 'default' : 'pointer',
                  alignItems: 'flex-start',
                }}
                onClick={() => !n.readAt && markRead(n.id)}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span className="badge badge-gray">{typeLabel(n.type)}</span>
                    {!n.readAt && <span className="badge badge-lime">Mới</span>}
                  </div>
                  <div style={{ fontWeight: 700 }}>{n.title}</div>
                  {n.body && <div className="muted small">{n.body}</div>}
                  <div className="faint small" style={{ marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                {n.resourceType === 'MATCH' && n.resourceId && (
                  <Link
                    href={`/app/matches/${n.resourceId}`}
                    className="btn btn-ghost small"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Mở →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
