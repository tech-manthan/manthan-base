import { recipe, slotRecipe } from '../core/recipe';
import { floatingMotion, focusRing, slotTone, transitionColors } from './shared';

const floatingSurface =
  'm-0 inset-auto border-mn border-popover-border bg-popover text-fg shadow-popover backdrop-blur-surface';

export const dialog = slotRecipe({
  slots: {
    content: [
      'mn-dialog fixed flex flex-col gap-4 overflow-y-auto border-mn border-popover-border bg-popover p-6 text-fg shadow-popover backdrop-blur-surface outline-none',
      'max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)]',
      'transition-[opacity,scale,translate,overlay,display] transition-discrete duration-200 ease-mn opacity-0 open:opacity-100 starting:open:opacity-0',
      'backdrop:bg-overlay backdrop:backdrop-blur-overlay backdrop:opacity-0 backdrop:transition-[opacity,overlay,display] backdrop:transition-discrete backdrop:duration-200 open:backdrop:opacity-100 starting:open:backdrop:opacity-0',
    ],
    header: 'flex flex-col gap-1.5 pe-8',
    title: 'mn-heading-type text-lg leading-tight',
    description: 'text-sm text-fg-muted',
    body: 'text-sm',
    footer: 'mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
    close: 'absolute end-3 top-3',
  },
  variants: {
    placement: {
      center: { content: 'm-auto rounded-surface scale-95 open:scale-100 starting:open:scale-95' },
      right: {
        content:
          'my-0 me-0 ms-auto h-dvh max-h-dvh rounded-s-surface translate-x-full open:translate-x-0 starting:open:translate-x-full',
      },
      left: {
        content:
          'my-0 ms-0 me-auto h-dvh max-h-dvh rounded-e-surface -translate-x-full open:translate-x-0 starting:open:-translate-x-full',
      },
      bottom: {
        content:
          'mx-auto mb-0 mt-auto max-w-none! rounded-t-surface translate-y-full open:translate-y-0 starting:open:translate-y-full',
      },
      top: {
        content:
          'mx-auto mt-0 mb-auto max-w-none! rounded-b-surface -translate-y-full open:translate-y-0 starting:open:-translate-y-full',
      },
    },
    size: {
      sm: { content: 'sm:max-w-sm' },
      md: { content: 'sm:max-w-lg' },
      lg: { content: 'sm:max-w-2xl' },
      xl: { content: 'sm:max-w-4xl' },
      full: { content: 'sm:max-w-[calc(100vw-2rem)]' },
    },
  },
  compoundVariants: [
    { placement: 'right', size: 'md', class: { content: 'sm:max-w-md' } },
    { placement: 'left', size: 'md', class: { content: 'sm:max-w-md' } },
  ],
  defaultVariants: { placement: 'center', size: 'md' },
});

export const popover = slotRecipe({
  slots: {
    content: ['mn-popover w-72 rounded-surface p-4 text-sm outline-none', floatingSurface, floatingMotion],
    title: 'mn-heading-type mb-1 text-sm',
    description: 'text-sm text-fg-muted',
  },
});

export const tooltip = recipe({
  base: [
    'mn-tooltip pointer-events-none m-0 inset-auto max-w-xs rounded-item border-mn border-transparent bg-tooltip px-2.5 py-1.5 text-xs font-medium text-tooltip-fg shadow-popover text-balance',
    floatingMotion,
  ],
});

export const menu = slotRecipe({
  slots: {
    content: ['mn-menu min-w-48 rounded-surface p-1 text-sm outline-none', floatingSurface, floatingMotion],
    item: [
      'mn-menu-item relative flex w-full cursor-default select-none items-center gap-2.5 rounded-item px-2.5 py-1.5 text-start outline-none',
      transitionColors,
      'focus:bg-accent-3 focus:text-accent-12 aria-checked:font-medium',
      'aria-disabled:pointer-events-none aria-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50',
      '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted focus:[&_svg]:text-accent-11',
    ],
    label: 'px-2.5 py-1.5 text-xs font-medium text-fg-muted',
    separator: 'mn-separator -mx-1 my-1 h-(--mn-border-width) bg-border',
    shortcut: 'ms-auto ps-4 text-xs tracking-widest text-fg-subtle',
  },
  variants: {
    tone: slotTone('item'),
  },
});

export const toastRecipe = slotRecipe({
  slots: {
    region:
      'mn-toast-region pointer-events-none fixed z-[2147483000] flex max-h-dvh w-full flex-col gap-2.5 p-4 sm:max-w-sm',
    root: [
      'mn-toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-surface border-mn border-popover-border bg-popover p-4 pe-10 text-sm text-fg shadow-popover backdrop-blur-surface',
      'animate-mn-toast-in data-[state=closed]:animate-mn-toast-out',
    ],
    icon: 'mt-0.5 size-[1.125rem] shrink-0 text-accent-11',
    content: 'flex min-w-0 flex-1 flex-col gap-0.5',
    title: 'font-semibold leading-snug',
    description: 'text-fg-muted leading-snug',
    actions: 'mt-2 flex gap-2',
    close: 'absolute end-2 top-2',
  },
  variants: {
    placement: {
      'top-left': { region: 'top-0 left-0' },
      'top-center': { region: 'top-0 left-1/2 -translate-x-1/2' },
      'top-right': { region: 'top-0 right-0' },
      'bottom-left': { region: 'bottom-0 left-0 flex-col-reverse' },
      'bottom-center': { region: 'bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse' },
      'bottom-right': { region: 'bottom-0 right-0 flex-col-reverse' },
    },
    tone: slotTone('root'),
  },
  defaultVariants: { placement: 'bottom-right' },
});

export const closeButton = recipe({
  base: `mn-close inline-flex size-7 cursor-pointer items-center justify-center rounded-item text-fg-muted ${transitionColors} ${focusRing} hover:bg-accent-3 hover:text-fg [&_svg]:size-4`,
});
