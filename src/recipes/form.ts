import { recipe, slotRecipe } from '../core/recipe';
import { motion, slotTone, tone, transitionColors } from './shared';

const fieldBase = [
  'mn-input w-full min-w-0 rounded-field border-mn border-control-border bg-control text-fg shadow-control',
  'placeholder:text-fg-subtle outline-none',
  transitionColors,
  'hover:border-border-strong',
  'focus-visible:border-accent-8 focus-visible:ring-3 focus-visible:ring-accent-8/25',
  'disabled:cursor-not-allowed disabled:opacity-55',
  'aria-invalid:tone-danger aria-invalid:border-accent-8',
];

export const input = recipe({
  base: [
    ...fieldBase,
    'flex file:me-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg',
  ],
  variants: {
    size: {
      sm: 'h-8 px-2.5 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    },
    withStart: { true: 'ps-9' },
    withEnd: { true: 'pe-9' },
  },
  defaultVariants: { size: 'md' },
});

/** Wrapper + icon slots for inputs with leading/trailing adornments. */
export const inputGroup = slotRecipe({
  slots: {
    root: 'mn-input-group relative flex w-full items-center',
    start: 'pointer-events-none absolute start-3 flex items-center text-fg-subtle [&_svg]:size-4',
    end: 'absolute end-3 flex items-center text-fg-subtle [&_svg]:size-4',
  },
});

export const textarea = recipe({
  base: [...fieldBase, 'mn-textarea flex min-h-20 px-3 py-2 text-sm'],
  variants: {
    resize: { none: 'resize-none', vertical: 'resize-y', auto: 'resize-none field-sizing-content' },
  },
  defaultVariants: { resize: 'vertical' },
});

export const select = slotRecipe({
  slots: {
    root: 'mn-select-root relative inline-flex w-full',
    select: [
      ...fieldBase,
      'mn-select cursor-pointer appearance-none truncate pe-9',
    ],
    icon: 'pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted',
  },
  variants: {
    size: {
      sm: { select: 'h-8 ps-2.5 text-sm' },
      md: { select: 'h-10 ps-3 text-sm' },
      lg: { select: 'h-12 ps-4 text-base' },
    },
  },
  defaultVariants: { size: 'md' },
});

export const field = slotRecipe({
  slots: {
    root: 'mn-field flex flex-col gap-1.5',
    label: 'text-sm font-medium leading-none text-fg',
    description: 'text-xs text-fg-muted',
    error: 'tone-danger text-xs font-medium text-accent-11',
  },
  variants: {
    required: { true: { label: "after:ms-0.5 after:text-[oklch(0.6_0.2_25)] after:content-['*']" } },
    disabled: { true: { root: 'opacity-60', label: 'cursor-not-allowed' } },
  },
});

/** Wraps a checkbox/radio/switch and its text label. */
const choiceLabel =
  'group/choice inline-flex cursor-pointer select-none items-start gap-2.5 text-sm leading-5 text-fg has-disabled:cursor-not-allowed has-disabled:opacity-55';

const hiddenInput = 'peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed';

const controlBox = [
  'pointer-events-none flex size-full items-center justify-center border-mn border-control-border bg-control text-accent-contrast shadow-control',
  transitionColors,
  'peer-hover:border-accent-8 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-8',
  'peer-aria-invalid:tone-danger peer-aria-invalid:border-accent-8',
];

export const checkbox = slotRecipe({
  slots: {
    label: choiceLabel,
    root: 'mn-checkbox group relative inline-flex shrink-0 items-center justify-center',
    input: hiddenInput,
    control: [
      ...controlBox,
      'rounded-check peer-checked:border-accent-9 peer-checked:bg-accent-9 peer-indeterminate:border-accent-9 peer-indeterminate:bg-accent-9',
    ],
    check: `size-[80%] scale-50 opacity-0 ${motion} transition-[opacity,scale] group-has-[:checked:not(:indeterminate)]:scale-100 group-has-[:checked:not(:indeterminate)]:opacity-100`,
    minus: `absolute size-[80%] scale-50 opacity-0 ${motion} transition-[opacity,scale] group-has-indeterminate:scale-100 group-has-indeterminate:opacity-100`,
    text: 'flex flex-col gap-0.5',
    description: 'text-xs text-fg-muted',
  },
  variants: {
    size: {
      sm: { root: 'mt-0.5 size-4', label: 'text-sm' },
      md: { root: 'mt-px size-[1.125rem]' },
      lg: { root: 'size-5.5', label: 'text-base leading-6' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { size: 'md' },
});

export const radioGroup = recipe({
  base: 'mn-radio-group flex gap-3',
  variants: {
    orientation: { vertical: 'flex-col', horizontal: 'flex-row flex-wrap gap-x-5' },
  },
  defaultVariants: { orientation: 'vertical' },
});

export const radio = slotRecipe({
  slots: {
    label: choiceLabel,
    root: 'mn-radio group relative inline-flex shrink-0 items-center justify-center',
    input: hiddenInput,
    control: [...controlBox, 'rounded-full peer-checked:border-accent-9 peer-checked:bg-accent-9'],
    dot: `size-[40%] scale-0 rounded-full bg-accent-contrast ${motion} transition-[scale] group-has-checked:scale-100`,
    text: 'flex flex-col gap-0.5',
    description: 'text-xs text-fg-muted',
  },
  variants: {
    size: {
      sm: { root: 'mt-0.5 size-4' },
      md: { root: 'mt-px size-[1.125rem]' },
      lg: { root: 'size-5.5', label: 'text-base leading-6' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { size: 'md' },
});

export const switchRecipe = slotRecipe({
  slots: {
    label: choiceLabel + ' items-center',
    root: 'mn-switch group relative inline-flex shrink-0',
    input: hiddenInput,
    track: [
      'mn-switch-track pointer-events-none inline-flex h-full w-full items-center rounded-thumb border-mn border-control-border bg-track p-0.5 shadow-inset',
      transitionColors,
      'peer-checked:border-accent-9 peer-checked:bg-accent-9',
      'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-8',
    ],
    thumb: `mn-switch-thumb aspect-square h-full rounded-thumb bg-thumb shadow-thumb ${motion} transition-[translate] group-has-checked:translate-x-(--mn-switch-shift) rtl:group-has-checked:-translate-x-(--mn-switch-shift)`,
  },
  variants: {
    size: {
      sm: { root: 'h-5 w-8 [--mn-switch-shift:0.75rem]' },
      md: { root: 'h-6 w-10 [--mn-switch-shift:1rem]' },
      lg: { root: 'h-7 w-12 [--mn-switch-shift:1.25rem]', label: 'text-base' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { size: 'md' },
});

export const slider = recipe({
  base: 'mn-slider',
  variants: {
    size: {
      sm: '[--mn-slider-thumb:0.875rem] [--mn-slider-track:0.25rem]',
      md: '',
      lg: '[--mn-slider-thumb:1.375rem] [--mn-slider-track:0.5rem]',
    },
    tone,
  },
  defaultVariants: { size: 'md' },
});
