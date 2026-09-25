import { slotRecipe } from '../core/recipe';
import { focusRing, transitionColors } from './shared';

export const chart = slotRecipe({
  slots: {
    root: 'mn-chart relative flex min-w-0 flex-col gap-3 text-fg',
    legend: 'flex flex-wrap items-center gap-x-3 gap-y-1',
    legendItem: [
      'inline-flex cursor-pointer items-center gap-1.5 rounded-item px-1 py-0.5 -mx-1 text-xs text-fg-muted',
      transitionColors,
      focusRing,
      'hover:text-fg aria-[pressed=false]:opacity-50 aria-[pressed=false]:line-through',
    ],
    legendSwatch: 'shrink-0 bg-(--c) data-[shape=rect]:size-2.5 data-[shape=rect]:rounded-[2px] data-[shape=line]:h-0.5 data-[shape=line]:w-3 data-[shape=line]:rounded-full',
    plot: 'relative w-full',
    svg: `block overflow-visible rounded-item select-none ${focusRing}`,
    tooltip: [
      'pointer-events-none absolute top-0 left-0 z-10 min-w-36 max-w-64 rounded-control border-mn border-popover-border bg-popover px-2.5 py-2 text-xs shadow-popover backdrop-blur-(--mn-surface-blur)',
      'invisible opacity-0 transition-opacity duration-100 data-open:visible data-open:opacity-100',
    ],
    tooltipTitle: 'mb-1 font-medium text-fg-muted',
    tooltipRow: 'flex items-center gap-2 py-0.5',
    tooltipKey: 'h-0.5 w-3 shrink-0 rounded-full bg-(--c)',
    tooltipLabel: 'truncate text-fg-muted',
    tooltipValue: 'ms-auto ps-3 font-semibold text-fg tabular-nums',
    center: 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center',
    centerValue: 'mn-heading-type text-2xl leading-tight text-fg',
    centerLabel: 'text-xs text-fg-muted',
    table: 'sr-only',
  },
});

/** Stat tile: label, headline value, signed delta and an optional sparkline. */
export const stat = slotRecipe({
  slots: {
    root: 'mn-stat flex min-w-0 flex-col gap-1',
    label: 'text-sm text-fg-muted',
    value: 'mn-heading-type text-3xl leading-tight text-fg',
    footer: 'flex items-center gap-2 text-xs text-fg-muted',
    delta: 'inline-flex items-center gap-0.5 font-medium tabular-nums [&_svg]:size-3.5',
    trend: 'mt-2 h-10 w-full',
  },
  variants: {
    /** Colour by whether the change is good, not by its direction. */
    sentiment: {
      positive: { delta: 'text-[light-dark(#006300,#0ca30c)]' },
      negative: { delta: 'text-[light-dark(#b42323,#e66767)]' },
      neutral: { delta: 'text-fg-muted' },
    },
  },
  defaultVariants: { sentiment: 'neutral' },
});
