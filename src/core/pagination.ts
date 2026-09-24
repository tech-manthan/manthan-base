export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

export interface PaginationOptions {
  page: number;
  /** Total number of pages. */
  total: number;
  /** Pages shown on each side of the current page. @default 1 */
  siblings?: number;
  /** Pages always shown at the start and end. @default 1 */
  boundaries?: number;
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/** Page list with ellipses, e.g. `[1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]`. Length is stable while paging. */
export function getPaginationItems({ page, total, siblings = 1, boundaries = 1 }: PaginationOptions): PaginationItem[] {
  if (total <= 0) return [];
  const current = Math.min(Math.max(page, 1), total);
  const slots = siblings * 2 + 3 + boundaries * 2;
  if (total <= slots) return range(1, total);

  const leftSibling = Math.max(current - siblings, boundaries + 1);
  const rightSibling = Math.min(current + siblings, total - boundaries);
  const showLeft = leftSibling > boundaries + 2;
  const showRight = rightSibling < total - boundaries - 1;

  if (!showLeft) {
    const count = siblings * 2 + boundaries + 2;
    return [...range(1, count), 'ellipsis-end', ...range(total - boundaries + 1, total)];
  }
  if (!showRight) {
    const count = siblings * 2 + boundaries + 2;
    return [...range(1, boundaries), 'ellipsis-start', ...range(total - count + 1, total)];
  }
  return [
    ...range(1, boundaries),
    'ellipsis-start',
    ...range(leftSibling, rightSibling),
    'ellipsis-end',
    ...range(total - boundaries + 1, total),
  ];
}
