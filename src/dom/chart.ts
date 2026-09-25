import {
  buildChartScene,
  chartHitTest,
  chartTable,
  chartTooltip,
  formatNumber,
  type ChartScene,
  type ChartSpec,
} from '../core/chart';
import { chart as chartRecipe } from '../recipes/chart';

export interface ChartControllerOptions<T = Record<string, unknown>> extends ChartSpec<T> {
  /** Accessible name; also names a single-series chart in place of a legend. */
  title?: string;
  /** Plot height in px (the width follows the container). @default 240 */
  height?: number;
  /** `'auto'` shows a legend for two or more series. @default 'auto' */
  legend?: boolean | 'auto';
  /** Let readers hide series from the legend. @default true */
  toggleable?: boolean;
  /** @default true */
  tooltip?: boolean;
  /** Donut centre: total value with this caption. */
  centerLabel?: string;
  /** Header for the category column of the accessible table. */
  xLabel?: string;
  onHiddenChange?: (hidden: string[]) => void;
  /** Hovered or focused category / slice index (-1 when none). */
  onActiveChange?: (index: number) => void;
}

export interface ChartController<T = Record<string, unknown>> {
  /** Merge new options (data, series, type…) and re-render. */
  update(options: Partial<ChartControllerOptions<T>>): void;
  /** Re-read style tokens (bar radius, gaps) and re-render. */
  refresh(): void;
  getScene(): ChartScene;
  destroy(): void;
}

const SVG = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls = '') {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (cls) el.setAttribute('class', cls);
  return el;
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

let seed = 0;

/**
 * Responsive SVG chart (line, area, bar, donut) that follows the active design
 * style: colours, line weights, bar radius and glow all come from `--mn-chart-*`.
 * Includes a crosshair / per-mark tooltip, keyboard navigation, a toggleable
 * legend and an accessible data table.
 */
export function createChart<T = Record<string, unknown>>(root: HTMLElement, initial: ChartControllerOptions<T>): ChartController<T> {
  let options = { ...initial };
  let hidden = [...(options.hidden ?? [])];
  let scene: ChartScene;
  let active = -1;
  let width = 0;
  let animate = true;
  const s = chartRecipe();
  const id = `mn-chart-${++seed}`;

  root.className = s.root(root.className);
  const legend = h('div', s.legend());
  legend.setAttribute('role', 'group');
  const plot = h('div', s.plot());
  const svgEl = svg('svg', { role: 'img', tabindex: 0 }, s.svg());
  const tooltip = h('div', s.tooltip());
  tooltip.setAttribute('aria-hidden', 'true');
  const center = h('div', s.center());
  const live = h('div', 'sr-only');
  live.setAttribute('aria-live', 'polite');
  const table = h('table', s.table());
  table.id = `${id}-table`;
  plot.append(svgEl, center, tooltip);
  root.replaceChildren(legend, plot, live, table);

  const metrics = () => {
    const css = getComputedStyle(root);
    const px = (name: string, fallback: number) => {
      const v = parseFloat(css.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    return { radius: px('--mn-chart-radius', 4), gap: px('--mn-chart-gap', 2) };
  };
  let style = metrics();

  const spec = (): ChartSpec<T> => ({ ...options, hidden });
  const height = () => options.height ?? (options.sparkline ? 48 : 240);
  const measure = () => plot.clientWidth || root.clientWidth || 480;

  const renderLegend = () => {
    const show = options.legend ?? 'auto';
    const items = scene.legend;
    const visible = !options.sparkline && (show === true || (show === 'auto' && items.length > 1));
    legend.hidden = !visible;
    legend.setAttribute('aria-label', options.type === 'donut' ? 'Slices' : 'Series');
    legend.replaceChildren();
    if (!visible) return;
    const shape = options.type === 'line' ? 'line' : 'rect';
    for (const item of items) {
      const el = h(options.toggleable === false ? 'span' : 'button', s.legendItem());
      const swatch = h('span', s.legendSwatch());
      swatch.dataset.shape = shape;
      swatch.style.setProperty('--c', item.color);
      el.append(swatch, document.createTextNode(item.label));
      if (el instanceof HTMLButtonElement) {
        el.type = 'button';
        el.setAttribute('aria-pressed', String(!item.hidden));
        el.addEventListener('click', () => {
          hidden = item.hidden ? hidden.filter((k) => k !== item.key) : [...hidden, item.key];
          // Never let the reader hide everything.
          if (hidden.length >= items.length) hidden = hidden.filter((k) => k !== item.key);
          options.onHiddenChange?.(hidden);
          render();
          legend.querySelectorAll('button')[items.indexOf(item)]?.focus();
        });
      }
      legend.append(el);
    }
  };

  const renderTable = () => {
    const data = chartTable(spec(), options.xLabel);
    table.replaceChildren();
    if (options.title) table.append(h('caption', '', options.title));
    const head = h('tr');
    for (const cell of data.head) {
      const th = h('th', '', cell);
      th.scope = 'col';
      head.append(th);
    }
    const thead = h('thead');
    thead.append(head);
    const tbody = h('tbody');
    for (const row of data.rows) {
      const tr = h('tr');
      row.forEach((cell, i) => {
        const td = h(i ? 'td' : 'th', '', cell);
        if (!i) td.setAttribute('scope', 'row');
        tr.append(td);
      });
      tbody.append(tr);
    }
    table.append(thead, tbody);
  };

  const marks = svg('g');
  const overlay = svg('g');
  const underlay = svg('g');

  const render = () => {
    width = measure();
    scene = buildChartScene(spec(), { width, height: height(), radius: style.radius, gap: style.gap });
    root.toggleAttribute('data-horizontal', scene.horizontal);
    root.toggleAttribute('data-animate', animate);
    svgEl.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`);
    svgEl.setAttribute('width', String(scene.width));
    svgEl.setAttribute('height', String(scene.height));
    if (options.title) svgEl.setAttribute('aria-label', options.title);
    else svgEl.removeAttribute('aria-label');
    svgEl.setAttribute('aria-describedby', table.id);
    svgEl.setAttribute('aria-roledescription', `${options.type} chart`);

    const axes = svg('g');
    for (const l of scene.grid) axes.append(svg('line', { ...l }, 'mn-chart-grid'));
    const ticks = svg('g');
    ticks.setAttribute('aria-hidden', 'true');
    for (const t of [...scene.xTicks, ...scene.yTicks]) {
      const text = svg('text', { x: t.x, y: t.y, 'text-anchor': t.anchor });
      text.textContent = t.text;
      ticks.append(text);
    }
    marks.replaceChildren();
    const colored = (el: SVGElement, color: string) => {
      el.style.setProperty('--c', color);
      return el;
    };
    for (const a of scene.areas) marks.append(colored(svg('path', { d: a.d, 'data-series': a.series }, 'mn-chart-area'), a.color));
    for (const b of scene.bars) marks.append(colored(svg('path', { d: b.d, 'data-series': b.series, 'data-index': b.index }, 'mn-chart-bar'), b.color));
    for (const arc of scene.arcs) marks.append(colored(svg('path', { d: arc.d, 'data-index': arc.index }, 'mn-chart-arc'), arc.color));
    if (scene.baseline) marks.append(svg('line', { ...scene.baseline }, 'mn-chart-baseline'));
    for (const l of scene.lines) marks.append(colored(svg('path', { d: l.d, 'data-series': l.series }, 'mn-chart-line'), l.color));
    for (const d of scene.dots) marks.append(colored(svg('circle', { cx: d.cx, cy: d.cy, r: 4, 'data-series': d.series }, 'mn-chart-dot'), d.color));
    for (const l of scene.labels) {
      const text = svg('text', { x: l.x, y: l.y, 'text-anchor': l.anchor });
      text.textContent = l.text;
      ticks.append(text);
    }
    svgEl.replaceChildren(axes, underlay, marks, overlay, ticks);

    // Donut centre: the total, in the heading face.
    center.replaceChildren();
    center.hidden = !(scene.type === 'donut' && scene.center && scene.center.inner > 30);
    if (!center.hidden) {
      const total = scene.arcs.reduce((sum, a) => sum + a.value, 0);
      center.append(h('span', s.centerValue(), (options.valueFormat ?? formatNumber)(total)));
      if (options.centerLabel) center.append(h('span', s.centerLabel(), options.centerLabel));
    }

    renderLegend();
    renderTable();
    if (active >= scene.bands.length && scene.type !== 'donut') active = -1;
    setActive(active, false);
    // Only the first render animates; resizes and toggles stay still.
    if (animate && typeof requestAnimationFrame === 'function')
      requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-animate')));
    animate = false;
  };

  const setActive = (index: number, notify = true) => {
    const changed = index !== active;
    active = index;
    overlay.replaceChildren();
    underlay.replaceChildren();
    root.toggleAttribute('data-active', index >= 0);
    for (const el of marks.querySelectorAll('[data-index]')) el.toggleAttribute('data-active', Number(el.getAttribute('data-index')) === index);
    const tip = index >= 0 && options.tooltip !== false ? chartTooltip(spec(), scene, index) : null;
    if (index < 0 || !tip) {
      delete tooltip.dataset.open;
      if (changed && notify) options.onActiveChange?.(index);
      return;
    }

    let anchor = { x: 0, y: 0 };
    if (scene.type === 'donut') {
      const arc = scene.arcs.find((a) => a.index === index);
      if (arc) anchor = { x: arc.cx, y: arc.cy };
    } else {
      const band = scene.bands[index];
      if (!band) return;
      if (scene.type === 'bar') {
        underlay.append(svg('rect', { x: band.x, y: band.y, width: band.width, height: band.height, rx: 4 }, 'mn-chart-band'));
        anchor = scene.horizontal ? { x: band.x + band.width, y: band.cy } : { x: band.cx, y: band.y };
      } else {
        overlay.append(svg('line', { x1: band.cx, y1: scene.plot.y, x2: band.cx, y2: scene.plot.y + scene.plot.height }, 'mn-chart-crosshair'));
        let top = Infinity;
        for (const series of scene.points) {
          const p = series.points[index];
          if (!p) continue;
          top = Math.min(top, p.y);
          const dot = svg('circle', { cx: p.x, cy: p.y, r: 4.5 }, 'mn-chart-dot');
          dot.style.setProperty('--c', series.color);
          overlay.append(dot);
        }
        anchor = { x: band.cx, y: Number.isFinite(top) ? top : scene.plot.y };
      }
    }

    // Tooltip: values lead (strong), series names follow; built with textContent only.
    tooltip.replaceChildren();
    if (tip.title) tooltip.append(h('div', s.tooltipTitle(), tip.title));
    for (const row of tip.rows) {
      const line = h('div', s.tooltipRow());
      const key = h('span', s.tooltipKey());
      key.style.setProperty('--c', row.color);
      line.append(key, h('span', s.tooltipLabel(), row.label), h('span', s.tooltipValue(), row.value));
      tooltip.append(line);
    }
    tooltip.dataset.open = '';
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 60;
    let x = anchor.x + 12;
    if (x + tw > width) x = anchor.x - 12 - tw;
    x = Math.max(0, x);
    const y = Math.max(0, Math.min(height() - th, anchor.y - (scene.type === 'bar' && !scene.horizontal ? 0 : th / 2)));
    tooltip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    if (changed && notify) {
      live.textContent = `${tip.title}: ${tip.rows.map((r) => `${r.label} ${r.value}`).join(', ')}`;
      options.onActiveChange?.(index);
    }
  };

  const point = (event: PointerEvent) => {
    const rect = svgEl.getBoundingClientRect();
    const sx = rect.width ? scene.width / rect.width : 1;
    const sy = rect.height ? scene.height / rect.height : 1;
    return { x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sy };
  };
  const onMove = (event: PointerEvent) => {
    const p = point(event);
    setActive(chartHitTest(scene, p.x, p.y));
  };
  const onLeave = () => {
    if (document.activeElement !== svgEl) setActive(-1);
  };
  const indices = () => (scene.type === 'donut' ? scene.arcs.map((a) => a.index) : scene.bands.map((b) => b.index));
  const onKey = (event: KeyboardEvent) => {
    const list = indices();
    if (!list.length) return;
    const pos = list.indexOf(active);
    const back = scene.horizontal ? 'ArrowUp' : 'ArrowLeft';
    const next = scene.horizontal ? 'ArrowDown' : 'ArrowRight';
    let target: number | undefined;
    if (event.key === next) target = list[pos < 0 ? 0 : Math.min(list.length - 1, pos + 1)];
    else if (event.key === back) target = list[pos < 0 ? list.length - 1 : Math.max(0, pos - 1)];
    else if (event.key === 'Home') target = list[0];
    else if (event.key === 'End') target = list[list.length - 1];
    else if (event.key === 'Escape') target = -1;
    if (target === undefined) return;
    event.preventDefault();
    setActive(target);
  };
  const onFocus = () => {
    if (active < 0 && svgEl.matches(':focus-visible')) setActive(indices()[0] ?? -1);
  };
  const onBlur = () => setActive(-1);

  svgEl.addEventListener('pointermove', onMove);
  svgEl.addEventListener('pointerleave', onLeave);
  svgEl.addEventListener('keydown', onKey);
  svgEl.addEventListener('focus', onFocus);
  svgEl.addEventListener('blur', onBlur);

  render();

  // Follow the container width.
  const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure() !== width && render()) : null;
  resize?.observe(plot);
  // Follow style switches (bar radius and gaps are geometry, not just paint).
  const styles =
    typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => {
          const next = metrics();
          if (next.radius !== style.radius || next.gap !== style.gap) {
            style = next;
            render();
          }
        })
      : null;
  styles?.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-mn-style'] });

  return {
    update(next) {
      options = { ...options, ...next };
      if (next.hidden) hidden = [...next.hidden];
      render();
    },
    refresh() {
      style = metrics();
      render();
    },
    getScene: () => scene,
    destroy() {
      resize?.disconnect();
      styles?.disconnect();
      svgEl.removeEventListener('pointermove', onMove);
      svgEl.removeEventListener('pointerleave', onLeave);
      svgEl.removeEventListener('keydown', onKey);
      svgEl.removeEventListener('focus', onFocus);
      svgEl.removeEventListener('blur', onBlur);
      root.replaceChildren();
    },
  };
}
