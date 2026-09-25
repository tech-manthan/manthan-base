import { describe, expect, it, vi } from 'vitest';
import {
  addDays,
  addMonths,
  filterOptions,
  formatHotkey,
  getCalendarKeyTarget,
  getCalendarWeeks,
  getWeekdayNames,
  groupOptions,
  isDateDisabled,
  isValidISODate,
  matchesHotkey,
  clampToEnabled,
  startOfWeek,
} from '../src/index';

describe('calendar maths', () => {
  it('adds days and months across boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-15', -14)).toBe('2025-01-15');
  });

  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('26-2-3')).toBe(false);
  });

  it('builds a stable six-week grid', () => {
    const weeks = getCalendarWeeks('2026-09-15', { weekStartsOn: 1, today: '2026-09-25' });
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]![0]!.date).toBe('2026-08-31'); // Monday before Sep 1 (a Tuesday)
    expect(weeks[0]![1]).toMatchObject({ date: '2026-09-01', inMonth: true, day: 1 });
    expect(weeks.flat().find((d) => d.isToday)?.date).toBe('2026-09-25');
  });

  it('respects the week start', () => {
    expect(startOfWeek('2026-09-25', 0)).toBe('2026-09-20');
    expect(startOfWeek('2026-09-25', 1)).toBe('2026-09-21');
    expect(getWeekdayNames({ locale: 'en-US', weekStartsOn: 1 })[0]!.long).toBe('Monday');
  });

  it('maps keys like the WAI-ARIA date grid', () => {
    expect(getCalendarKeyTarget('ArrowDown', '2026-09-25')).toBe('2026-10-02');
    expect(getCalendarKeyTarget('ArrowLeft', '2026-09-25', { dir: 'rtl' })).toBe('2026-09-26');
    expect(getCalendarKeyTarget('Home', '2026-09-25', { weekStartsOn: 1 })).toBe('2026-09-21');
    expect(getCalendarKeyTarget('End', '2026-09-25', { weekStartsOn: 1 })).toBe('2026-09-27');
    expect(getCalendarKeyTarget('PageDown', '2026-09-25', { shiftKey: true })).toBe('2027-09-25');
    expect(getCalendarKeyTarget('a', '2026-09-25')).toBeNull();
  });

  it('applies min / max / custom constraints', () => {
    const weekends = (d: string) => [0, 6].includes(new Date(`${d}T12:00`).getDay());
    const c = { min: '2026-09-10', max: '2026-09-30', isDateDisabled: weekends };
    expect(isDateDisabled('2026-09-09', c)).toBe(true);
    expect(isDateDisabled('2026-09-26', c)).toBe(true);
    expect(isDateDisabled('2026-09-25', c)).toBe(false);
    expect(clampToEnabled('2026-09-26', 1, c)).toBe('2026-09-28');
  });
});

describe('option filtering', () => {
  const options = [
    { value: 'ts', label: 'TypeScript', keywords: ['tsx'] },
    { value: 'js', label: 'JavaScript', group: 'Web' },
    { value: 'java', label: 'Java' },
    { value: 'cafe', label: 'Café Script' },
  ];
  it('ranks prefix matches above substring and keyword matches', () => {
    expect(filterOptions(options, 'java').map((o) => o.value)).toEqual(['java', 'js']);
    expect(filterOptions(options, 'script').map((o) => o.value)).toEqual(['cafe', 'ts', 'js']);
    expect(filterOptions(options, 'tsx').map((o) => o.value)).toEqual(['ts']);
    expect(filterOptions(options, 'cafe').map((o) => o.value)).toEqual(['cafe']);
    expect(filterOptions(options, '  ')).toHaveLength(4);
  });
  it('groups in first-seen order', () => {
    expect(groupOptions(options).map((g) => g.group)).toEqual(['', 'Web']);
  });
});

describe('hotkeys', () => {
  it('matches combos', () => {
    const ev = (key: string, mods: Partial<KeyboardEvent> = {}) =>
      ({ key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods }) as KeyboardEvent;
    vi.stubGlobal('navigator', { platform: 'Linux x86_64', userAgent: '' });
    expect(matchesHotkey(ev('k', { ctrlKey: true }), 'mod+k')).toBe(true);
    expect(matchesHotkey(ev('k', { ctrlKey: true, shiftKey: true }), 'mod+k')).toBe(false);
    expect(matchesHotkey(ev('?', { shiftKey: true }), '?')).toBe(true);
    expect(formatHotkey('mod+shift+p')).toBe('Ctrl+Shift+P');
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    expect(matchesHotkey(ev('k', { metaKey: true }), 'mod+k')).toBe(true);
    expect(formatHotkey('mod+k')).toBe('⌘K');
    vi.unstubAllGlobals();
  });
});
