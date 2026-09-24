import { recipe } from '../core/recipe';
import { disabledState, focusRing, tone, transitionAll } from './shared';

export const button = recipe({
  base: [
    'mn-btn relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap align-middle',
    'mn-btn-type rounded-control border-mn no-underline',
    transitionAll,
    focusRing,
    disabledState,
    'active:translate-x-(--mn-press-x) active:translate-y-(--mn-press-y) active:scale-(--mn-press-scale)',
    'aria-busy:cursor-progress',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-[1.15em]',
  ],
  variants: {
    variant: {
      solid:
        'mn-btn-solid border-edge bg-accent-9 text-accent-contrast shadow-btn hover:bg-accent-10 hover:shadow-btn-hover active:shadow-btn-active',
      soft: 'mn-btn-soft border-transparent bg-accent-3 text-accent-11 hover:bg-accent-4 active:bg-accent-5',
      surface:
        'mn-btn-surface border-accent-6 bg-surface text-accent-11 shadow-btn hover:border-accent-7 hover:bg-accent-2 hover:shadow-btn-hover active:shadow-btn-active',
      outline: 'mn-btn-outline border-accent-7 bg-transparent text-accent-11 hover:border-accent-8 hover:bg-accent-2',
      ghost: 'mn-btn-ghost border-transparent bg-transparent text-accent-11 hover:bg-accent-3 active:bg-accent-4',
      link: 'mn-btn-link h-auto! border-transparent bg-transparent px-0! text-accent-11 underline-offset-4 hover:underline',
    },
    size: {
      xs: 'h-7 gap-1.5 px-2.5 text-xs',
      sm: 'h-8 gap-1.5 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-5 text-base',
      xl: 'h-13 px-7 text-lg',
    },
    tone,
    iconOnly: { true: 'aspect-square px-0!' },
    fullWidth: { true: 'w-full' },
  },
  defaultVariants: { variant: 'solid', size: 'md' },
});

export const buttonGroup = recipe({
  base: 'mn-btn-group inline-flex isolate [&>.mn-btn:focus-visible]:z-10',
  variants: {
    attached: {
      true: '[&>.mn-btn:not(:first-child)]:rounded-s-none [&>.mn-btn:not(:last-child)]:rounded-e-none [&>.mn-btn:not(:first-child)]:-ms-(--mn-border-width)',
      false: 'gap-2',
    },
  },
  defaultVariants: { attached: false },
});
