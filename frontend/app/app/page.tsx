'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Match, RatingProfile, Session } from '@/lib/types';
import { StatusBadge, FormatLabel } from '@/components/Badges';

export default function DashboardPage() {
  const [rating, setRating] = useState<RatingProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<RatingProfile | null>('/ratings/me').catch(() => null),
      api<{ items: Match[] }>('/matches/me?page=1&limit=4').catch(() => ({ items: [] })),
      api<{ items: Session[] }>('/sessions?page=1&limit=4').catch(() => ({ items: [] })),
    ])
      .then(([r, m, s]) => {
        setRating(r);
        setMatches(m.items);
        setSessions(s.items);
      })
      .catch(() => setError('Không tải được dữ liệu.'));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Tổng quan</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Trạng thái rating, trận đấu và phiên chơi gần đây của bạn.
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">
            <span className="dot" /> Elo hiện tại
          </div>
          {rating ? (
            <>
              <div className="rating-num" style={{ fontSize: 40, color: 'var(--lime-soft)' }}>
                {rating.rating}
              </div>
              <div className="muted small">
                {rating.confidence === 'established' ? 'Vững vàng' : 'Tạm thời'} ·{' '}
                {rating.ratedMatches} trận · {rating.uniqueOpponents} đối thủ
              </div>
              {rating.nextMilestone ? (
                <div className="faint small" style={{ marginTop: 8 }}>
                  Còn {rating.nextMilestone} trận để chính thức
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted small">
              Chưa có rating. Hoàn thành{' '}
              <Link href="/app/assess">bài tự đánh giá</Link> để bắt đầu.
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <span className="dot" /> Trận gần đây
          </div>
          {matches.length === 0 ? (
            <p className="muted small">Chưa có trận nào.</p>
          ) : (
            matches.slice(0, 3).map((m) => (
              <div key={m.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="small">
                    {FormatLabel(m.format)} · {m.matchType === 'QUICK' ? 'Quick' : 'Theo lịch'}
                  </span>
                  <StatusBadge status={m.status} />
                </div>
                <div className="faint small">{m.players.length} người chơi</div>
              </div>
            ))
          )}
          <div style={{ marginTop: 10 }}>
            <Link href="/app/matches" className="btn btn-ghost small">
              Xem tất cả →
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span className="dot" /> Phiên chơi
          </div>
          {sessions.length === 0 ? (
            <p className="muted small">Chưa có phiên nào.</p>
          ) : (
            sessions.slice(0, 3).map((s) => (
              <div key={s.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.title}</div>
                <div className="faint small">
                  {s.venue?.name ?? 'Chưa chọn sân'} · <StatusBadge status={s.status} />
                </div>
              </div>
            ))
          )}
          <div style={{ marginTop: 10 }}>
            <Link href="/app/sessions" className="btn btn-ghost small">
              Mở phiên chơi →
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span className="dot" /> Hành động nhanh
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/app/sessions?create=1" className="btn btn-primary">
            + Tạo phiên chơi
          </Link>
          <Link href="/app/leaderboard" className="btn">
            🏆 Bảng xếp hạng
          </Link>
          <Link href="/app/assess" className="btn">
            📋 Tự đánh giá
          </Link>
        </div>
      </div>
    </div>
  );
}
