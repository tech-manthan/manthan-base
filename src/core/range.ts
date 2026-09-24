export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Percentage (0-100) of `value` between `min` and `max`. */
export function valueToPercent(value: number, min = 0, max = 100): number {
  if (max === min) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

/** Snap to the nearest step, avoiding floating point noise (0.1 + 0.2). */
export function snapToStep(value: number, step = 1, min = 0): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((Math.round((value - min) / step) * step + min).toFixed(decimals));
}
