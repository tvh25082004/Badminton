'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Match } from '@/lib/types';
import { StatusBadge, FormatLabel, ModeLabel } from '@/components/Badges';

function TeamCard({ team, players, label }: { team: string; players: Match['players']; label: string }) {
  const members = players.filter((p) => p.team === team);
  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-title">
        <span className="dot" /> Đội {label}
      </div>
      {members.length === 0 ? (
        <p className="muted small">Chưa đủ người.</p>
      ) : (
        members.map((p) => (
          <div key={p.userId} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{p.displayName ?? 'Người chơi'}</span>
              {p.rosterConfirmed && <span className="badge badge-lime">Đã xác nhận</span>}
            </div>
            <div className="faint small">{p.rating != null ? `Elo ${p.rating}` : 'Chưa có Elo'}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState({ a: '', b: '' });
  const [disputeReason, setDisputeReason] = useState('');

  const load = () => {
    api<Match>(`/matches/${id}`)
      .then(setMatch)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi'));
  };

  useEffect(load, [id]);

  const act = async (path: string, method = 'POST', body?: unknown, okMsg?: string) => {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method, body });
      if (okMsg) alert(okMsg);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  if (!match) {
    return (
      <div>
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  const isCreator = match.creatorId === match.players[0]?.userId;
  const score = match.latestResult?.scores;

  return (
    <div>
      <Link href="/app/matches" className="small muted" style={{ display: 'inline-block', marginBottom: 10 }}>
        ← Trận của tôi
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {match.matchType === 'QUICK' ? '⚡ Quick Rated Match' : '🏸 Trận đấu 2v2'}
        </h1>
        <StatusBadge status={match.status} />
      </div>
      <p className="muted small" style={{ marginBottom: 20 }}>
        {FormatLabel(match.format)} · {ModeLabel(match.mode)}
        {match.scheduledAt ? ` · ${new Date(match.scheduledAt).toLocaleString('vi-VN')}` : ''}
      </p>

      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <TeamCard team="A" players={match.players} label="A" />
        <TeamCard team="B" players={match.players} label="B" />
      </div>

      {score && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">
            <span className="dot" /> Tỷ số
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>
            {score.teamA.join('-')} <span className="muted">:</span> {score.teamB.join('-')}
          </div>
          <div className="faint small">
            Đội {score.teamA[0] > score.teamB[0] ? 'A' : 'B'} thắng
            {match.latestResult?.confirmedByCount != null
              ? ` · ${match.latestResult.confirmedByCount}/4 xác nhận`
              : ''}
          </div>
        </div>
      )}

      {match.openDispute && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(255,107,107,0.4)' }}>
          <div className="card-title" style={{ color: 'var(--red)' }}>
            <span className="dot" style={{ background: 'var(--red)' }} /> Tranh chấp đang mở
          </div>
          <p className="small">{match.openDispute.reason ?? 'Người chơi phản đối kết quả.'}</p>
          <p className="faint small">Quản trị viên sẽ rà soát và xử lý.</p>
        </div>
      )}

      {/* Actions theo trạng thái */}
      {match.status === 'DRAFT' && (
        <div className="card">
          <div className="card-title">
            <span className="dot" /> Xác nhận đội hình
          </div>
          <p className="muted small" style={{ marginBottom: 14 }}>
            Mỗi người chơi cần xác nhận roster. Đủ 4 người → trận chuyển sang sẵn sàng.
          </p>
          <button className="btn btn-primary" disabled={busy} onClick={() => act(`/matches/${id}/roster-confirm`, 'POST', undefined, 'Đã xác nhận roster')}>
            {busy ? <span className="spin" /> : 'Xác nhận roster của tôi'}
          </button>
        </div>
      )}

      {match.status === 'READY' && (
        <div className="card">
          <div className="card-title">
            <span className="dot" /> Sẵn sàng
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" disabled={busy} onClick={() => act(`/matches/${id}/check-in`, 'POST', {}, 'Check-in thành công')}>
              {busy ? <span className="spin" /> : '📍 Check-in tại sân'}
            </button>
            {isCreator && (
              <button className="btn btn-primary" disabled={busy} onClick={() => act(`/matches/${id}/start`, 'POST', undefined, 'Trận bắt đầu!')}>
                {busy ? <span className="spin" /> : '▶ Bắt đầu trận'}
              </button>
            )}
          </div>
        </div>
      )}

      {match.status === 'PLAYING' && (
        <div className="card">
          <div className="card-title">
            <span className="dot" /> Nhập tỷ số
          </div>
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Điểm đội A</label>
              <input className="input mono" inputMode="numeric" value={scores.a} onChange={(e) => setScores({ ...scores, a: e.target.value })} placeholder="21" />
            </div>
            <div className="field">
              <label>Điểm đội B</label>
              <input className="input mono" inputMode="numeric" value={scores.b} onChange={(e) => setScores({ ...scores, b: e.target.value })} placeholder="18" />
            </div>
          </div>
          <button
            className="btn btn-primary"
            disabled={busy || !scores.a || !scores.b}
            onClick={() => act(`/matches/${id}/result`, 'POST', { scores: { teamA: [Number(scores.a)], teamB: [Number(scores.b)] } }, 'Đã gửi kết quả, chờ xác nhận')}
          >
            {busy ? <span className="spin" /> : 'Gửi kết quả'}
          </button>
        </div>
      )}

      {match.status === 'PENDING_CONFIRM' && (
        <div className="card" style={{ borderColor: 'rgba(255,180,84,0.35)' }}>
          <div className="card-title">
            <span className="dot" style={{ background: 'var(--amber)' }} /> Xác nhận kết quả
          </div>
          <p className="muted small" style={{ marginBottom: 14 }}>
            Cần tối thiểu 3/4 người chơi đồng ý và ít nhất 1 đại diện phía đối thủ để tính Elo.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy} onClick={() => act(`/matches/${id}/confirm`, 'POST', { decision: 'CONFIRM' })}>
              {busy ? <span className="spin" /> : '✅ Đồng ý kết quả'}
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => act(`/matches/${id}/confirm`, 'POST', { decision: 'DISPUTE', reason: disputeReason || 'Kết quả không đúng' }, 'Đã mở tranh chấp')}>
              {busy ? <span className="spin" /> : '⚠ Phản đối'}
            </button>
          </div>
          {match.players.length === 0 ? null : (
            <div style={{ marginTop: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="small">Lý do phản đối (nếu có)</label>
                <input className="input" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Tỷ số bị nhập sai…" />
              </div>
            </div>
          )}
        </div>
      )}

      {(match.status === 'RATED' || match.status === 'DISPUTED' || match.status === 'PENDING_REVIEW' || match.status === 'VOIDED') && (
        <div className="card">
          <div className="card-title">
            <span className="dot" /> Trạng thái trận
          </div>
          <p className="muted small">
            {match.status === 'RATED' && 'Trận đã hoàn tất và Elo đã được cập nhật cho cả 4 người chơi.'}
            {match.status === 'DISPUTED' && 'Trận đang chờ quản trị viên xử lý tranh chấp.'}
            {match.status === 'PENDING_REVIEW' && 'Trận đang được hệ thống rà soát (anti-fraud).'}
            {match.status === 'VOIDED' && 'Trận đã bị huỷ, Elo được hoàn nguyên.'}
          </p>
        </div>
      )}
    </div>
  );
}
