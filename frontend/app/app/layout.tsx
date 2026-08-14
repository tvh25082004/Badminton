'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, clearTokens, getTokens } from '@/lib/api';
import type { UserMe } from '@/lib/types';

const NAV = [
  { href: '/app', label: 'Tổng quan', icon: '🏠' },
  { href: '/app/leaderboard', label: 'Bảng xếp hạng', icon: '🏆' },
  { href: '/app/sessions', label: 'Phiên chơi', icon: '⏱️' },
  { href: '/app/matches', label: 'Trận đấu', icon: '🏸' },
  { href: '/app/assess', label: 'Tự đánh giá', icon: '📋' },
  { href: '/app/notifications', label: 'Thông báo', icon: '🔔' },
  { href: '/app/profile', label: 'Hồ sơ & Elo', icon: '👤' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<UserMe | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getTokens()) {
      router.replace('/login');
      return;
    }
    api<UserMe>('/users/me')
      .then(setMe)
      .catch(() => {
        clearTokens();
        router.replace('/login');
      })
      .finally(() => setChecked(true));
  }, [router]);

  if (!checked) {
    return (
      <div className="container" style={{ paddingTop: 80 }}>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  const logout = () => {
    clearTokens();
    router.replace('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          borderRight: '1px solid var(--line)',
          padding: '22px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          position: 'sticky',
          top: 0,
          height: '100vh',
          background: 'var(--bg-soft)',
          zIndex: 2,
        }}
      >
        <Link href="/" style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', padding: '0 8px 16px' }}>
          🏸 CầuLông<span style={{ color: 'var(--lime)' }}>Pro</span>
        </Link>
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== '/app' && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 9,
                color: active ? 'var(--lime-soft)' : 'var(--text-dim)',
                background: active ? 'var(--lime-dim)' : 'transparent',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
              }}
            >
              <span>{n.icon}</span> {n.label}
            </Link>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me?.profile?.displayName ?? me?.displayName ?? me?.phone}
          </div>
          <div className="faint small">{me?.phone}</div>
          <button className="btn btn-ghost btn-block small" style={{ marginTop: 10 }} onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: 960, position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
