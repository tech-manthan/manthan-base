import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  button,
  card,
  computePosition,
  createToaster,
  createTypeahead,
  cx,
  getNextIndex,
  getPaginationItems,
  recipe,
  slotRecipe,
  snapToStep,
  valueToPercent,
} from '../src/index';

describe('recipe', () => {
  const r = recipe({
    base: 'base',
    variants: { size: { sm: 's', md: 'm' }, on: { true: 'yes', false: 'no' } },
    defaultVariants: { size: 'md', on: false },
    compoundVariants: [{ size: 'sm', on: true, class: 'combo' }],
  });

  it('applies defaults, variants, booleans and compounds', () => {
    expect(r()).toBe('base m no');
    expect(r({ size: 'sm', on: true })).toBe('base s yes combo');
    expect(r({ class: ['extra', false && 'nope'] })).toBe('base m no extra');
  });

  it('splits variant props from the rest', () => {
    expect(r.splitProps({ size: 'sm', id: 'x' })).toEqual([{ size: 'sm' }, { id: 'x' }]);
  });

  it('builds slot recipes', () => {
    const s = slotRecipe({
      slots: { root: 'r', label: 'l' },
      variants: { tone: { red: { root: 'red' } } },
      compoundVariants: [{ tone: 'red', class: { label: 'red-label' } }],
    });
    const slots = s({ tone: 'red' });
    expect(slots.root()).toBe('r red');
    expect(slots.label('x')).toBe('l red-label x');
  });

  it('ships real component recipes', () => {
    expect(button({ variant: 'soft', tone: 'danger' })).toContain('tone-danger');
    expect(button()).toContain('mn-btn-solid');
    expect(card({ interactive: true }).root()).toContain('mn-card-interactive');
    expect(cx('a', null, ['b', undefined, ['c']], 0)).toBe('a b c 0');
  });
});

describe('getNextIndex', () => {
  it('moves and loops', () => {
    expect(getNextIndex('ArrowRight', 2, 3)).toBe(0);
    expect(getNextIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(getNextIndex('ArrowRight', 2, 3, { loop: false })).toBe(2);
  });
  it('respects orientation, rtl and disabled items', () => {
    expect(getNextIndex('ArrowDown', 0, 3)).toBeNull();
    expect(getNextIndex('ArrowDown', 0, 3, { orientation: 'vertical' })).toBe(1);
    expect(getNextIndex('ArrowLeft', 0, 3, { dir: 'rtl' })).toBe(1);
    expect(getNextIndex('ArrowRight', 0, 4, { isDisabled: (i) => i === 1 })).toBe(2);
    expect(getNextIndex('Home', 2, 4, { isDisabled: (i) => i === 0 })).toBe(1);
    expect(getNextIndex('End', 0, 4)).toBe(3);
  });
});

describe('typeahead', () => {
  it('finds items by prefix and cycles on repeated keys', () => {
    const find = createTypeahead();
    const labels = ['Apple', 'Banana', 'Blueberry', 'Cherry'];
    expect(find('b', labels, 0)).toBe(1);
    expect(find('b', labels, 1)).toBe(2);
  });
});

describe('computePosition', () => {
  const viewport = { width: 1000, height: 800 };
  const anchor = { x: 100, y: 100, width: 80, height: 30 };
  it('places below with offset', () => {
    const p = computePosition(anchor, { width: 200, height: 100 }, { placement: 'bottom-start', offset: 8, viewport });
    expect([p.x, p.y, p.side]).toEqual([100, 138, 'bottom']);
  });
  it('flips when there is no room', () => {
    const low = { x: 100, y: 740, width: 80, height: 30 };
    const p = computePosition(low, { width: 200, height: 100 }, { placement: 'bottom', viewport });
    expect(p.side).toBe('top');
    expect(p.y).toBe(740 - 100 - 8);
  });
  it('shifts inside the viewport', () => {
    const edge = { x: 980, y: 100, width: 10, height: 10 };
    const p = computePosition(edge, { width: 200, height: 50 }, { placement: 'bottom', viewport });
    expect(p.x).toBe(1000 - 200 - 8);
  });
});

describe('pagination', () => {
  it('keeps a stable length with ellipses', () => {
    expect(getPaginationItems({ page: 1, total: 10 })).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 10]);
    expect(getPaginationItems({ page: 5, total: 10 })).toEqual([1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]);
    expect(getPaginationItems({ page: 10, total: 10 })).toEqual([1, 'ellipsis-start', 6, 7, 8, 9, 10]);
    expect(getPaginationItems({ page: 2, total: 4 })).toEqual([1, 2, 3, 4]);
  });
});

describe('range helpers', () => {
  it('computes percentages and steps', () => {
    expect(valueToPercent(25, 0, 50)).toBe(50);
    expect(valueToPercent(80, 0, 50)).toBe(100);
    expect(snapToStep(0.30000000000000004, 0.1)).toBe(0.3);
    expect(snapToStep(7, 5, 0)).toBe(5);
  });
});

describe('toaster', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('adds, auto-dismisses and removes toasts', () => {
    const t = createToaster({ duration: 1000, removeDelay: 100 });
    const listener = vi.fn();
    t.subscribe(listener);
    const id = t.success('Saved');
    expect(t.getSnapshot()).toMatchObject([{ id, title: 'Saved', tone: 'success', state: 'open' }]);
    vi.advanceTimersByTime(1000);
    expect(t.getSnapshot()[0]!.state).toBe('closed');
    vi.advanceTimersByTime(100);
    expect(t.getSnapshot()).toHaveLength(0);
    expect(listener).toHaveBeenCalled();
  });

  it('pauses timers and caps the stack', () => {
    const t = createToaster({ duration: 1000, max: 2 });
    t('a');
    t.pause();
    vi.advanceTimersByTime(5000);
    expect(t.getSnapshot()[0]!.state).toBe('open');
    t.resume();
    t('b');
    t('c');
    expect(t.getSnapshot().filter((x) => x.state === 'open').map((x) => x.title)).toEqual(['b', 'c']);
  });

  it('resolves promise toasts', async () => {
    const t = createToaster();
    await t.promise(Promise.resolve(42), { loading: 'Saving', success: (v) => `Saved ${v}`, error: 'Failed' });
    expect(t.getSnapshot()[0]).toMatchObject({ title: 'Saved 42', tone: 'success', loading: false });
  });
});
