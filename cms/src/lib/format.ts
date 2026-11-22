export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function formatReadableDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins === 0) return `${rem} 秒`;
  return `${mins} 分 ${rem} 秒`;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '外部资源';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatNumber(n: number): string {
  // 防御后端字段缺失/undefined/NaN：Intl.format(undefined) 会输出 "NaN"
  const safe = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('zh-CN').format(safe);
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
