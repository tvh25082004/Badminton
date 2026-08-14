'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { LeaderboardItem } from '@/lib/types';
import { LeaderboardTable } from '@/components/LeaderboardTable';

export default function LeaderboardPage() {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api<{ items: LeaderboardItem[]; meta: { totalPages: number; total: number } }>(
      `/ratings/leaderboard?page=${page}&limit=20`,
    )
      .then((d) => {
        setItems(d.items);
        setTotalPages(Math.max(1, d.meta?.totalPages ?? 1));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Bảng xếp hạng Elo</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Yêu cầu: tối thiểu 10 trận rated và 6 đối thủ khác nhau.
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="skeleton" style={{ height: 300 }} />
        ) : (
          <LeaderboardTable items={items} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button className="btn btn-ghost small" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ← Trước
          </button>
          <span className="faint small">
            Trang {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost small"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau →
          </button>
        </div>
      </div>
    </div>
  );
}
