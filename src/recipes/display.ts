import { recipe, slotRecipe } from '../core/recipe';
import { focusRing, slotTone, tone, transitionAll, transitionColors } from './shared';

export const badge = recipe({
  base: 'mn-badge inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-badge border-mn font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0',
  variants: {
    variant: {
      solid: 'mn-badge-solid border-edge bg-accent-9 text-accent-contrast',
      soft: 'mn-badge-soft border-transparent bg-accent-3 text-accent-11',
      surface: 'mn-badge-surface border-accent-6 bg-accent-2 text-accent-11',
      outline: 'mn-badge-outline border-accent-8 bg-transparent text-accent-11',
    },
    size: {
      sm: 'h-5 px-1.5 text-[0.6875rem]',
      md: 'h-6 px-2 text-xs',
      lg: 'h-7 px-2.5 text-sm',
    },
    tone,
  },
  defaultVariants: { variant: 'soft', size: 'md' },
});

export const avatar = slotRecipe({
  slots: {
    root: 'mn-avatar relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-accent-3 align-middle font-medium text-accent-11',
    image: 'size-full object-cover',
    fallback: 'leading-none uppercase',
  },
  variants: {
    size: {
      xs: { root: 'size-6 text-[0.625rem]' },
      sm: { root: 'size-8 text-xs' },
      md: { root: 'size-10 text-sm' },
      lg: { root: 'size-12 text-base' },
      xl: { root: 'size-16 text-xl' },
    },
    shape: {
      circle: { root: 'rounded-full' },
      square: { root: 'rounded-control' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { size: 'md', shape: 'circle' },
});

export const avatarGroup = recipe({
  base: 'mn-avatar-group flex items-center -space-x-2 [&>.mn-avatar]:ring-2 [&>.mn-avatar]:ring-bg',
});

export const card = slotRecipe({
  slots: {
    root: 'mn-card relative flex flex-col rounded-surface border-mn border-surface-border bg-surface text-fg shadow-surface backdrop-blur-surface',
    header: 'flex flex-col gap-1.5',
    title: 'mn-heading-type text-lg leading-tight',
    description: 'text-sm text-fg-muted',
    content: 'text-sm',
    footer: 'flex items-center gap-2',
  },
  variants: {
    variant: {
      surface: {},
      outline: { root: 'bg-transparent shadow-none backdrop-blur-none' },
      ghost: { root: 'border-transparent bg-transparent shadow-none backdrop-blur-none' },
    },
    size: {
      sm: { root: 'gap-3 p-4' },
      md: { root: 'gap-4 p-6' },
      lg: { root: 'gap-5 p-8', title: 'text-xl' },
    },
    interactive: {
      true: {
        root: `mn-card-interactive cursor-pointer ${transitionAll} ${focusRing} hover:-translate-y-0.5 hover:shadow-popover`,
      },
    },
  },
  defaultVariants: { variant: 'surface', size: 'md' },
});

export const kbd = recipe({
  base: 'mn-kbd inline-flex items-center justify-center rounded-[calc(var(--mn-radius-item)*0.8)] border-mn border-b-[calc(var(--mn-border-width)+1px)] border-border bg-surface-2 font-mono font-medium text-fg-muted',
  variants: {
    size: {
      sm: 'h-5 min-w-5 px-1 text-[0.6875rem]',
      md: 'h-6 min-w-6 px-1.5 text-xs',
    },
  },
  defaultVariants: { size: 'sm' },
});

export const separator = recipe({
  base: 'mn-separator shrink-0 bg-border',
  variants: {
    orientation: {
      horizontal: 'h-(--mn-border-width) w-full',
      vertical: 'h-auto w-(--mn-border-width) self-stretch',
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});

export const heading = recipe({
  base: 'mn-heading mn-heading-type text-fg text-balance',
  variants: {
    size: {
      1: 'text-4xl sm:text-5xl leading-[1.05]',
      2: 'text-3xl sm:text-4xl leading-[1.1]',
      3: 'text-2xl leading-tight',
      4: 'text-xl leading-snug',
      5: 'text-lg leading-snug',
      6: 'text-base leading-normal',
    },
  },
  defaultVariants: { size: 3 },
});

export const text = recipe({
  base: 'mn-text',
  variants: {
    size: { xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
    muted: { true: 'text-fg-muted' },
  },
  defaultVariants: { size: 'md' },
});

export const link = recipe({
  base: `mn-link rounded-[2px] font-medium text-accent-11 underline decoration-accent-7 underline-offset-4 hover:decoration-accent-11 ${transitionColors} ${focusRing}`,
  variants: { tone },
});

export const table = slotRecipe({
  slots: {
    root: 'mn-table relative w-full overflow-auto rounded-surface border-mn border-surface-border bg-surface shadow-surface backdrop-blur-surface',
    table: 'w-full caption-bottom border-collapse text-sm',
    header: 'bg-surface-2 [&_tr]:border-b-mn [&_tr]:border-border',
    body: '[&_tr:last-child]:border-0',
    row: `border-b-mn border-border ${transitionColors} hover:bg-accent-2 aria-selected:bg-accent-3`,
    head: 'h-10 whitespace-nowrap px-4 text-start align-middle text-xs font-medium tracking-wide text-fg-muted uppercase',
    cell: 'px-4 py-3 align-middle',
    caption: 'py-3 text-sm text-fg-muted',
  },
  variants: {
    striped: { true: { body: '[&_tr:nth-child(even)]:bg-surface-2' } },
    size: {
      sm: { head: 'h-8 px-3', cell: 'px-3 py-2' },
      md: {},
    },
  },
  defaultVariants: { size: 'md' },
});
