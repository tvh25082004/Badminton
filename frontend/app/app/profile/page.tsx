'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { RatingProfile, RatingTxn, UserMe } from '@/lib/types';

export default function ProfilePage() {
  const [me, setMe] = useState<UserMe | null>(null);
  const [rating, setRating] = useState<RatingProfile | null>(null);
  const [history, setHistory] = useState<RatingTxn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', region: '' });

  useEffect(() => {
    Promise.all([
      api<UserMe>('/users/me').catch(() => null),
      api<RatingProfile | null>('/ratings/me').catch(() => null),
      api<{ items: RatingTxn[] }>('/ratings/history?page=1&limit=10').catch(() => ({ items: [] })),
    ])
      .then(([u, r, h]) => {
        setMe(u);
        setRating(r);
        setHistory(h.items);
        if (u?.profile) {
          setForm({ displayName: u.profile.displayName ?? '', region: u.profile.region ?? '' });
        }
      })
      .catch(() => setError('Không tải được hồ sơ.'));
  }, []);

  const saveProfile = async () => {
    setError(null);
    try {
      const res = await api<UserMe>('/players/me', {
        method: 'PATCH',
        body: { displayName: form.displayName, region: form.region },
      });
      setMe(res);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Hồ sơ & Elo</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Thông tin người chơi và lịch sử thay đổi Elo.</p>

      {error && <div className="error-box">{error}</div>}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">
            <span className="dot" /> Hồ sơ
          </div>
          {editing ? (
            <>
              <div className="field">
                <label>Tên hiển thị</label>
                <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div className="field">
                <label>Khu vực chơi</label>
                <input className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Quận 7, TP.HCM" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={saveProfile}>Lưu</button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>Huỷ</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 19, fontWeight: 800 }}>{me?.profile?.displayName ?? me?.displayName ?? me?.phone}</div>
              <div className="muted small">
                {me?.phone} · {me?.role === 'ADMIN' ? 'Quản trị' : 'Người chơi'}
              </div>
              <div className="faint small" style={{ marginTop: 6 }}>
                {me?.profile?.region ?? 'Chưa cập nhật khu vực'} ·{' '}
                {me?.profile?.handedness === 'left' ? 'Tay trái' : me?.profile?.handedness === 'right' ? 'Tay phải' : '—'}
              </div>
              <button className="btn btn-ghost small" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>
                ✏ Chỉnh sửa hồ sơ
              </button>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <span className="dot" /> Elo & trình độ
          </div>
          {rating ? (
            <>
              <div className="rating-num" style={{ fontSize: 40, color: 'var(--lime-soft)' }}>
                {rating.rating}
              </div>
              <div className="muted small">
                <span className="badge badge-lime">{rating.ratingState === 'ESTABLISHED' ? 'Vững vàng' : 'Tạm thời'}</span>{' '}
                {rating.ratedMatches} trận rated · {rating.uniqueOpponents} đối thủ
              </div>
              <div className="faint small" style={{ marginTop: 8 }}>
                Độ lệch {rating.ratingDeviation} · {rating.confidence === 'established' ? 'Đã đủ dữ liệu' : 'Cần thêm trận để chính thức'}
              </div>
            </>
          ) : (
            <p className="muted small">
              Chưa có rating. Hoàn thành <a href="/app/assess">bài tự đánh giá</a> để nhận Elo khởi điểm.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span className="dot" /> Lịch sử Elo
        </div>
        {history.length === 0 ? (
          <p className="muted small">Chưa có giao dịch rating nào.</p>
        ) : (
          <div className="list">
            {history.map((t) => (
              <div className="list-item" key={t.id}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {t.type === 'MATCH_RESULT' ? 'Kết quả trận đấu' : t.type === 'REVERSAL' ? 'Hoàn nguyên' : t.type}
                  </div>
                  <div className="faint small">{new Date(t.createdAt).toLocaleString('vi-VN')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`rating-num ${t.delta >= 0 ? 'rating-up' : 'rating-down'}`}>
                    {t.delta >= 0 ? '+' : ''}
                    {t.delta}
                  </div>
                  <div className="faint small">
                    {t.ratingBefore} → {t.ratingAfter}
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
