/**
 * Calendar maths on plain ISO dates (`YYYY-MM-DD`). ISO strings are timezone-free,
 * serialisable and work directly with <input type="date"> and form posts.
 */

export type ISODate = string;

export interface CalendarDay {
  date: ISODate;
  day: number;
  /** Belongs to the displayed month (false for leading/trailing days). */
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface DateConstraints {
  min?: ISODate;
  max?: ISODate;
  isDateDisabled?: (date: ISODate) => boolean;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function toISODate(date: Date): ISODate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse `YYYY-MM-DD` into a local Date at noon (noon avoids DST edge cases). */
export function parseISODate(value: ISODate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Invalid ISO date: ${value}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

export const isValidISODate = (value: unknown): value is ISODate => {
  if (typeof value !== 'string') return false;
  try {
    return toISODate(parseISODate(value)) === value;
  } catch {
    return false;
  }
};

export const todayISO = (): ISODate => toISODate(new Date());

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Add months, clamping the day (Jan 31 + 1 month → Feb 28/29). */
export function addMonths(date: ISODate, months: number): ISODate {
  const d = parseISODate(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export const compareISO = (a: ISODate, b: ISODate) => (a < b ? -1 : a > b ? 1 : 0);

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 8)}01`;
}

export function startOfWeek(date: ISODate, weekStartsOn = 0): ISODate {
  const d = parseISODate(date);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

/** Locale-aware first day of the week (0 = Sunday), falling back to Sunday. */
export function getWeekStart(locale?: string): number {
  try {
    const info = (new Intl.Locale(locale ?? navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    });
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    return firstDay === undefined ? 0 : firstDay % 7;
  } catch {
    return 0;
  }
}

/** Six full weeks for the month that contains `month` (stable height while paging). */
export function getCalendarWeeks(month: ISODate, options: { weekStartsOn?: number; today?: ISODate } = {}): CalendarDay[][] {
  const { weekStartsOn = 0, today = todayISO() } = options;
  const first = startOfMonth(month);
  const monthKey = first.slice(0, 7);
  let cursor = startOfWeek(first, weekStartsOn);
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = parseISODate(cursor);
      week.push({
        date: cursor,
        day: d.getDate(),
        inMonth: cursor.startsWith(monthKey),
        isToday: cursor === today,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function getWeekdayNames(options: { locale?: string; weekStartsOn?: number; format?: 'narrow' | 'short' | 'long' } = {}) {
  const { locale, weekStartsOn = 0, format = 'short' } = options;
  const short = new Intl.DateTimeFormat(locale, { weekday: format });
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2023, 0, 1 + ((i + weekStartsOn) % 7), 12);
    return { short: short.format(date), long: long.format(date) };
  });
}

export function formatMonthYear(month: ISODate, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(parseISODate(month));
}

export function formatDate(date: ISODate, locale?: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  return new Intl.DateTimeFormat(locale, options).format(parseISODate(date));
}

export function isDateDisabled(date: ISODate, { min, max, isDateDisabled }: DateConstraints = {}): boolean {
  if (min && date < min) return true;
  if (max && date > max) return true;
  return !!isDateDisabled?.(date);
}

/**
 * WAI-ARIA date grid keyboard map. Returns the date that should receive focus,
 * or `null` when the key is not a navigation key.
 */
export function getCalendarKeyTarget(
  key: string,
  focused: ISODate,
  options: { weekStartsOn?: number; shiftKey?: boolean; dir?: 'ltr' | 'rtl' } = {},
): ISODate | null {
  const { weekStartsOn = 0, shiftKey = false, dir = 'ltr' } = options;
  const step = dir === 'rtl' ? -1 : 1;
  switch (key) {
    case 'ArrowRight':
      return addDays(focused, step);
    case 'ArrowLeft':
      return addDays(focused, -step);
    case 'ArrowDown':
      return addDays(focused, 7);
    case 'ArrowUp':
      return addDays(focused, -7);
    case 'Home':
      return startOfWeek(focused, weekStartsOn);
    case 'End':
      return addDays(startOfWeek(focused, weekStartsOn), 6);
    case 'PageUp':
      return addMonths(focused, shiftKey ? -12 : -1);
    case 'PageDown':
      return addMonths(focused, shiftKey ? 12 : 1);
    default:
      return null;
  }
}

/** Nearest enabled date to `date`, searching up to a year in the key's direction. */
export function clampToEnabled(date: ISODate, direction: 1 | -1, constraints: DateConstraints): ISODate | null {
  let cursor = date;
  for (let i = 0; i < 366; i++) {
    if (!isDateDisabled(cursor, constraints)) return cursor;
    cursor = addDays(cursor, direction);
  }
  return null;
}
