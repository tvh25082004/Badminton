'use client';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'badge-gray' },
  READY: { label: 'Sẵn sàng', cls: 'badge-blue' },
  PLAYING: { label: 'Đang đấu', cls: 'badge-lime' },
  PENDING_CONFIRM: { label: 'Chờ xác nhận', cls: 'badge-amber' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'badge-lime' },
  RATED: { label: 'Đã tính Elo', cls: 'badge-lime' },
  DISPUTED: { label: 'Tranh chấp', cls: 'badge-red' },
  PENDING_REVIEW: { label: 'Đang rà soát', cls: 'badge-red' },
  VOIDED: { label: 'Huỷ', cls: 'badge-gray' },
  CANCELLED: { label: 'Đã huỷ', cls: 'badge-gray' },
  COMPLETED: { label: 'Hoàn tất', cls: 'badge-lime' },
  OPEN: { label: 'Đang mở', cls: 'badge-blue' },
  IN_PROGRESS: { label: 'Đang diễn ra', cls: 'badge-lime' },
  FULL: { label: 'Đủ người', cls: 'badge-amber' },
  ACTIVE: { label: 'Hoạt động', cls: 'badge-lime' },
  SUSPENDED: { label: 'Tạm khoá', cls: 'badge-red' },
  ESTABLISHED: { label: 'Vững vàng', cls: 'badge-lime' },
  PROVISIONAL: { label: 'Tạm thời', cls: 'badge-amber' },
  UNDER_REVIEW: { label: 'Đang rà soát', cls: 'badge-red' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'badge-gray' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function FormatLabel(format?: string | null) {
  switch (format) {
    case 'BEST_OF_3':
      return 'Bo3';
    case 'SINGLE_GAME_21':
      return '1 ván 21';
    case 'CUSTOM':
      return 'Tự do';
    default:
      return format ?? '—';
  }
}

export function ModeLabel(mode?: string | null) {
  return mode === 'RATED' ? 'Rated' : mode === 'UNRATED' ? 'Giao hữu' : mode ?? '—';
}
