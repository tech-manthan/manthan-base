import { recipe, slotRecipe } from '../core/recipe';
import { slotTone, tone } from './shared';

export const alert = slotRecipe({
  slots: {
    root: 'mn-alert relative flex w-full gap-3 rounded-surface border-mn p-4 text-sm',
    icon: 'mt-px size-[1.125rem] shrink-0',
    content: 'flex min-w-0 flex-1 flex-col gap-1',
    title: 'font-semibold leading-tight',
    description: 'leading-relaxed opacity-90',
  },
  variants: {
    variant: {
      soft: { root: 'mn-alert-soft border-accent-6 bg-accent-3 text-accent-12', icon: 'text-accent-11' },
      surface: {
        root: 'mn-alert-surface border-accent-7 bg-surface text-fg shadow-surface backdrop-blur-surface',
        icon: 'text-accent-11',
      },
      outline: { root: 'mn-alert-outline border-accent-8 text-fg', icon: 'text-accent-11' },
      solid: { root: 'mn-alert-solid border-edge bg-accent-9 text-accent-contrast' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { variant: 'soft' },
});

export const progress = slotRecipe({
  slots: {
    root: 'mn-progress relative w-full overflow-hidden rounded-thumb bg-track shadow-inset',
    indicator:
      'mn-progress-indicator h-full w-full rounded-thumb bg-accent-9 transition-[translate] duration-500 ease-mn',
  },
  variants: {
    size: {
      sm: { root: 'h-1' },
      md: { root: 'h-2' },
      lg: { root: 'h-3' },
    },
    indeterminate: {
      true: { indicator: 'w-1/3 animate-mn-indeterminate' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { size: 'md' },
});

export const progressCircle = slotRecipe({
  slots: {
    root: 'mn-progress-circle relative inline-flex shrink-0 items-center justify-center',
    svg: '-rotate-90 size-full',
    track: 'fill-none stroke-track',
    indicator:
      'mn-progress-circle-indicator fill-none stroke-accent-9 transition-[stroke-dashoffset] duration-500 ease-mn [stroke-linecap:var(--mn-progress-cap,round)]',
    label: 'absolute text-xs font-semibold tabular-nums',
  },
  variants: {
    size: {
      sm: { root: 'size-8', label: 'text-[0.625rem]' },
      md: { root: 'size-12' },
      lg: { root: 'size-16', label: 'text-sm' },
      xl: { root: 'size-24', label: 'text-lg' },
    },
    indeterminate: { true: { svg: 'animate-spin', indicator: 'transition-none' } },
    tone: slotTone('root'),
  },
  defaultVariants: { size: 'md' },
});

export const spinner = recipe({
  base: 'mn-spinner inline-block shrink-0 animate-spin rounded-full border-current border-e-transparent align-middle',
  variants: {
    size: {
      xs: 'size-3 border-[1.5px]',
      sm: 'size-4 border-2',
      md: 'size-6 border-2',
      lg: 'size-8 border-[3px]',
      xl: 'size-12 border-4',
    },
    tone: {
      ...tone,
      current: '',
    },
  },
  compoundVariants: [
    { tone: 'primary', class: 'text-accent-9' },
    { tone: 'neutral', class: 'text-accent-9' },
    { tone: 'success', class: 'text-accent-9' },
    { tone: 'info', class: 'text-accent-9' },
    { tone: 'warning', class: 'text-accent-9' },
    { tone: 'danger', class: 'text-accent-9' },
  ],
  defaultVariants: { size: 'md', tone: 'current' },
});

export const skeleton = recipe({
  base: 'mn-skeleton block bg-surface-3 bg-[linear-gradient(90deg,transparent_25%,color-mix(in_oklch,var(--mn-surface)_70%,transparent)_50%,transparent_75%)] bg-size-[200%_100%] animate-mn-shimmer motion-reduce:animate-none',
  variants: {
    shape: {
      text: 'h-[0.9em] w-full rounded-item',
      rect: 'rounded-control',
      circle: 'aspect-square rounded-full',
    },
  },
  defaultVariants: { shape: 'rect' },
});
