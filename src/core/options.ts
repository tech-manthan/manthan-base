/** A selectable item for Combobox / Command / Select-like components. */
export interface ListOption {
  value: string;
  label: string;
  /** Extra words that should match the search (aliases, tags). */
  keywords?: string[];
  description?: string;
  group?: string;
  disabled?: boolean;
  /** Shown on the right, e.g. a keyboard shortcut. */
  shortcut?: string;
}

export type OptionInput = string | ListOption;

export const normalizeOption = (option: OptionInput): ListOption =>
  typeof option === 'string' ? { value: option, label: option } : option;

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Rank options against a query: exact/prefix label matches first, then word-start
 * matches, then substring and keyword matches. Accent- and case-insensitive.
 */
export function filterOptions<T extends ListOption>(options: T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return options;
  const scored: Array<[T, number, number]> = [];
  options.forEach((option, index) => {
    const label = fold(option.label);
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 80;
    else if (label.split(/[\s\-_/]+/).some((w) => w.startsWith(q))) score = 60;
    else if (label.includes(q)) score = 40;
    else if (option.keywords?.some((k) => fold(k).includes(q))) score = 30;
    else if (option.description && fold(option.description).includes(q)) score = 10;
    if (score) scored.push([option, score, index]);
  });
  return scored.sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([o]) => o);
}

/** Group options, keeping the first-seen group order. Ungrouped items use the key `''`. */
export function groupOptions<T extends ListOption>(options: T[]): Array<{ group: string; options: T[] }> {
  const groups = new Map<string, T[]>();
  for (const option of options) {
    const key = option.group ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }
  return Array.from(groups, ([group, items]) => ({ group, options: items }));
}
