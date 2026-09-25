/**
 * Tiny validation rules. A rule returns an error message, or `undefined` when
 * the value is valid. Rules may be async (e.g. "username is taken").
 */
export type ValidationResult = string | undefined;
export type Rule<V = unknown, Values = Record<string, unknown>> = (value: V, values?: Values) => ValidationResult | Promise<ValidationResult>;

const isEmpty = (v: unknown) =>
  v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0) || (typeof FileList !== 'undefined' && v instanceof FileList && v.length === 0);
const len = (v: unknown) => (typeof v === 'string' || Array.isArray(v) ? v.length : String(v ?? '').length);

export const rules = {
  required: (message = 'This field is required.'): Rule => (v) => (isEmpty(v) ? message : undefined),
  minLength: (n: number, message?: string): Rule => (v) =>
    !isEmpty(v) && len(v) < n ? (message ?? `Use at least ${n} characters.`) : undefined,
  maxLength: (n: number, message?: string): Rule => (v) =>
    !isEmpty(v) && len(v) > n ? (message ?? `Use at most ${n} characters.`) : undefined,
  pattern: (re: RegExp, message = 'This value is not in the expected format.'): Rule => (v) =>
    !isEmpty(v) && !re.test(String(v)) ? message : undefined,
  email: (message = 'Enter a valid email address, like name@example.com.'): Rule => (v) =>
    !isEmpty(v) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v)) ? message : undefined,
  url: (message = 'Enter a full URL, starting with https://.'): Rule => (v) => {
    if (isEmpty(v)) return undefined;
    try {
      const u = new URL(String(v));
      return u.protocol === 'http:' || u.protocol === 'https:' ? undefined : message;
    } catch {
      return message;
    }
  },
  min: (n: number, message?: string): Rule => (v) =>
    !isEmpty(v) && Number(v) < n ? (message ?? `Enter ${n} or more.`) : undefined,
  max: (n: number, message?: string): Rule => (v) =>
    !isEmpty(v) && Number(v) > n ? (message ?? `Enter ${n} or less.`) : undefined,
  /** Must equal another field (password confirmation). */
  matches: (field: string, message = 'The values do not match.'): Rule => (v, values) =>
    v !== (values as Record<string, unknown> | undefined)?.[field] ? message : undefined,
  oneOf: (allowed: readonly unknown[], message = 'Choose one of the listed options.'): Rule => (v) =>
    !isEmpty(v) && !allowed.includes(v) ? message : undefined,
} as const;

/** Run rules in order and return the first error. */
export function runRules<V, Values>(value: V, values: Values, list: Rule<V, Values> | Rule<V, Values>[] | undefined): ValidationResult | Promise<ValidationResult> {
  const all = list ? (Array.isArray(list) ? list : [list]) : [];
  for (let i = 0; i < all.length; i++) {
    const result = all[i]!(value, values);
    if (result instanceof Promise) {
      return (async () => {
        const first = await result;
        if (first) return first;
        for (const rule of all.slice(i + 1)) {
          const next = await rule(value, values);
          if (next) return next;
        }
        return undefined;
      })();
    }
    if (result) return result;
  }
  return undefined;
}
