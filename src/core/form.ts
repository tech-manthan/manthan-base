import { runRules, type Rule, type ValidationResult } from './validation';

export type FormValues = Record<string, unknown>;
export type FormRules<V extends FormValues> = { [K in keyof V]?: Rule<V[K], V> | Rule<V[K], V>[] };
export type FormErrors<V extends FormValues> = { [K in keyof V]?: string };

export interface FormState<V extends FormValues> {
  values: V;
  errors: FormErrors<V>;
  touched: { [K in keyof V]?: boolean };
  submitting: boolean;
  submitCount: number;
  /** Values differ from the initial values. */
  dirty: boolean;
  valid: boolean;
}

export interface FormOptions<V extends FormValues> {
  initialValues: V;
  rules?: FormRules<V>;
  /**
   * When fields first validate: `blur` (default), `change`, or only on `submit`.
   * Once a field has been visited it re-validates on every change.
   */
  validateOn?: 'blur' | 'change' | 'submit';
  onSubmit?: (values: V) => void | Promise<void>;
}

export interface FieldBinding<T = unknown> {
  name: string;
  value: T;
  /** Error to show now (after the field was touched or the form was submitted). */
  error: string | undefined;
  invalid: boolean;
  onInput(value: T): void;
  onBlur(): void;
}

export interface FormStore<V extends FormValues> {
  getSnapshot(): FormState<V>;
  subscribe(listener: () => void): () => void;
  setValue<K extends keyof V>(name: K, value: V[K]): void;
  setValues(values: Partial<V>): void;
  blur(name: keyof V): void;
  setError(name: keyof V, message: string | undefined): void;
  /** Validate one field, or all of them. Resolves to `true` when valid. */
  validate(name?: keyof V): Promise<boolean>;
  /** Touch everything, validate, then call `onSubmit` when valid. Pass the DOM event to prevent the page reload. */
  submit(event?: { preventDefault?: () => void }): Promise<boolean>;
  reset(values?: V): void;
  /** Everything a control needs: value, visible error and handlers. */
  field<K extends keyof V>(name: K): FieldBinding<V[K]>;
  /** The error for `name` if it should be visible now. */
  visibleError(name: keyof V): string | undefined;
}

const shallowEqual = (a: FormValues, b: FormValues) => Object.keys({ ...a, ...b }).every((k) => Object.is(a[k], b[k]));

/** Framework-agnostic form state. Every Manthan binding wraps it in its own reactivity. */
export function createForm<V extends FormValues>(options: FormOptions<V>): FormStore<V> {
  const { rules = {} as FormRules<V>, validateOn = 'blur', onSubmit } = options;
  let initial = options.initialValues;
  let state: FormState<V> = { values: initial, errors: {}, touched: {}, submitting: false, submitCount: 0, dirty: false, valid: true };
  const listeners = new Set<() => void>();
  const pending = new Map<keyof V, number>();

  const set = (patch: Partial<FormState<V>>) => {
    const next = { ...state, ...patch };
    next.dirty = !shallowEqual(next.values, initial);
    next.valid = Object.values(next.errors).every((e) => !e);
    state = next;
    listeners.forEach((l) => l());
  };

  const applyError = (name: keyof V, error: ValidationResult) => {
    if (state.errors[name] === error) return;
    set({ errors: { ...state.errors, [name]: error } });
  };

  const validateField = (name: keyof V): boolean | Promise<boolean> => {
    const result = runRules(state.values[name], state.values, rules[name] as Rule<V[keyof V], V> | undefined);
    if (result instanceof Promise) {
      const ticket = (pending.get(name) ?? 0) + 1;
      pending.set(name, ticket);
      return result.then((error) => {
        if (pending.get(name) === ticket) applyError(name, error);
        return !error;
      });
    }
    applyError(name, result);
    return !result;
  };

  const store: FormStore<V> = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setValue(name, value) {
      set({ values: { ...state.values, [name]: value } });
      if (validateOn === 'change' || state.touched[name] || state.errors[name]) void validateField(name);
      // Fields the user already visited re-check live, so a dependant (password → confirm) updates immediately.
      if (validateOn !== 'submit' || state.submitCount > 0) {
        for (const other of Object.keys(rules) as (keyof V)[]) {
          if (other !== name && (state.touched[other] || state.errors[other])) void validateField(other);
        }
      }
    },
    setValues(values) {
      set({ values: { ...state.values, ...values } });
    },
    blur(name) {
      if (!state.touched[name]) set({ touched: { ...state.touched, [name]: true } });
      if (validateOn !== 'submit') void validateField(name);
    },
    setError: applyError,
    async validate(name) {
      if (name !== undefined) return validateField(name);
      const names = [...new Set([...Object.keys(rules), ...Object.keys(state.values)])] as (keyof V)[];
      const results = await Promise.all(names.map((n) => validateField(n)));
      return results.every(Boolean);
    },
    async submit(event) {
      event?.preventDefault?.();
      const touched = Object.fromEntries(Object.keys({ ...state.values, ...rules }).map((k) => [k, true])) as FormState<V>['touched'];
      set({ touched, submitCount: state.submitCount + 1 });
      const ok = await store.validate();
      if (!ok || !onSubmit) return ok;
      set({ submitting: true });
      try {
        await onSubmit(state.values);
      } finally {
        set({ submitting: false });
      }
      return true;
    },
    reset(values) {
      initial = values ?? initial;
      pending.clear();
      set({ values: initial, errors: {}, touched: {}, submitting: false, submitCount: 0 });
    },
    visibleError(name) {
      return state.touched[name] || state.submitCount > 0 ? state.errors[name] : undefined;
    },
    field(name) {
      const error = store.visibleError(name);
      return {
        name: String(name),
        value: state.values[name],
        error,
        invalid: !!error,
        onInput: (value) => store.setValue(name, value),
        onBlur: () => store.blur(name),
      };
    },
  };
  return store;
}
