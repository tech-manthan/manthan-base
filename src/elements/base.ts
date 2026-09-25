import type { Cleanup } from '../dom/utils';

/** Run once the element's children have been parsed. */
export function whenParsed(callback: () => void): void {
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

export const boolAttr = (el: Element, name: string) => el.hasAttribute(name) && el.getAttribute(name) !== 'false';

let seed = 0;
export const uid = (prefix: string) => `${prefix}-${(++seed).toString(36)}`;

/**
 * Light-DOM custom element base: no shadow root, so Tailwind classes and the
 * Manthan theme apply as usual, and native inputs inside take part in forms.
 *
 * - `build()` runs once, after children are parsed, to create markup.
 * - `update()` runs after build and whenever an observed attribute changes.
 * - `connect()` runs on every connection and may return a cleanup.
 */
export abstract class MnElement extends HTMLElement {
  private built = false;
  private cleanup: Cleanup | void = undefined;
  /** Classes written by the page author, kept alongside recipe classes. */
  private authorClass?: string;

  connectedCallback() {
    this.authorClass ??= this.getAttribute('class') ?? '';
    whenParsed(() => {
      if (!this.isConnected) return;
      if (!this.built) {
        this.built = true;
        this.build();
      }
      this.update();
      this.cleanup?.();
      this.cleanup = this.connect();
    });
  }

  disconnectedCallback() {
    this.cleanup?.();
    this.cleanup = undefined;
  }

  attributeChangedCallback() {
    if (this.built) this.update();
  }

  protected build(): void {}
  protected update(): void {}
  protected connect(): Cleanup | void {}

  /** Set recipe classes on the host without dropping the author's own classes. */
  protected setClass(recipeClass: string) {
    this.className = `${recipeClass} ${this.authorClass ?? ''}`.trim();
  }
  protected attr(name: string): string | undefined {
    return this.getAttribute(name) ?? undefined;
  }
  protected flag(name: string): boolean {
    return boolAttr(this, name);
  }
  protected emit<T>(type: string, detail: T) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }
  /** Move this element's current children into `target`. */
  protected adoptChildren(target: Element) {
    target.append(...Array.from(this.childNodes));
  }
}
