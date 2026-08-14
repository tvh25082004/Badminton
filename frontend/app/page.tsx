import Link from 'next/link';
import { API_BASE } from '@/lib/config';
import type { LeaderboardItem } from '@/lib/types';
import { LeaderboardTable } from '@/components/LeaderboardTable';

async function getLeaderboard(): Promise<LeaderboardItem[]> {
  try {
    const res = await fetch(`${API_BASE}/ratings/leaderboard?page=1&limit=5`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const top = await getLeaderboard();

  return (
    <div className="container">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--lime)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0e13',
              fontSize: 18,
            }}
          >
            🏸
          </span>
          CầuLông<span style={{ color: 'var(--lime)' }}>Pro</span>
        </div>
        <Link href="/login" className="btn btn-primary">
          Đăng nhập
        </Link>
      </header>

      <section className="hero">
        <h1>
          Ghép trận, tổ chức sân,
          <br />
          thăng hạng <span className="accent">Elo</span> cùng cộng đồng.
        </h1>
        <p className="sub">
          Nền tảng cầu lông phong trào dành cho người chơi Việt Nam: đặt sân theo phiên, ghép trận 2v2
          rated, quick match qua mã QR, theo dõi thứ hạng và lịch sử Elo của bạn.
        </p>
        <div className="cta-row">
          <Link href="/login" className="btn btn-primary btn-lg">
            Bắt đầu ngay
          </Link>
          <Link href="/app/leaderboard" className="btn btn-lg">
            Xem bảng xếp hạng
          </Link>
        </div>
      </section>

      <section style={{ padding: '30px 0 80px' }}>
        <div className="card">
          <div className="card-title">
            <span className="dot" /> Top 5 — Bảng xếp hạng Elo toàn quốc
          </div>
          {top.length > 0 ? (
            <LeaderboardTable items={top} />
          ) : (
            <p className="muted small">Chưa có dữ liệu xếp hạng.</p>
          )}
        </div>
      </section>
    </div>
  );
}
