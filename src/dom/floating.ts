import { computePosition, type PositionOptions, type PositionResult } from '../core/position';

/** Position a `position: fixed` / top-layer element next to its anchor once. */
export function applyPosition(anchor: Element, floating: HTMLElement, options: PositionOptions = {}): PositionResult {
  const rect = anchor.getBoundingClientRect();
  const result = computePosition(
    { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
    // offset* ignores the `scale` enter animation, unlike getBoundingClientRect.
    { width: floating.offsetWidth, height: floating.offsetHeight },
    { viewport: { width: document.documentElement.clientWidth, height: window.innerHeight }, ...options },
  );
  Object.assign(floating.style, {
    position: 'fixed',
    inset: 'auto',
    margin: '0',
    left: `${result.x}px`,
    top: `${result.y}px`,
  });
  floating.style.setProperty('--mn-transform-origin', result.transformOrigin);
  floating.style.setProperty('--mn-anchor-width', `${rect.width}px`);
  floating.dataset.side = result.side;
  floating.dataset.align = result.align;
  return result;
}

/** Keep a floating element attached to its anchor while scrolling/resizing. Returns a cleanup function. */
export function autoPosition(anchor: Element, floating: HTMLElement, options: PositionOptions = {}): () => void {
  let frame = 0;
  const update = () => applyPosition(anchor, floating, options);
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;
  observer?.observe(anchor);
  observer?.observe(floating);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule, { capture: true });
    window.removeEventListener('resize', schedule);
    observer?.disconnect();
  };
}
