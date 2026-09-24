import { slotRecipe } from '../core/recipe';
import { disabledState, focusRing, motion, transitionColors } from './shared';

export const tabs = slotRecipe({
  slots: {
    root: 'mn-tabs flex gap-4',
    list: 'mn-tabs-list relative flex shrink-0',
    trigger: [
      'mn-tab relative inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-medium text-fg-muted',
      transitionColors,
      focusRing,
      disabledState,
      'hover:text-fg aria-selected:text-fg [&_svg]:size-4',
    ],
    panel: `mn-tab-panel text-sm ${focusRing} rounded-item`,
  },
  variants: {
    variant: {
      line: {
        list: 'gap-1',
        trigger: 'rounded-none px-3 aria-selected:text-accent-11',
      },
      pills: {
        list: 'gap-1',
        trigger:
          'rounded-control px-3.5 hover:bg-accent-3 aria-selected:bg-accent-9 aria-selected:text-accent-contrast aria-selected:shadow-btn',
      },
      segmented: {
        list: 'w-fit gap-1 rounded-control bg-surface-3 p-1 shadow-inset',
        trigger:
          'flex-1 rounded-[calc(var(--mn-radius-control)*0.75)] px-3 aria-selected:bg-surface aria-selected:shadow-btn',
      },
    },
    orientation: {
      horizontal: { root: 'flex-col', list: 'flex-row items-center' },
      vertical: { root: 'flex-row', list: 'flex-col items-stretch' },
    },
    size: {
      sm: { trigger: 'h-8 text-xs' },
      md: { trigger: 'h-9 text-sm' },
      lg: { trigger: 'h-11 text-base' },
    },
  },
  compoundVariants: [
    {
      variant: 'line',
      orientation: 'horizontal',
      class: {
        list: 'border-b-mn border-border',
        trigger:
          '-mb-(--mn-border-width) border-b-2 border-transparent aria-selected:border-accent-9',
      },
    },
    {
      variant: 'line',
      orientation: 'vertical',
      class: {
        list: 'border-e-mn border-border',
        trigger: '-me-(--mn-border-width) justify-start border-e-2 border-transparent aria-selected:border-accent-9',
      },
    },
    { variant: 'pills', orientation: 'vertical', class: { trigger: 'justify-start' } },
  ],
  defaultVariants: { variant: 'line', orientation: 'horizontal', size: 'md' },
});

export const accordion = slotRecipe({
  slots: {
    root: 'mn-accordion flex flex-col',
    item: 'mn-accordion-item group',
    trigger: [
      'flex w-full cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-start text-sm font-medium [&::-webkit-details-marker]:hidden',
      transitionColors,
      focusRing,
      'hover:text-accent-11',
    ],
    icon: `size-4 shrink-0 text-fg-muted transition-transform ${motion} group-open:rotate-180`,
    content: 'pb-4 text-sm text-fg-muted',
  },
  variants: {
    variant: {
      plain: {
        item: 'border-b-mn border-border last:border-b-0',
      },
      contained: {
        root: 'overflow-hidden rounded-surface border-mn border-surface-border bg-surface shadow-surface backdrop-blur-surface',
        item: 'border-b-mn border-border last:border-b-0',
        trigger: 'px-4',
        content: 'px-4',
      },
      separated: {
        root: 'gap-2.5',
        item: 'rounded-surface border-mn border-surface-border bg-surface shadow-surface backdrop-blur-surface',
        trigger: 'px-4 rounded-surface',
        content: 'px-4',
      },
    },
  },
  defaultVariants: { variant: 'contained' },
});

export const breadcrumb = slotRecipe({
  slots: {
    root: 'mn-breadcrumb',
    list: 'flex flex-wrap items-center gap-1.5 break-words text-sm text-fg-muted',
    item: 'inline-flex items-center gap-1.5',
    link: `rounded-[2px] ${transitionColors} ${focusRing} hover:text-fg`,
    page: 'font-medium text-fg',
    separator: 'text-fg-subtle [&_svg]:size-3.5',
  },
});

export const pagination = slotRecipe({
  slots: {
    root: 'mn-pagination flex',
    list: 'flex flex-wrap items-center gap-1',
    item: [
      'mn-page-item inline-flex cursor-pointer select-none items-center justify-center gap-1 rounded-control border-mn border-transparent font-medium tabular-nums text-fg',
      transitionColors,
      focusRing,
      disabledState,
      'hover:bg-accent-3',
      'aria-[current=page]:border-edge aria-[current=page]:bg-accent-9 aria-[current=page]:text-accent-contrast aria-[current=page]:shadow-btn',
      '[&_svg]:size-4',
    ],
    ellipsis: 'inline-flex items-center justify-center text-fg-muted',
  },
  variants: {
    variant: {
      ghost: {},
      outline: { item: 'border-control-border bg-surface' },
    },
    size: {
      sm: { item: 'h-8 min-w-8 px-2 text-xs', ellipsis: 'size-8' },
      md: { item: 'h-9 min-w-9 px-2.5 text-sm', ellipsis: 'size-9' },
      lg: { item: 'h-11 min-w-11 px-3 text-base', ellipsis: 'size-11' },
    },
  },
  defaultVariants: { variant: 'ghost', size: 'md' },
});
