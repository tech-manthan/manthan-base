/** `1536` → `"1.5 KB"`. */
export function formatBytes(bytes: number, locale?: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: i && n < 10 ? 1 : 0 }).format(n)} ${units[i]}`;
}

/** Same rules as `<input accept>`: extensions (`.pdf`), exact types (`image/png`) and wildcards (`image/*`). */
export function matchesAccept(file: { name: string; type: string }, accept?: string): boolean {
  if (!accept?.trim()) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return accept
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .some((a) => (a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? type.startsWith(a.slice(0, -1)) : type === a));
}

export interface FileRules {
  accept?: string;
  /** Bytes. */
  maxSize?: number;
  /** Total files allowed, counting `existing`. */
  maxFiles?: number;
  /** Files already chosen. @default 0 */
  existing?: number;
}

export interface FileRejection<F> {
  file: F;
  reason: 'type' | 'size' | 'count';
  message: string;
}

/** Split files into accepted ones and rejections with human-readable reasons. */
export function validateFiles<F extends { name: string; type: string; size: number }>(files: Iterable<F>, rules: FileRules = {}) {
  const { accept, maxSize, maxFiles, existing = 0 } = rules;
  const accepted: F[] = [];
  const rejected: FileRejection<F>[] = [];
  for (const file of files) {
    if (!matchesAccept(file, accept)) rejected.push({ file, reason: 'type', message: `${file.name}: this file type isn't allowed.` });
    else if (maxSize !== undefined && file.size > maxSize)
      rejected.push({ file, reason: 'size', message: `${file.name} is ${formatBytes(file.size)}; the limit is ${formatBytes(maxSize)}.` });
    else if (maxFiles !== undefined && existing + accepted.length >= maxFiles)
      rejected.push({ file, reason: 'count', message: `${file.name}: you can add up to ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'}.` });
    else accepted.push(file);
  }
  return { accepted, rejected };
}
