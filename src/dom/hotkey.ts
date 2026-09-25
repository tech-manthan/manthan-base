import { matchesHotkey } from '../core/hotkey';
import type { Cleanup } from './utils';

/** Run `handler` when `combo` (e.g. `mod+k`) is pressed anywhere in the document. */
export function onHotkey(combo: string, handler: (event: KeyboardEvent) => void, target: Document | HTMLElement = document): Cleanup {
  const listener = (event: Event) => {
    const e = event as KeyboardEvent;
    if (e.defaultPrevented || !matchesHotkey(e, combo)) return;
    e.preventDefault();
    handler(e);
  };
  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}
