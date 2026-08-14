'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';
import { StatusBadge } from '@/components/Badges';
import { CreateSessionForm } from '@/components/CreateSessionForm';

export default function SessionsPage() {
  const sp = useSearchParams();
  const createOpen = sp.get('create') === '1';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(createOpen);

  const load = () => {
    setLoading(true);
    api<{ items: Session[] }>('/sessions?page=1&limit=20')
      .then((d) => setSessions(d.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Phiên chơi</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Đóng' : '+ Tạo phiên'}
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>
        Tìm kiếm phiên giao lưu, luyện tập hoặc đánh rated tại các sân cầu lông.
      </p>

      {error && <div className="error-box">{error}</div>}

      {showCreate && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">
            <span className="dot" /> Tạo phiên chơi mới
          </div>
          <CreateSessionForm onCreated={() => { setShowCreate(false); load(); }} />
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : sessions.length === 0 ? (
          <p className="muted small">Chưa có phiên chơi nào. Hãy tạo phiên đầu tiên!</p>
        ) : (
          <div className="list">
            {sessions.map((s) => (
              <div className="list-item" key={s.id}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{s.title}</div>
                  <div className="faint small">
                    {s.venue?.name ?? s.venueId ? 'Đã chọn sân' : 'Chưa chọn sân'}
                    {s.startAt ? ` · ${new Date(s.startAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <StatusBadge status={s.status} />
                  <div className="faint small" style={{ marginTop: 4 }}>
                    {s.participantCount ?? 0}/{s.maxParticipants ?? '?'} người
                    {s.totalCost ? ` · ${(s.totalCost / 1000).toFixed(0)}k` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
