/**
 * A tiny, dependency-free variant engine (the good parts of cva + tailwind-variants).
 * Recipes return Tailwind class strings, so every framework binding shares one
 * source of truth for styling.
 */

export type ClassValue = string | number | boolean | null | undefined | ClassValue[];

type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T;

let merge: (className: string) => string = (className) => className;

/**
 * Plug in a class merger such as `twMerge` so user classes override recipe
 * classes deterministically: `configure({ merge: twMerge })`.
 */
export function configure(options: { merge?: (className: string) => string }): void {
  if (options.merge) merge = options.merge;
}

function flatten(value: ClassValue, out: string[]): void {
  if (!value && value !== 0) return;
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out);
  } else if (typeof value === 'string' || typeof value === 'number') {
    out.push(String(value));
  }
}

/** Join class values, skipping falsy ones (like `clsx`). Does not merge. */
export function cx(...values: ClassValue[]): string {
  const out: string[] = [];
  flatten(values, out);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/** `cx` + the configured merger. Used for final class output. */
export function cn(...values: ClassValue[]): string {
  return merge(cx(values));
}

// ── Single-element recipes ────────────────────────────────────────────────

export type VariantSchema = Record<string, Record<string, ClassValue>>;

type AnyVariants = Record<string, Record<string, unknown>>;

export type VariantSelection<V extends AnyVariants> = {
  [K in keyof V]?: StringToBoolean<keyof V[K]> | null;
};

export interface RecipeConfig<V extends VariantSchema> {
  base?: ClassValue;
  variants?: V;
  defaultVariants?: VariantSelection<V>;
  compoundVariants?: Array<VariantSelection<V> & { class: ClassValue }>;
}

export type RecipeProps<V extends VariantSchema> = VariantSelection<V> & { class?: ClassValue };

/** Variant props of any recipe or slot recipe: `VariantProps<typeof button>`. */
export type VariantProps<R extends { variants: AnyVariants }> = VariantSelection<R['variants']>;

export interface Recipe<V extends VariantSchema> {
  (props?: RecipeProps<V>): string;
  readonly variants: V;
  readonly defaultVariants: VariantSelection<V>;
  /** Split props into [variantProps, rest] — handy in framework components. */
  splitProps<P extends Record<string, unknown>>(props: P): [VariantSelection<V>, Omit<P, keyof V>];
}

const key = (value: unknown) => (typeof value === 'boolean' ? String(value) : (value as string | undefined));

function resolveSelection<V extends AnyVariants>(
  variants: V,
  defaults: VariantSelection<V>,
  props: Record<string, unknown>,
): Record<string, string | undefined> {
  const selection: Record<string, string | undefined> = {};
  for (const name of Object.keys(variants)) {
    const value = props[name] ?? defaults[name];
    selection[name] = value == null ? undefined : key(value);
  }
  return selection;
}

function matches(selection: Record<string, string | undefined>, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([name, expected]) => {
    if (name === 'class') return true;
    const values = Array.isArray(expected) ? expected : [expected];
    return values.some((v) => key(v) === selection[name]);
  });
}

function splitter<V extends AnyVariants>(variants: V) {
  return <P extends Record<string, unknown>>(props: P): [VariantSelection<V>, Omit<P, keyof V>] => {
    const picked: Record<string, unknown> = {};
    const rest: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(props)) {
      if (name in variants) picked[name] = value;
      else rest[name] = value;
    }
    return [picked as VariantSelection<V>, rest as Omit<P, keyof V>];
  };
}

export function recipe<V extends VariantSchema = {}>(config: RecipeConfig<V>): Recipe<V> {
  const variants = (config.variants ?? {}) as V;
  const defaults = (config.defaultVariants ?? {}) as VariantSelection<V>;
  const fn = (props: RecipeProps<V> = {}) => {
    const selection = resolveSelection(variants, defaults, props as Record<string, unknown>);
    const classes: ClassValue[] = [config.base];
    for (const [name, value] of Object.entries(selection)) {
      if (value !== undefined) classes.push(variants[name]?.[value]);
    }
    for (const compound of config.compoundVariants ?? []) {
      if (matches(selection, compound)) classes.push(compound.class);
    }
    classes.push(props.class);
    return cn(classes);
  };
  return Object.assign(fn, { variants, defaultVariants: defaults, splitProps: splitter(variants) });
}

// ── Multi-part (slot) recipes ─────────────────────────────────────────────

export type SlotClasses<S extends string> = Partial<Record<S, ClassValue>>;
export type SlotVariantSchema<S extends string> = Record<string, Record<string, SlotClasses<S>>>;

export interface SlotRecipeConfig<S extends string, V extends SlotVariantSchema<S>> {
  slots: Record<S, ClassValue>;
  variants?: V;
  defaultVariants?: VariantSelection<V>;
  compoundVariants?: Array<VariantSelection<V> & { class: SlotClasses<S> }>;
}

export type SlotFunctions<S extends string> = Record<S, (extra?: ClassValue) => string>;

export interface SlotRecipe<S extends string, V extends SlotVariantSchema<S>> {
  (props?: VariantSelection<V>): SlotFunctions<S>;
  readonly slots: readonly S[];
  readonly variants: V;
  readonly defaultVariants: VariantSelection<V>;
  splitProps<P extends Record<string, unknown>>(props: P): [VariantSelection<V>, Omit<P, keyof V>];
}

export function slotRecipe<S extends string, V extends SlotVariantSchema<S> = {}>(
  config: SlotRecipeConfig<S, V>,
): SlotRecipe<S, V> {
  const variants = (config.variants ?? {}) as V;
  const defaults = (config.defaultVariants ?? {}) as VariantSelection<V>;
  const slots = Object.keys(config.slots) as S[];
  const fn = (props: VariantSelection<V> = {}) => {
    const selection = resolveSelection(variants, defaults, props as Record<string, unknown>);
    const result = {} as SlotFunctions<S>;
    for (const slot of slots) {
      const classes: ClassValue[] = [config.slots[slot]];
      for (const [name, value] of Object.entries(selection)) {
        if (value !== undefined) classes.push(variants[name]?.[value]?.[slot]);
      }
      for (const compound of config.compoundVariants ?? []) {
        if (matches(selection, compound)) classes.push(compound.class[slot]);
      }
      const joined = cx(classes);
      result[slot] = (extra?: ClassValue) => cn(joined, extra);
    }
    return result;
  };
  return Object.assign(fn, { slots, variants, defaultVariants: defaults, splitProps: splitter(variants) });
}
