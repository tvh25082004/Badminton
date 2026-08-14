'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';

interface Venue {
  id: string;
  name: string;
  address?: string | null;
}

export function CreateSessionForm({ onCreated }: { onCreated: () => void }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: '',
    venueId: '',
    startAt: '',
    endAt: '',
    courtCount: 1,
    maxParticipants: 8,
    format: 'RECREATIONAL',
    totalCost: 200000,
    costSplitMode: 'EQUAL',
    minRating: '',
    maxRating: '',
  });

  useEffect(() => {
    api<{ items: Venue[] }>('/venues')
      .then((d) => setVenues(d.items))
      .catch(() => setVenues([]));
  }, []);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề phiên.');
      return;
    }
    if (!form.startAt || !form.endAt) {
      setError('Vui lòng chọn thời gian bắt đầu và kết thúc.');
      return;
    }
    setBusy(true);
    try {
      await api<Session>('/sessions', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          venueId: form.venueId || undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          courtCount: Number(form.courtCount),
          minParticipants: 2,
          maxParticipants: Number(form.maxParticipants),
          minRating: form.minRating ? Number(form.minRating) : undefined,
          maxRating: form.maxRating ? Number(form.maxRating) : undefined,
          format: form.format,
          totalCost: Number(form.totalCost),
          costSplitMode: form.costSplitMode,
          costBreakdown: { 'Thuê sân': Number(form.totalCost) },
        },
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo phiên thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="grid-2">
        <div className="field">
          <label>Tiêu đề</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Cầu lông tối thứ 3 — Q7" />
        </div>
        <div className="field">
          <label>Sân (tuỳ chọn)</label>
          <select className="input" value={form.venueId} onChange={(e) => set('venueId', e.target.value)}>
            <option value="">Chưa chọn sân</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Bắt đầu</label>
          <input type="datetime-local" className="input" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} />
        </div>
        <div className="field">
          <label>Kết thúc</label>
          <input type="datetime-local" className="input" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} />
        </div>
        <div className="field">
          <label>Hình thức</label>
          <select className="input" value={form.format} onChange={(e) => set('format', e.target.value)}>
            <option value="RECREATIONAL">Giao lưu</option>
            <option value="PRACTICE">Luyện tập</option>
            <option value="RATED">Rated</option>
          </select>
        </div>
        <div className="field">
          <label>Tối đa người chơi</label>
          <input type="number" className="input" value={form.maxParticipants} onChange={(e) => set('maxParticipants', e.target.value)} />
        </div>
        <div className="field">
          <label>Số sân</label>
          <input type="number" className="input" min={1} value={form.courtCount} onChange={(e) => set('courtCount', e.target.value)} />
        </div>
        <div className="field">
          <label>Chi phí dự kiến (VNĐ)</label>
          <input type="number" className="input" value={form.totalCost} onChange={(e) => set('totalCost', e.target.value)} />
        </div>
        <div className="field">
          <label>Rating tối thiểu</label>
          <input type="number" className="input" placeholder="0" value={form.minRating} onChange={(e) => set('minRating', e.target.value)} />
        </div>
        <div className="field">
          <label>Rating tối đa</label>
          <input type="number" className="input" placeholder="1600" value={form.maxRating} onChange={(e) => set('maxRating', e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary btn-lg" onClick={submit} disabled={busy}>
        {busy ? <span className="spin" /> : 'Tạo phiên'}
      </button>
    </div>
  );
}
