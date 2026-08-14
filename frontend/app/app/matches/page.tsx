'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Match } from '@/lib/types';
import { StatusBadge, FormatLabel, ModeLabel } from '@/components/Badges';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Match[] }>('/matches/me?page=1&limit=20')
      .then((d) => setMatches(d.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Trận đấu của tôi</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Trận 2v2 theo lịch và quick match. Trận rated sẽ cập nhật Elo sau khi đủ xác nhận.
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="skeleton" style={{ height: 240 }} />
        ) : matches.length === 0 ? (
          <p className="muted small">Bạn chưa tham gia trận nào.</p>
        ) : (
          <div className="list">
            {matches.map((m) => {
              const score = m.latestResult?.scores;
              return (
                <Link key={m.id} href={`/app/matches/${m.id}`} style={{ color: 'inherit' }}>
                  <div className="list-item">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>
                        {m.matchType === 'QUICK' ? '⚡ Quick Rated' : '🏸 Trận theo lịch'}
                        <span className="faint small" style={{ fontWeight: 400 }}>
                          {' '}
                          · {FormatLabel(m.format)} · {ModeLabel(m.mode)}
                        </span>
                      </div>
                      <div className="faint small">
                        {m.players
                          .filter((p) => p.team === 'A')
                          .map((p) => p.displayName ?? 'A?')
                          .join(' & ')}{' '}
                        vs{' '}
                        {m.players
                          .filter((p) => p.team === 'B')
                          .map((p) => p.displayName ?? 'B?')
                          .join(' & ')}
                      </div>
                      {score && (
                        <div className="mono small muted">
                          {score.teamA.join('-')} : {score.teamB.join('-')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <StatusBadge status={m.status} />
                      <div className="faint small" style={{ marginTop: 4 }}>
                        {m.scheduledAt
                          ? new Date(m.scheduledAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                          : '—'}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
