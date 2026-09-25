/**
 * Headless data-table maths (sorting, searching, paging, selection), shared by
 * every DataTable binding. Pure functions: no DOM, no framework.
 */

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface ColumnDef<T = Record<string, unknown>> {
  /** Unique key; also the property read from each row when there is no `accessor`. */
  key: string;
  header: string;
  accessor?: (row: T) => unknown;
  /** @default true */
  sortable?: boolean;
  /** Custom comparison for sorting (ascending). */
  compare?: (a: unknown, b: unknown) => number;
  /** Text shown in the cell (and matched by search). Defaults to String(value). */
  format?: (value: unknown, row: T) => string;
  align?: 'start' | 'center' | 'end';
  /** Include in global search. @default true */
  searchable?: boolean;
  /** CSS width, e.g. `'8rem'`. */
  width?: string;
}

export const getCellValue = <T>(row: T, column: ColumnDef<T>): unknown =>
  column.accessor ? column.accessor(row) : (row as Record<string, unknown>)[column.key];

export const formatCell = <T>(row: T, column: ColumnDef<T>): string => {
  const value = getCellValue(row, column);
  if (column.format) return column.format(value, row);
  return value == null ? '' : value instanceof Date ? value.toLocaleDateString() : String(value);
};

/** Header click cycles: unsorted → ascending → descending → unsorted. */
export function nextSort(current: SortState | null, key: string): SortState | null {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  return current.direction === 'asc' ? { key, direction: 'desc' } : null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function compareValues(a: unknown, b: unknown): number {
  if (a == null || a === '') return b == null || b === '' ? 0 : 1; // empties last
  if (b == null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

/** Stable sort; empty values always sort last regardless of direction. */
export function sortRows<T>(rows: readonly T[], columns: readonly ColumnDef<T>[], sort: SortState | null): T[] {
  if (!sort) return [...rows];
  const column = columns.find((c) => c.key === sort.key);
  if (!column) return [...rows];
  const cmp = column.compare ?? compareValues;
  const sign = sort.direction === 'asc' ? 1 : -1;
  const isEmpty = (v: unknown) => v == null || v === '';
  return rows
    .map((row, index) => ({ row, index, value: getCellValue(row, column) }))
    .sort((a, b) => {
      if (isEmpty(a.value) !== isEmpty(b.value)) return isEmpty(a.value) ? 1 : -1;
      return sign * cmp(a.value, b.value) || a.index - b.index;
    })
    .map((x) => x.row);
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Rows where every whitespace-separated term appears in some searchable cell. */
export function searchRows<T>(rows: readonly T[], columns: readonly ColumnDef<T>[], query: string): T[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...rows];
  const searchable = columns.filter((c) => c.searchable !== false);
  return rows.filter((row) => {
    const haystack = fold(searchable.map((c) => formatCell(row, c)).join(' \u0000 '));
    return terms.every((t) => haystack.includes(t));
  });
}

export interface PageResult<T> {
  rows: T[];
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first row on the page (0 when empty). */
  start: number;
  end: number;
}

export function paginateRows<T>(rows: readonly T[], page: number, pageSize: number): PageResult<T> {
  const total = rows.length;
  if (!pageSize || pageSize <= 0) return { rows: [...rows], page: 1, pageCount: 1, total, start: total ? 1 : 0, end: total };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const offset = (current - 1) * pageSize;
  const slice = rows.slice(offset, offset + pageSize);
  return { rows: slice, page: current, pageCount, total, start: slice.length ? offset + 1 : 0, end: offset + slice.length };
}

export interface TableViewOptions<T> {
  columns: readonly ColumnDef<T>[];
  sort?: SortState | null;
  query?: string;
  page?: number;
  /** 0 shows every row. @default 10 */
  pageSize?: number;
}

/** search → sort → paginate in one call. */
export function getTableView<T>(rows: readonly T[], options: TableViewOptions<T>) {
  const { columns, sort = null, query = '', page = 1, pageSize = 10 } = options;
  const filtered = searchRows(rows, columns, query);
  const sorted = sortRows(filtered, columns, sort);
  return { ...paginateRows(sorted, page, pageSize), filtered: sorted };
}

/** Header checkbox state for the rows currently shown. */
export function getSelectionState(visibleIds: readonly string[], selected: ReadonlySet<string> | readonly string[]): 'all' | 'some' | 'none' {
  const set = selected instanceof Set ? selected : new Set(selected);
  const count = visibleIds.filter((id) => set.has(id)).length;
  return count === 0 ? 'none' : count === visibleIds.length ? 'all' : 'some';
}

export function toggleId(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

/** Select every visible row, or clear them when all are already selected. */
export function toggleAll(selected: readonly string[], visibleIds: readonly string[]): string[] {
  const state = getSelectionState(visibleIds, selected);
  if (state === 'all') return selected.filter((id) => !visibleIds.includes(id));
  return [...new Set([...selected, ...visibleIds])];
}

/** `aria-sort` value for a header cell. */
export const ariaSort = (sort: SortState | null, key: string): 'ascending' | 'descending' | 'none' =>
  sort?.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
