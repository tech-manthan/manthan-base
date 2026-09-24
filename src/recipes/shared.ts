/** Class fragments shared by several recipes. */

export const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-8';

export const disabledState =
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

export const motion = 'duration-(--mn-duration) ease-mn';

export const transitionColors = `transition-[color,background-color,border-color,box-shadow,opacity] ${motion}`;

export const transitionAll = `transition-[color,background-color,border-color,box-shadow,opacity,translate,scale,rotate] ${motion}`;

/** Floating layers rendered with the Popover API (top layer), animated in and out with CSS only. */
export const floatingMotion =
  'transition-[opacity,scale,translate,overlay,display] transition-discrete duration-150 ease-mn opacity-0 scale-96 open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-96 origin-(--mn-transform-origin,center)';

/** The semantic colour palettes. Any element can re-point its accent scale with `tone-*`. */
export const tone = {
  primary: 'tone-primary',
  neutral: 'tone-neutral',
  success: 'tone-success',
  info: 'tone-info',
  warning: 'tone-warning',
  danger: 'tone-danger',
} as const;

export type Tone = keyof typeof tone;

/** Map a tone to per-slot classes (for slot recipes). */
export function slotTone<S extends string>(slot: S) {
  return Object.fromEntries(Object.entries(tone).map(([k, v]) => [k, { [slot]: v }])) as {
    [K in Tone]: Record<S, string>;
  };
}
