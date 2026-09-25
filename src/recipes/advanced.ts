import { recipe, slotRecipe } from '../core/recipe';
import { disabledState, floatingMotion, focusRing, slotTone, transitionColors } from './shared';

const floatingSurface =
  'm-0 inset-auto border-mn border-popover-border bg-popover text-fg shadow-popover backdrop-blur-surface';

/** Options in a listbox (Combobox, Command). The highlighted option carries `data-highlighted`. */
const optionBase = [
  'group/option mn-option relative flex w-full cursor-default select-none items-center gap-2.5 rounded-item px-2.5 py-1.5 text-start text-sm outline-none',
  transitionColors,
  'data-highlighted:bg-accent-3 data-highlighted:text-accent-12',
  'aria-disabled:pointer-events-none aria-disabled:opacity-50',
  '[&_svg]:size-4 [&_svg]:shrink-0',
];

export const calendar = slotRecipe({
  slots: {
    root: 'mn-calendar inline-flex flex-col gap-3 select-none',
    header: 'flex items-center justify-between gap-2',
    title: 'mn-heading-type text-sm capitalize',
    nav: `inline-flex size-8 cursor-pointer items-center justify-center rounded-item text-fg-muted ${transitionColors} ${focusRing} hover:bg-accent-3 hover:text-fg disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4`,
    grid: 'border-collapse',
    weekday: 'pb-1 text-center text-xs font-medium text-fg-muted',
    cell: 'p-0.5 text-center',
    day: [
      'mn-calendar-day relative inline-flex cursor-pointer items-center justify-center rounded-item text-sm tabular-nums border-mn border-transparent',
      transitionColors,
      focusRing,
      'hover:bg-accent-3',
      'data-outside:text-fg-subtle',
      'data-today:font-semibold data-today:not-aria-selected:text-accent-11 data-today:after:absolute data-today:after:bottom-1 data-today:after:size-1 data-today:after:rounded-full data-today:after:bg-current',
      'aria-selected:border-edge aria-selected:bg-accent-9 aria-selected:text-accent-contrast aria-selected:shadow-btn aria-selected:hover:bg-accent-10',
      'disabled:pointer-events-none disabled:text-fg-subtle disabled:line-through disabled:opacity-50',
    ],
  },
  variants: {
    size: {
      sm: { day: 'size-8 text-xs' },
      md: { day: 'size-9' },
      lg: { day: 'size-11 text-base' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { size: 'md' },
});

export const combobox = slotRecipe({
  slots: {
    root: 'mn-combobox relative flex min-w-0',
    input: 'pe-9',
    trigger: `absolute inset-y-0 end-0 flex w-9 cursor-pointer items-center justify-center text-fg-muted ${focusRing} rounded-e-field [&_svg]:size-4`,
    listbox: ['mn-listbox max-h-72 min-w-(--mn-anchor-width) overflow-y-auto overscroll-contain rounded-surface p-1 outline-none', floatingSurface, floatingMotion],
    group: 'flex flex-col',
    groupLabel: 'px-2.5 pb-1 pt-2 text-xs font-medium text-fg-muted',
    option: optionBase,
    check: 'ms-auto text-accent-11 opacity-0 group-aria-selected/option:opacity-100',
    empty: 'px-2.5 py-6 text-center text-sm text-fg-muted',
  },
});

export const command = slotRecipe({
  slots: {
    root: 'mn-command flex w-full flex-col overflow-hidden rounded-surface border-mn border-popover-border bg-popover text-fg shadow-popover backdrop-blur-surface',
    inputWrap: 'flex items-center gap-2 border-b-mn border-border px-3 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-fg-muted',
    input: 'h-12 w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle',
    list: 'max-h-80 overflow-y-auto overscroll-contain p-1.5',
    groupLabel: 'px-2.5 pb-1 pt-2.5 text-xs font-medium text-fg-muted',
    item: [...optionBase, 'py-2'],
    itemDescription: 'truncate text-xs text-fg-muted',
    shortcut: 'ms-auto ps-4 text-xs tracking-widest text-fg-subtle',
    empty: 'py-10 text-center text-sm text-fg-muted',
    footer: 'flex items-center gap-3 border-t-mn border-border px-3 py-2 text-xs text-fg-muted',
  },
});

/** A dialog tuned for command palettes: top-anchored, no padding, no chrome. */
export const commandDialog = recipe({
  base: [
    'mn-dialog mn-command-dialog fixed mx-auto mb-auto mt-[12vh] w-full max-w-[calc(100vw-2rem)] overflow-visible bg-transparent p-0 outline-none sm:max-w-xl',
    'transition-[opacity,scale,overlay,display] transition-discrete duration-150 ease-mn opacity-0 scale-98 open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-98',
    'backdrop:bg-overlay backdrop:backdrop-blur-overlay backdrop:opacity-0 backdrop:transition-[opacity,overlay,display] backdrop:transition-discrete backdrop:duration-150 open:backdrop:opacity-100 starting:open:backdrop:opacity-0',
  ],
});

export const toggleGroup = slotRecipe({
  slots: {
    root: 'mn-toggle-group inline-flex items-center',
    item: [
      'mn-toggle relative inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-medium mn-btn-type',
      transitionColors,
      focusRing,
      disabledState,
      '[&_svg]:size-4 [&_svg]:shrink-0',
    ],
  },
  variants: {
    variant: {
      segmented: {
        root: 'gap-1 rounded-control bg-surface-3 p-1 shadow-inset',
        item: 'rounded-[calc(var(--mn-radius-control)*0.75)] text-fg-muted hover:text-fg aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:shadow-btn',
      },
      outline: {
        root: 'isolate',
        item: 'border-mn border-control-border bg-surface text-fg-muted -ms-(--mn-border-width) first:ms-0 first:rounded-s-control last:rounded-e-control hover:bg-accent-2 hover:text-fg aria-pressed:z-10 aria-pressed:border-accent-8 aria-pressed:bg-accent-3 aria-pressed:text-accent-12',
      },
      ghost: {
        root: 'gap-1',
        item: 'rounded-control text-fg-muted hover:bg-accent-3 hover:text-fg aria-pressed:bg-accent-4 aria-pressed:text-accent-12',
      },
    },
    size: {
      sm: { item: 'h-7 min-w-7 px-2 text-xs' },
      md: { item: 'h-8 min-w-8 px-3 text-sm' },
      lg: { item: 'h-10 min-w-10 px-4 text-sm' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { variant: 'segmented', size: 'md' },
});

/** The button that opens a DatePicker (looks like a field). */
export const datePicker = slotRecipe({
  slots: {
    trigger: [
      'mn-input flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-field border-mn border-control-border bg-control px-3 text-start text-sm text-fg shadow-control outline-none',
      transitionColors,
      'hover:border-border-strong focus-visible:border-accent-8 focus-visible:ring-3 focus-visible:ring-accent-8/25',
      'disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:tone-danger aria-invalid:border-accent-8',
      '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted',
    ],
    value: 'flex-1 truncate',
    placeholder: 'flex-1 truncate text-fg-subtle',
    content: ['mn-popover w-auto rounded-surface p-3 outline-none', floatingSurface, floatingMotion],
  },
  variants: {
    size: {
      sm: { trigger: 'h-8' },
      md: { trigger: 'h-10' },
      lg: { trigger: 'h-12 text-base' },
    },
  },
  defaultVariants: { size: 'md' },
});
