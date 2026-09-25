import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Minus, MoreHorizontal, Search, createIcon } from '@manthan/icons';
import { getPaginationItems } from '../core/pagination';
import {
  ariaSort,
  formatCell,
  getSelectionState,
  getTableView,
  nextSort,
  toggleAll,
  toggleId,
  type ColumnDef,
  type SortState,
} from '../core/table';
import { cellAlign, dataTable } from '../recipes/advanced';
import { table as tableRecipe } from '../recipes/display';
import { checkbox, input, inputGroup } from '../recipes/form';
import { pagination } from '../recipes/navigation';

export interface DataTableControllerOptions<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  getRowId?: (row: T, index: number) => string;
  /** 0 shows every row. @default 10 */
  pageSize?: number;
  searchable?: boolean;
  selectable?: boolean;
  caption?: string;
  emptyText?: string;
  striped?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  onSortChange?: (sort: SortState | null) => void;
}

export interface DataTableController<T> {
  setRows(rows: T[]): void;
  getSelection(): string[];
  destroy(): void;
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

/** Plain-DOM data table (vanilla / Web Components). Frameworks render their own markup from the same core. */
export function createDataTable<T>(root: HTMLElement, options: DataTableControllerOptions<T>): DataTableController<T> {
  const { columns, pageSize = 10, searchable = true, selectable = false, caption, emptyText = 'No results.', striped } = options;
  const getRowId = options.getRowId ?? ((row: T, i: number) => String((row as { id?: unknown }).id ?? i));
  let rows = options.rows;
  let sort: SortState | null = null;
  let query = '';
  let page = 1;
  let selected: string[] = [];
  const s = dataTable();
  const t = tableRecipe({ striped });
  const ids = new Map<T, string>();
  const idOf = (row: T) => ids.get(row)!;
  const indexRows = () => {
    ids.clear();
    rows.forEach((row, i) => ids.set(row, getRowId(row, i)));
  };
  indexRows();

  root.className = s.root(root.className);
  const toolbar = h('div', s.toolbar());
  const summary = h('div', s.summary());
  if (searchable) {
    const g = inputGroup();
    const wrap = h('div', g.root(s.search()));
    const icon = h('span', g.start());
    icon.append(createIcon(Search));
    const field = h('input', input({ size: 'sm', withStart: true }));
    field.type = 'search';
    field.placeholder = 'Search…';
    field.setAttribute('aria-label', 'Search table');
    field.addEventListener('input', () => {
      query = field.value;
      page = 1;
      render();
    });
    wrap.append(icon, field);
    toolbar.append(wrap);
  }
  toolbar.append(summary);
  const tableWrap = h('div', t.root());
  const footer = h('div', s.footer());
  root.replaceChildren(toolbar, tableWrap, footer);

  const makeCheckbox = (label: string, state: 'all' | 'some' | 'none' | boolean, onToggle: () => void) => {
    const c = checkbox({ size: 'sm' });
    const wrapper = h('span', c.root());
    const box = h('input', c.input());
    box.type = 'checkbox';
    box.setAttribute('aria-label', label);
    box.checked = state === true || state === 'all';
    box.indeterminate = state === 'some';
    box.addEventListener('change', onToggle);
    const control = h('span', c.control());
    control.append(createIcon(Check, { class: c.check(), strokeWidth: 3 }), createIcon(Minus, { class: c.minus(), strokeWidth: 3 }));
    wrapper.append(box, control);
    return wrapper;
  };

  const render = () => {
    const view = getTableView(rows, { columns, sort, query, page, pageSize });
    page = view.page;
    const visibleIds = view.rows.map(idOf);

    const tableEl = h('table', t.table());
    if (caption) tableEl.append(h('caption', t.caption(), caption));
    const thead = h('thead', t.header());
    const headRow = h('tr', t.row());
    if (selectable) {
      const th = h('th', t.head(s.selectCell()));
      th.append(
        makeCheckbox('Select all rows on this page', getSelectionState(visibleIds, selected), () => {
          selected = toggleAll(selected, visibleIds);
          options.onSelectionChange?.(selected);
          render();
        }),
      );
      headRow.append(th);
    }
    for (const col of columns) {
      const th = h('th', t.head(cellAlign[col.align ?? 'start']));
      th.scope = 'col';
      if (col.width) th.style.width = col.width;
      th.setAttribute('aria-sort', ariaSort(sort, col.key));
      if (col.sortable === false) th.textContent = col.header;
      else {
        const btn = h('button', s.sortButton(), col.header);
        btn.type = 'button';
        const active = sort?.key === col.key;
        const icon = createIcon(active ? (sort!.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown, { class: s.sortIcon() });
        if (active) icon.setAttribute('data-active', '');
        btn.append(icon);
        btn.addEventListener('click', () => {
          sort = nextSort(sort, col.key);
          options.onSortChange?.(sort);
          render();
          root.querySelector<HTMLElement>(`th:nth-child(${Array.from(headRow.children).indexOf(th) + 1}) button`)?.focus();
        });
        th.append(btn);
      }
      headRow.append(th);
    }
    thead.append(headRow);

    const tbody = h('tbody', t.body());
    if (!view.rows.length) {
      const tr = h('tr');
      const td = h('td', s.empty(), emptyText);
      td.colSpan = columns.length + (selectable ? 1 : 0);
      tr.append(td);
      tbody.append(tr);
    }
    for (const row of view.rows) {
      const id = idOf(row);
      const tr = h('tr', t.row());
      if (selectable) {
        tr.setAttribute('aria-selected', String(selected.includes(id)));
        const td = h('td', t.cell(s.selectCell()));
        td.append(
          makeCheckbox(`Select row ${id}`, selected.includes(id), () => {
            selected = toggleId(selected, id);
            options.onSelectionChange?.(selected);
            render();
          }),
        );
        tr.append(td);
      }
      for (const col of columns) tr.append(h('td', t.cell(cellAlign[col.align ?? 'start']), formatCell(row, col)));
      tbody.append(tr);
    }
    tableEl.append(thead, tbody);
    tableWrap.replaceChildren(tableEl);

    summary.textContent = selectable && selected.length ? `${selected.length} of ${rows.length} selected` : `${view.total} ${view.total === 1 ? 'row' : 'rows'}`;

    footer.replaceChildren();
    footer.append(h('span', 'tabular-nums', view.total ? `${view.start}–${view.end} of ${view.total}` : '0 results'));
    if (view.pageCount > 1) {
      const p = pagination({ size: 'sm' });
      const nav = h('nav', p.root());
      nav.setAttribute('aria-label', 'Table pages');
      const list = h('ul', p.list());
      const pageButton = (target: number, content: Node | string, label: string, current = false, disabled = false) => {
        const li = h('li');
        const btn = h('button', p.item());
        btn.type = 'button';
        btn.disabled = disabled;
        btn.setAttribute('aria-label', label);
        if (current) btn.setAttribute('aria-current', 'page');
        btn.append(content);
        btn.addEventListener('click', () => {
          page = target;
          render();
          footer.querySelector<HTMLElement>('[aria-current=page]')?.focus();
        });
        li.append(btn);
        return li;
      };
      list.append(pageButton(page - 1, createIcon(ChevronLeft), 'Previous page', false, page <= 1));
      for (const item of getPaginationItems({ page, total: view.pageCount })) {
        if (typeof item === 'number') list.append(pageButton(item, String(item), `Page ${item}`, item === page));
        else {
          const li = h('li', p.ellipsis());
          li.setAttribute('aria-hidden', 'true');
          li.append(createIcon(MoreHorizontal, { size: 16 }));
          list.append(li);
        }
      }
      list.append(pageButton(page + 1, createIcon(ChevronRight), 'Next page', false, page >= view.pageCount));
      nav.append(list);
      footer.append(nav);
    }
  };
  render();

  return {
    setRows(next) {
      rows = next;
      indexRows();
      selected = selected.filter((id) => rows.some((r) => idOf(r) === id));
      render();
    },
    getSelection: () => selected,
    destroy: () => root.replaceChildren(),
  };
}
