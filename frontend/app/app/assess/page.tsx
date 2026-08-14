'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ASSESSMENT_QUESTIONS, ASSESSMENT_SCHEMA_VERSION } from '@/lib/assessment';
import type { RatingProfile } from '@/lib/types';

export default function AssessPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<RatingProfile | null>(null);

  useEffect(() => {
    api<RatingProfile | null>('/ratings/me')
      .then((r) => setExisting(r))
      .catch(() => setExisting(null));
  }, []);

  const answered = Object.keys(answers).filter((k) => answers[k]).length;

  const submit = async () => {
    if (answered < ASSESSMENT_QUESTIONS.length) {
      setError('Vui lòng trả lời đủ 10 câu hỏi.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api<{ band?: string; rating?: number; selfLevel?: string }>(
        '/ratings/self-assessment',
        {
          method: 'POST',
          body: {
            schemaVersion: ASSESSMENT_SCHEMA_VERSION,
            answers: ASSESSMENT_QUESTIONS.map((q) => ({ questionId: q.id, value: answers[q.id] })),
          },
        },
      );
      setSuccess(
        `Hoàn tất! Band ${res.band ?? ''} — Elo khởi điểm ${res.rating ?? ''}. Bạn có thể xem chi tiết ở trang Hồ sơ.`,
      );
      api<RatingProfile | null>('/ratings/me').then(setExisting).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi thất bại.');
    } finally {
      setBusy(false);
    }
  };

  if (existing) {
    // Có rating profile = đã hoàn thành bài tự đánh giá → không cho làm lại.
    return (
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Tự đánh giá</h1>
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title">
            <span className="dot" /> Bạn đã hoàn thành bài tự đánh giá
          </div>
          <p className="muted">
            Elo khởi điểm của bạn là{' '}
            <span className="rating-num" style={{ color: 'var(--lime-soft)', fontSize: 22 }}>
              {existing.rating}
            </span>
            . Mỗi người chỉ được làm bài này một lần.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Tự đánh giá trình độ</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Trả lời 10 câu hỏi để xác định Elo khởi điểm. Chỉ làm một lần — hãy trả lời trung thực nhất có thể.
      </p>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ASSESSMENT_QUESTIONS.map((q, idx) => (
          <div className="card" key={q.id} style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              <span className="faint" style={{ marginRight: 8 }}>
                {idx + 1}.
              </span>
              {q.label}
            </div>
            {q.hint && <div className="faint small" style={{ marginBottom: 8 }}>{q.hint}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map((opt) => {
                const active = answers[q.id] === opt.value;
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 9,
                      border: `1px solid ${active ? 'var(--lime)' : 'var(--line)'}`,
                      background: active ? 'var(--lime-dim)' : 'var(--bg-soft)',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.value}
                      checked={active}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={busy}>
          {busy ? <span className="spin" /> : 'Gửi bài tự đánh giá'}
        </button>
        <span className="faint small">
          Đã trả lời {answered}/{ASSESSMENT_QUESTIONS.length}
        </span>
      </div>
    </div>
  );
}
