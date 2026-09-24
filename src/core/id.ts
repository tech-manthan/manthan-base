let counter = 0;

/** Unique DOM id. Frameworks with SSR-safe id helpers (React `useId`, Vue `useId`, Svelte `$props.id()`) should prefer those. */
export function createId(prefix = 'mn'): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}`;
}
