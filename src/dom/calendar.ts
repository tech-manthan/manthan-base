import { ChevronLeft, ChevronRight, createIcon } from '@manthan/icons';
import {
  addMonths,
  clampToEnabled,
  compareISO,
  formatDate,
  formatMonthYear,
  getCalendarKeyTarget,
  getCalendarWeeks,
  getWeekdayNames,
  getWeekStart,
  isDateDisabled,
  startOfMonth,
  todayISO,
  type DateConstraints,
  type ISODate,
} from '../core/calendar';
import { calendar as calendarRecipe } from '../recipes/advanced';
import { isRtl } from './utils';

export interface CalendarControllerOptions extends DateConstraints {
  value?: ISODate | null;
  locale?: string;
  /** 0 = Sunday … 6 = Saturday. Defaults to the locale's convention. */
  weekStartsOn?: number;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (value: ISODate) => void;
}

export interface CalendarController {
  setValue(value: ISODate | null): void;
  getValue(): ISODate | null;
  focus(): void;
  destroy(): void;
}

/** Plain-DOM calendar (vanilla / Web Components). Framework bindings render their own markup from the same core maths. */
export function createCalendar(root: HTMLElement, options: CalendarControllerOptions = {}): CalendarController {
  const { locale, size, onChange, ...constraints } = options;
  const weekStartsOn = options.weekStartsOn ?? getWeekStart(locale);
  let value = options.value ?? null;
  let focused = value ?? clampToEnabled(todayISO(), 1, constraints) ?? todayISO();
  let month = startOfMonth(focused);
  let shouldFocus = false;
  const s = calendarRecipe({ size });
  const authorClass = root.className;

  const render = () => {
    const weekdays = getWeekdayNames({ locale, weekStartsOn, format: 'narrow' });
    const weeks = getCalendarWeeks(month, { weekStartsOn });
    root.className = s.root(authorClass);
    root.replaceChildren();

    const header = document.createElement('div');
    header.className = s.header();
    const title = document.createElement('div');
    title.className = s.title();
    title.setAttribute('aria-live', 'polite');
    title.textContent = formatMonthYear(month, locale);
    const nav = (label: string, icon: typeof ChevronLeft, delta: number) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = s.nav();
      btn.setAttribute('aria-label', label);
      const target = addMonths(month, delta);
      btn.disabled =
        (delta < 0 && !!constraints.min && compareISO(addMonths(target, 1), startOfMonth(constraints.min)) <= 0) ||
        (delta > 0 && !!constraints.max && compareISO(target, constraints.max) > 0);
      btn.append(createIcon(icon));
      btn.addEventListener('click', () => {
        month = target;
        focused = startOfMonth(month);
        render();
      });
      return btn;
    };
    header.append(nav('Previous month', ChevronLeft, -1), title, nav('Next month', ChevronRight, 1));

    const table = document.createElement('table');
    table.className = s.grid();
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', formatMonthYear(month, locale));
    const thead = table.createTHead().insertRow();
    for (const w of weekdays) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = s.weekday();
      th.abbr = w.long;
      th.textContent = w.short;
      thead.append(th);
    }
    const tbody = table.createTBody();
    for (const week of weeks) {
      const row = tbody.insertRow();
      for (const day of week) {
        const cell = row.insertCell();
        cell.className = s.cell();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = s.day();
        btn.textContent = String(day.day);
        btn.dataset.date = day.date;
        btn.tabIndex = day.date === focused ? 0 : -1;
        btn.setAttribute('aria-label', formatDate(day.date, locale, { dateStyle: 'full' }));
        if (!day.inMonth) btn.dataset.outside = '';
        if (day.isToday) {
          btn.dataset.today = '';
          btn.setAttribute('aria-current', 'date');
        }
        if (day.date === value) {
          btn.dataset.selected = '';
          cell.setAttribute('aria-selected', 'true');
        }
        btn.disabled = isDateDisabled(day.date, constraints);
        cell.append(btn);
      }
    }
    root.append(header, table);
    if (shouldFocus) root.querySelector<HTMLElement>(`[data-date="${focused}"]`)?.focus();
    shouldFocus = false;
  };

  const onClick = (event: MouseEvent) => {
    const btn = (event.target as Element).closest<HTMLButtonElement>('button[data-date]');
    if (!btn || btn.disabled) return;
    value = focused = btn.dataset.date!;
    month = startOfMonth(value);
    render();
    onChange?.(value);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const btn = (event.target as Element).closest<HTMLButtonElement>('button[data-date]');
    if (!btn) return;
    const target = getCalendarKeyTarget(event.key, btn.dataset.date!, {
      weekStartsOn,
      shiftKey: event.shiftKey,
      dir: isRtl(root) ? 'rtl' : 'ltr',
    });
    if (!target) return;
    event.preventDefault();
    const direction = compareISO(target, btn.dataset.date!) >= 0 ? 1 : -1;
    focused = clampToEnabled(target, direction, constraints) ?? focused;
    month = startOfMonth(focused);
    shouldFocus = true;
    render();
  };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  render();

  return {
    setValue(next) {
      value = next;
      if (next) focused = next;
      month = startOfMonth(focused);
      render();
    },
    getValue: () => value,
    focus() {
      root.querySelector<HTMLElement>('button[tabindex="0"]')?.focus();
    },
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
      root.replaceChildren();
    },
  };
}
