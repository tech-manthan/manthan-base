import { on, type Cleanup } from './utils';

export interface DropzoneOptions {
  /** The clickable / droppable area. It becomes keyboard-focusable. */
  zone: HTMLElement;
  /** A (usually visually hidden) `<input type="file">` used for the picker. */
  input: HTMLInputElement;
  onFiles: (files: File[]) => void;
  /** Accept files pasted while the zone has focus. @default true */
  paste?: boolean;
}

/** Replace the files of an `<input type="file">` so they post with the form. */
export function setInputFiles(input: HTMLInputElement, files: readonly File[]): void {
  if (typeof DataTransfer === 'undefined') return;
  try {
    const dt = new DataTransfer();
    for (const file of files) dt.items.add(file);
    input.files = dt.files;
  } catch {
    /* DataTransfer unavailable (older Safari, jsdom): the files still reach onFiles */
  }
}

/** Drag-and-drop, click, keyboard (Enter/Space) and paste support for a file drop area. */
export function createDropzone(options: DropzoneOptions): Cleanup {
  const { zone, input, onFiles, paste = true } = options;
  if (!zone.hasAttribute('tabindex')) zone.tabIndex = 0;
  if (!zone.hasAttribute('role')) zone.setAttribute('role', 'button');
  let depth = 0;
  const disabled = () => zone.getAttribute('aria-disabled') === 'true' || input.disabled;
  const take = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length && !disabled()) onFiles(files);
  };
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const cleanups: Cleanup[] = [
    on(zone, 'click', (e) => {
      if (disabled() || (e.target as Element).closest('button, a, input') !== null) return;
      input.click();
    }),
    on(zone, 'keydown', (e) => {
      if (e.target !== zone || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      if (!disabled()) input.click();
    }),
    on(zone, 'dragenter', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      zone.setAttribute('data-dragging', '');
    }),
    on(zone, 'dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = disabled() ? 'none' : 'copy';
    }),
    on(zone, 'dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) zone.removeAttribute('data-dragging');
    }),
    on(zone, 'drop', (e) => {
      e.preventDefault();
      depth = 0;
      zone.removeAttribute('data-dragging');
      take(e.dataTransfer?.files);
    }),
    on(input, 'change', () => {
      take(input.files);
    }),
  ];
  if (paste) cleanups.push(on(zone, 'paste', (e) => take(e.clipboardData?.files)));
  return () => cleanups.forEach((c) => c());
}
