import { describe, expect, it } from 'vitest';
import { ariaSort, getSelectionState, getTableView, nextSort, paginateRows, searchRows, sortRows, toggleAll, toggleId, type ColumnDef } from '../src/index';

interface Row {
  id: string;
  name: string;
  city: string;
  amount: number | null;
}
const rows: Row[] = [
  { id: '1', name: 'Zoë', city: 'Zürich', amount: 250 },
  { id: '2', name: 'alan', city: 'London', amount: 1200 },
  { id: '3', name: 'Bob', city: 'Berlin', amount: null },
  { id: '4', name: 'item 10', city: 'Paris', amount: 90 },
  { id: '5', name: 'item 9', city: 'Paris', amount: 90 },
];
const columns: ColumnDef<Row>[] = [
  { key: 'name', header: 'Name' },
  { key: 'city', header: 'City' },
  { key: 'amount', header: 'Amount', format: (v) => (v == null ? '—' : `$${v}`) },
];

describe('table core', () => {
  it('cycles sort state', () => {
    expect(nextSort(null, 'a')).toEqual({ key: 'a', direction: 'asc' });
    expect(nextSort({ key: 'a', direction: 'asc' }, 'a')).toEqual({ key: 'a', direction: 'desc' });
    expect(nextSort({ key: 'a', direction: 'desc' }, 'a')).toBeNull();
    expect(nextSort({ key: 'a', direction: 'desc' }, 'b')).toEqual({ key: 'b', direction: 'asc' });
    expect(ariaSort({ key: 'a', direction: 'desc' }, 'a')).toBe('descending');
  });

  it('sorts naturally, case-insensitively and stably, with empties last', () => {
    expect(sortRows(rows, columns, { key: 'name', direction: 'asc' }).map((r) => r.id)).toEqual(['2', '3', '5', '4', '1']);
    expect(sortRows(rows, columns, { key: 'amount', direction: 'asc' }).map((r) => r.id)).toEqual(['4', '5', '1', '2', '3']);
    expect(sortRows(rows, columns, { key: 'amount', direction: 'desc' }).map((r) => r.id)).toEqual(['2', '1', '4', '5', '3']);
  });

  it('searches formatted, accent-folded text with every term required', () => {
    expect(searchRows(rows, columns, 'zurich').map((r) => r.id)).toEqual(['1']);
    expect(searchRows(rows, columns, 'item paris').map((r) => r.id)).toEqual(['4', '5']);
    expect(searchRows(rows, columns, 'item 9').map((r) => r.id)).toEqual(['4', '5']); // '9' also matches $90
    expect(searchRows(rows, columns, '$1200').map((r) => r.id)).toEqual(['2']);
  });

  it('paginates and clamps the page', () => {
    expect(paginateRows(rows, 2, 2)).toMatchObject({ page: 2, pageCount: 3, start: 3, end: 4, total: 5 });
    expect(paginateRows(rows, 9, 2)).toMatchObject({ page: 3, start: 5, end: 5 });
    expect(paginateRows([], 1, 10)).toMatchObject({ page: 1, pageCount: 1, start: 0, end: 0 });
    expect(paginateRows(rows, 1, 0).rows).toHaveLength(5);
  });

  it('composes search, sort and paging', () => {
    const view = getTableView(rows, { columns, query: 'paris', sort: { key: 'name', direction: 'desc' }, pageSize: 1 });
    expect(view.rows.map((r) => r.id)).toEqual(['4']);
    expect(view.pageCount).toBe(2);
  });

  it('tracks selection', () => {
    expect(getSelectionState(['1', '2'], ['1'])).toBe('some');
    expect(toggleId(['1'], '2')).toEqual(['1', '2']);
    expect(toggleAll(['9'], ['1', '2'])).toEqual(['9', '1', '2']);
    expect(toggleAll(['1', '2', '9'], ['1', '2'])).toEqual(['9']);
  });
});
