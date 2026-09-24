export type Orientation = 'horizontal' | 'vertical' | 'both';

export interface NavigationOptions {
  orientation?: Orientation;
  /** Wrap from last to first. @default true */
  loop?: boolean;
  /** Text direction; flips Left/Right in RTL. @default 'ltr' */
  dir?: 'ltr' | 'rtl';
  /** Items that must be skipped. */
  isDisabled?: (index: number) => boolean;
}

/**
 * Roving-focus maths shared by tabs, menus, radio groups, toolbars...
 * Returns the index to move to, or `null` when the key is not a navigation key.
 */
export function getNextIndex(key: string, current: number, count: number, options: NavigationOptions = {}): number | null {
  const { orientation = 'horizontal', loop = true, dir = 'ltr', isDisabled } = options;
  if (count <= 0) return null;
  const horizontal = orientation !== 'vertical';
  const vertical = orientation !== 'horizontal';
  const forwardKey = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const backwardKey = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

  let step: 1 | -1;
  let start: number;
  if (key === 'Home') {
    step = 1;
    start = -1;
  } else if (key === 'End') {
    step = -1;
    start = count;
  } else if ((horizontal && key === forwardKey) || (vertical && key === 'ArrowDown')) {
    step = 1;
    start = current;
  } else if ((horizontal && key === backwardKey) || (vertical && key === 'ArrowUp')) {
    step = -1;
    start = current;
  } else {
    return null;
  }

  let index = start;
  for (let i = 0; i < count; i++) {
    index += step;
    if (index >= count) {
      if (!loop || key === 'Home' || key === 'End') return current;
      index = 0;
    } else if (index < 0) {
      if (!loop || key === 'Home' || key === 'End') return current;
      index = count - 1;
    }
    if (!isDisabled?.(index)) return index;
  }
  return current;
}

/** Type-to-select: accumulate keystrokes and find the next item whose label starts with them. */
export function createTypeahead(timeout = 500) {
  let query = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (key: string, labels: string[], current: number): number | null => {
    if (key.length !== 1 || key === ' ') return null;
    clearTimeout(timer);
    timer = setTimeout(() => (query = ''), timeout);
    query += key.toLowerCase();
    const repeated = query.length > 1 && query.split('').every((c) => c === query[0]);
    const search = repeated ? query[0]! : query;
    const offset = repeated || query.length === 1 ? 1 : 0;
    for (let i = 0; i < labels.length; i++) {
      const index = (current + offset + i + labels.length) % labels.length;
      if (labels[index]?.trim().toLowerCase().startsWith(search)) return index;
    }
    return null;
  };
}
