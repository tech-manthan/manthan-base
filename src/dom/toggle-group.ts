import { createRovingFocus } from './roving';
import { on, type Cleanup } from './utils';

export interface ToggleGroupControllerOptions {
  type?: 'single' | 'multiple';
  orientation?: 'horizontal' | 'vertical';
  /** Allow deselecting the last pressed item in `single` mode. @default true */
  deselectable?: boolean;
  onChange?: (value: string[]) => void;
}

/** Plain-DOM toggle group: manages aria-pressed on `button[data-value]` children. */
export function createToggleGroup(root: HTMLElement, options: ToggleGroupControllerOptions = {}): Cleanup {
  const { type = 'single', orientation = 'horizontal', deselectable = true, onChange } = options;
  root.setAttribute('role', 'group');
  const items = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-value]'));
  for (const item of items()) if (!item.hasAttribute('aria-pressed')) item.setAttribute('aria-pressed', 'false');
  const roving = createRovingFocus(root, { selector: 'button[data-value]', orientation });
  const off = on(root, 'click', (event) => {
    const item = (event.target as Element).closest<HTMLButtonElement>('button[data-value]');
    if (!item || item.disabled) return;
    const pressed = item.getAttribute('aria-pressed') === 'true';
    if (type === 'single') {
      if (pressed && !deselectable) return;
      for (const other of items()) other.setAttribute('aria-pressed', String(other === item && !pressed));
    } else {
      item.setAttribute('aria-pressed', String(!pressed));
    }
    onChange?.(items().filter((i) => i.getAttribute('aria-pressed') === 'true').map((i) => i.dataset.value!));
  });
  return () => {
    off();
    roving.destroy();
  };
}
