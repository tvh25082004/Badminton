'use client';

import Link from 'next/link';
import type { LeaderboardItem } from '@/lib/types';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardTable({ items }: { items: LeaderboardItem[] }) {
  if (items.length === 0) {
    return <p className="muted small">Chưa có dữ liệu.</p>;
  }
  return (
    <div className="list">
      {items.map((it) => (
        <div className="list-item" key={it.userId}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ width: 30, textAlign: 'center', fontWeight: 800 }}>
              {it.rank <= 3 ? MEDALS[it.rank - 1] : it.rank}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.displayName ?? 'Người chơi'}
              </div>
              <div className="faint small">
                {it.region ?? '—'} · {it.ratedMatches} trận · {it.uniqueOpponents} đối thủ
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="rating-num" style={{ fontSize: 20, color: 'var(--lime-soft)' }}>
              {it.rating}
            </div>
            <div className="faint small">
              {it.ratingState === 'ESTABLISHED' ? 'Vững vàng' : 'Tạm thời'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeaderboardLink({ items }: { items: LeaderboardItem[] }) {
  return (
    <div>
      <LeaderboardTable items={items} />
      <div style={{ marginTop: 14, textAlign: 'right' }}>
        <Link href="/app/leaderboard" className="btn btn-ghost small">
          Xem toàn bộ →
        </Link>
      </div>
    </div>
  );
}
