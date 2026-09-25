const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * Match a keyboard event against a combo such as `mod+k`, `shift+?`, `ctrl+alt+p`.
 * `mod` is ⌘ on Apple platforms and Ctrl elsewhere.
 */
export function matchesHotkey(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop()!;
  const want = { meta: false, ctrl: false, alt: false, shift: false };
  for (const part of parts) {
    if (part === 'mod') want[isMac() ? 'meta' : 'ctrl'] = true;
    else if (part === 'cmd' || part === 'meta') want.meta = true;
    else if (part === 'ctrl' || part === 'control') want.ctrl = true;
    else if (part === 'alt' || part === 'option') want.alt = true;
    else if (part === 'shift') want.shift = true;
  }
  const shiftIrrelevant = key.length === 1 && !/[a-z0-9]/.test(key);
  return (
    event.key.toLowerCase() === key &&
    event.metaKey === want.meta &&
    event.ctrlKey === want.ctrl &&
    event.altKey === want.alt &&
    (shiftIrrelevant || event.shiftKey === want.shift)
  );
}

/** Human label for a combo: `mod+k` → `⌘K` on macOS, `Ctrl+K` elsewhere. */
export function formatHotkey(combo: string): string {
  const mac = isMac();
  const symbols: Record<string, string> = mac
    ? { mod: '⌘', cmd: '⌘', meta: '⌘', ctrl: '⌃', alt: '⌥', option: '⌥', shift: '⇧' }
    : { mod: 'Ctrl', cmd: 'Win', meta: 'Win', ctrl: 'Ctrl', alt: 'Alt', option: 'Alt', shift: 'Shift' };
  const parts = combo.toLowerCase().split('+').map((p) => symbols[p] ?? (p.length === 1 ? p.toUpperCase() : p[0]!.toUpperCase() + p.slice(1)));
  return parts.join(mac ? '' : '+');
}
