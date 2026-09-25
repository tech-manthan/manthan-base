/**
 * Framework-agnostic chart geometry. `buildChartScene()` turns a chart spec and
 * a pixel size into plain shapes (paths, rects, ticks, labels, hit bands) that
 * any renderer can draw. Colours are CSS variables, so charts follow the active
 * design style and theme without recomputing anything.
 */

export type ChartType = 'line' | 'area' | 'bar' | 'donut';
export type ChartCurve = 'linear' | 'monotone' | 'step';

export interface ChartSeries {
  /** Field read from each data row. */
  key: string;
  label?: string;
  /**
   * Palette slot (`1`–`8`), `'accent'` for the style's accent, or any CSS colour.
   * Defaults to the series' position, so colour follows the entity, never its rank.
   */
  color?: string | number;
}

export interface ChartSpec<T = Record<string, unknown>> {
  type: ChartType;
  data: T[];
  /** Field holding the category (x axis, or slice name for donuts). */
  x: string;
  series: ChartSeries[];
  /** Stack bars / areas instead of grouping / overlapping them. */
  stacked?: boolean;
  /** Horizontal bars (categories on the y axis). */
  horizontal?: boolean;
  /** @default 'monotone' */
  curve?: ChartCurve;
  /** Dots on every point of a line (end dots are always drawn). */
  markers?: boolean;
  /** Bare trend line: no axes, grid, legend or labels. */
  sparkline?: boolean;
  /** @default true */
  grid?: boolean;
  /** Label line ends with the series name (2–4 series, dropped if they would collide). @default true */
  directLabels?: boolean;
  /** Fixed value domain; `'auto'` for either end. */
  yDomain?: [number | 'auto', number | 'auto'];
  xFormat?: (value: unknown, index: number) => string;
  /** Axis ticks. Defaults to compact numbers (12.9K). */
  yFormat?: (value: number) => string;
  /** Tooltip and table values. Defaults to grouped numbers (12,940). */
  valueFormat?: (value: number) => string;
  /** Donut hole as a fraction of the radius. @default 0.62 */
  innerRadius?: number;
  /** Maximum bar thickness in px. @default 24 */
  maxBarSize?: number;
  /** Series keys (or donut slice names) that are toggled off. */
  hidden?: string[];
}

export interface ChartMetrics {
  width: number;
  height: number;
  /** Rounded data-end of bars. @default 4 */
  radius?: number;
  /** Surface gap between touching marks. @default 2 */
  gap?: number;
  /** Axis label size in px. @default 11 */
  fontSize?: number;
}

export interface ChartRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ChartLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface ChartText {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
}
export interface ResolvedSeries {
  key: string;
  label: string;
  color: string;
  hidden: boolean;
}
export interface ChartBand extends ChartRect {
  index: number;
  /** Anchor for tooltips and the crosshair. */
  cx: number;
  cy: number;
}
export interface ChartScene {
  type: ChartType;
  width: number;
  height: number;
  plot: ChartRect;
  horizontal: boolean;
  categories: string[];
  /** Legend entries (every series or slice, including hidden ones). */
  legend: ResolvedSeries[];
  grid: ChartLine[];
  baseline: ChartLine | null;
  xTicks: ChartText[];
  yTicks: ChartText[];
  areas: { series: number; d: string; color: string }[];
  lines: { series: number; d: string; color: string }[];
  bars: { series: number; index: number; d: string; color: string; rect: ChartRect }[];
  dots: { series: number; index: number; cx: number; cy: number; color: string }[];
  arcs: { index: number; d: string; color: string; value: number; share: number; label: string; cx: number; cy: number }[];
  labels: (ChartText & { series: number })[];
  /** Hit and highlight regions, one per category (or slice). */
  bands: ChartBand[];
  /** Pixel positions of every visible point, per series (line / area hover dots). */
  points: { series: number; color: string; points: ({ x: number; y: number } | null)[] }[];
  center: { cx: number; cy: number; inner: number; outer: number } | null;
}

export interface ChartTooltip {
  title: string;
  rows: { label: string; value: string; color: string; raw: number | null }[];
}

const OTHER = 'var(--mn-chart-other)';
const MAX_SLOTS = 8;

/** Resolve a series colour: palette slot, `'accent'` or a raw CSS colour. */
export function chartColor(color: string | number | undefined, slot: number): string {
  if (color === undefined || color === '') return slot <= MAX_SLOTS ? `var(--mn-chart-${slot})` : OTHER;
  if (typeof color === 'number' || /^[1-8]$/.test(color)) return `var(--mn-chart-${color})`;
  if (color === 'accent') return 'var(--mn-accent-9)';
  if (color === 'other') return OTHER;
  return color;
}

// ── Numbers ────────────────────────────────────────────────────────────────

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const grouped = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

/** 950 → "950", 12_940 → "12.9K", 4_200_000 → "4.2M". */
export const formatCompact = (value: number): string => compact.format(value);
/** 12940.5 → "12,940.5". */
export const formatNumber = (value: number): string => grouped.format(value);

function tickIncrement(start: number, stop: number, count: number): number {
  const step = (stop - start) / Math.max(1, count);
  const power = Math.floor(Math.log10(step));
  const error = step / 10 ** power;
  const factor = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
  return factor * 10 ** power;
}

/** Round a domain outwards to clean numbers and return ~`count` ticks inside it. */
export function niceTicks(min: number, max: number, count = 5): { domain: [number, number]; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { domain: [0, 1], ticks: [0, 1] };
  if (min === max) {
    if (min === 0) max = 1;
    else if (min > 0) min = 0;
    else max = 0;
  }
  if (min > max) [min, max] = [max, min];
  let step = tickIncrement(min, max, count);
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  step = tickIncrement(lo, hi, count);
  lo = Math.floor(min / step) * step;
  hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(decimals)));
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks };
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (value: number) => r0 + (value - d0) * k;
}

// ── Paths ──────────────────────────────────────────────────────────────────

type Point = { x: number; y: number };
const r2 = (n: number) => Math.round(n * 100) / 100;
const pt = (p: Point) => `${r2(p.x)},${r2(p.y)}`;

function monotoneTangents(points: Point[]): number[] {
  const n = points.length;
  const secants: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1].x - points[i].x;
    secants.push(h ? (points[i + 1].y - points[i].y) / h : 0);
  }
  const m = new Array<number>(n);
  m[0] = secants[0] ?? 0;
  m[n - 1] = secants[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const s0 = secants[i - 1];
    const s1 = secants[i];
    if (s0 * s1 <= 0) m[i] = 0;
    else {
      const h0 = points[i].x - points[i - 1].x;
      const h1 = points[i + 1].x - points[i].x;
      const p = (s0 * h1 + s1 * h0) / (h0 + h1);
      m[i] = (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p));
    }
  }
  return m;
}

/** Path commands after the first point (so segments can be joined into areas). */
function curveTail(points: Point[], curve: ChartCurve): string {
  if (points.length < 2) return '';
  if (curve === 'linear') return points.slice(1).map((p) => `L${pt(p)}`).join('');
  if (curve === 'step') {
    let d = '';
    for (let i = 1; i < points.length; i++) {
      const mid = (points[i - 1].x + points[i].x) / 2;
      d += `H${r2(mid)}V${r2(points[i].y)}H${r2(points[i].x)}`;
    }
    return d;
  }
  const m = monotoneTangents(points);
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const h = (b.x - a.x) / 3;
    d += `C${pt({ x: a.x + h, y: a.y + m[i] * h })} ${pt({ x: b.x - h, y: b.y - m[i + 1] * h })} ${pt(b)}`;
  }
  return d;
}

/** Split at missing values so gaps stay gaps. */
function segments<P>(points: (P | null)[]): P[][] {
  const out: P[][] = [];
  let run: P[] = [];
  for (const p of points) {
    if (p) run.push(p);
    else if (run.length) {
      out.push(run);
      run = [];
    }
  }
  if (run.length) out.push(run);
  return out;
}

export function linePath(points: (Point | null)[], curve: ChartCurve = 'linear'): string {
  return segments(points)
    .map((run) => `M${pt(run[0])}${curveTail(run, curve)}`)
    .join('');
}

/** Closed area between `top` and `bottom` (same length, same x positions). */
export function areaPath(top: (Point | null)[], bottom: (Point | null)[], curve: ChartCurve = 'linear'): string {
  const pairs = top.map((t, i) => (t && bottom[i] ? { t, b: bottom[i]! } : null));
  return segments(pairs)
    .map((run) => {
      const upper = run.map((p) => p.t);
      const lower = run.map((p) => p.b).reverse();
      return `M${pt(upper[0])}${curveTail(upper, curve)}L${pt(lower[0])}${curveTail(lower, curve)}Z`;
    })
    .join('');
}

export type BarEnd = 'top' | 'bottom' | 'left' | 'right';

/** A bar with a rounded data end and a square base. */
export function barPath(rect: ChartRect, radius: number, end: BarEnd | null): string {
  const { x, y, width: w, height: h } = rect;
  const along = end === 'left' || end === 'right' ? w : h;
  const across = end === 'left' || end === 'right' ? h : w;
  const r = end ? Math.max(0, Math.min(radius, across / 2, along)) : 0;
  if (!r) return `M${r2(x)},${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}Z`;
  const a = (dx: number, dy: number) => `a${r2(r)},${r2(r)} 0 0 1 ${r2(dx)},${r2(dy)}`;
  switch (end) {
    case 'top':
      return `M${r2(x)},${r2(y + h)}v${r2(-(h - r))}${a(r, -r)}h${r2(w - 2 * r)}${a(r, r)}v${r2(h - r)}Z`;
    case 'bottom':
      return `M${r2(x + w)},${r2(y)}v${r2(h - r)}${a(-r, r)}h${r2(-(w - 2 * r))}${a(-r, -r)}v${r2(-(h - r))}Z`;
    case 'right':
      return `M${r2(x)},${r2(y)}h${r2(w - r)}${a(r, r)}v${r2(h - 2 * r)}${a(-r, r)}h${r2(-(w - r))}Z`;
    default:
      return `M${r2(x + w)},${r2(y + h)}h${r2(-(w - r))}${a(-r, -r)}v${r2(-(h - 2 * r))}${a(r, -r)}h${r2(w - r)}Z`;
  }
}

const polar = (cx: number, cy: number, r: number, angle: number): Point => ({
  x: cx + r * Math.sin(angle),
  y: cy - r * Math.cos(angle),
});

/**
 * A donut slice from `start` to `end` (radians, 0 = 12 o'clock, clockwise),
 * trimmed by `gap` px on each side so neighbours are separated by parallel gaps.
 */
export function arcPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number, gap = 0): string {
  const full = end - start >= Math.PI * 2 - 1e-6;
  if (full) {
    const ring = (r: number, sweep: 0 | 1) => {
      const a = polar(cx, cy, r, 0);
      const b = polar(cx, cy, r, Math.PI);
      return `M${pt(a)}A${r2(r)},${r2(r)} 0 1 ${sweep} ${pt(b)}A${r2(r)},${r2(r)} 0 1 ${sweep} ${pt(a)}Z`;
    };
    return ring(outer, 1) + (inner > 0 ? ring(inner, 0) : '');
  }
  const trim = (r: number) => (r > 0 ? Math.min((gap / 2) / r, (end - start) / 2) : 0);
  const o0 = start + trim(outer);
  const o1 = end - trim(outer);
  const i0 = start + trim(inner);
  const i1 = end - trim(inner);
  const large = (a: number, b: number) => (b - a > Math.PI ? 1 : 0);
  let d = `M${pt(polar(cx, cy, outer, o0))}A${r2(outer)},${r2(outer)} 0 ${large(o0, o1)} 1 ${pt(polar(cx, cy, outer, o1))}`;
  if (inner > 0 && i1 > i0) {
    d += `L${pt(polar(cx, cy, inner, i1))}A${r2(inner)},${r2(inner)} 0 ${large(i0, i1)} 0 ${pt(polar(cx, cy, inner, i0))}`;
  } else {
    d += `L${pt({ x: cx, y: cy })}`;
  }
  return `${d}Z`;
}

// ── Scene ──────────────────────────────────────────────────────────────────

/** Rough text width for layout (no DOM needed, so scenes also build on the server). */
export const estimateTextWidth = (text: string, fontSize = 11) => text.length * fontSize * 0.6;

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

function resolveSeries<T>(spec: ChartSpec<T>): ResolvedSeries[] {
  const hidden = new Set(spec.hidden ?? []);
  return spec.series.map((s, i) => ({
    key: s.key,
    label: s.label ?? s.key,
    color: chartColor(s.color, i + 1),
    hidden: hidden.has(s.key),
  }));
}

export function chartCategories<T>(spec: ChartSpec<T>): string[] {
  return spec.data.map((row, i) => {
    const value = (row as Record<string, unknown>)[spec.x];
    return spec.xFormat ? spec.xFormat(value, i) : String(value ?? '');
  });
}

/** Donut slices, with anything past eight folded into "Other" (colour never cycles). */
export function donutSlices<T>(spec: ChartSpec<T>): { label: string; value: number; color: string }[] {
  const key = spec.series[0]?.key;
  const categories = chartCategories(spec);
  let slices = spec.data
    .map((row, i) => ({ label: categories[i], value: num((row as Record<string, unknown>)[key]) ?? 0, slot: i + 1 }))
    .filter((s) => s.value > 0);
  if (slices.length > MAX_SLOTS) {
    const sorted = [...slices].sort((a, b) => b.value - a.value);
    const keep = new Set(sorted.slice(0, MAX_SLOTS - 1));
    const rest = slices.filter((s) => !keep.has(s)).reduce((sum, s) => sum + s.value, 0);
    slices = [...slices.filter((s) => keep.has(s)).map((s, i) => ({ ...s, slot: i + 1 })), { label: 'Other', value: rest, slot: 0 }];
  }
  return slices.map((s) => ({
    label: s.label,
    value: s.value,
    color: s.slot ? chartColor(undefined, s.slot) : OTHER,
  }));
}

export function buildChartScene<T>(spec: ChartSpec<T>, metrics: ChartMetrics): ChartScene {
  if (spec.type === 'donut') return buildDonut(spec, metrics);
  const scene = buildCartesian(spec, metrics, spec.directLabels !== false);
  // Direct labels that would collide are dropped: the legend carries identity instead.
  if (scene.labels.length > 1) {
    const ys = scene.labels.map((l) => l.y).sort((a, b) => a - b);
    const min = (metrics.fontSize ?? 11) + 3;
    if (ys.some((y, i) => i > 0 && y - ys[i - 1] < min)) return buildCartesian(spec, metrics, false);
  }
  return scene;
}

function emptyScene(type: ChartType, width: number, height: number): ChartScene {
  return {
    type,
    width,
    height,
    plot: { x: 0, y: 0, width, height },
    horizontal: false,
    categories: [],
    legend: [],
    grid: [],
    baseline: null,
    xTicks: [],
    yTicks: [],
    areas: [],
    lines: [],
    bars: [],
    dots: [],
    arcs: [],
    labels: [],
    bands: [],
    points: [],
    center: null,
  };
}

function buildCartesian<T>(spec: ChartSpec<T>, metrics: ChartMetrics, withLabels: boolean): ChartScene {
  const { width, height } = metrics;
  const radius = metrics.radius ?? 4;
  const gap = metrics.gap ?? 2;
  const fontSize = metrics.fontSize ?? 11;
  const curve = spec.curve ?? 'monotone';
  const spark = !!spec.sparkline;
  const isBar = spec.type === 'bar';
  const horizontal = isBar && !!spec.horizontal;
  const stacked = !!spec.stacked && spec.type !== 'line';
  const legend = resolveSeries(spec);
  const visible = legend.map((s, i) => ({ ...s, index: i })).filter((s) => !s.hidden);
  const categories = chartCategories(spec);
  const n = spec.data.length;
  const scene = emptyScene(spec.type, width, height);
  scene.horizontal = horizontal;
  scene.categories = categories;
  scene.legend = legend;

  const values = spec.data.map((row) => visible.map((s) => num((row as Record<string, unknown>)[s.key])));

  // Stack offsets: [base, top] per visible series per row.
  const stacks = values.map((row) => {
    let pos = 0;
    let neg = 0;
    return row.map((v) => {
      if (v === null) return null;
      if (!stacked) return [0, v] as [number, number];
      if (v >= 0) return [pos, (pos += v)] as [number, number];
      return [neg, (neg += v)] as [number, number];
    });
  });

  let lo = Infinity;
  let hi = -Infinity;
  for (const row of stacks)
    for (const s of row) {
      if (!s) continue;
      // Unstacked marks start at an implicit zero that only bars and areas include.
      const ends = stacked ? s : [s[1]];
      lo = Math.min(lo, ...ends);
      hi = Math.max(hi, ...ends);
    }
  if (!Number.isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  // Bars and areas grow from zero; lines and sparklines fit their data.
  if (isBar || (spec.type === 'area' && !spark)) {
    lo = Math.min(0, lo);
    hi = Math.max(0, hi);
  }
  const [fixedLo, fixedHi] = spec.yDomain ?? ['auto', 'auto'];
  if (fixedLo !== 'auto') lo = fixedLo;
  if (fixedHi !== 'auto') hi = fixedHi;

  const valueExtent = horizontal ? width : height;
  const tickCount = Math.max(2, Math.min(6, Math.floor(valueExtent / (horizontal ? 90 : 44))));
  let domain: [number, number];
  let ticks: number[];
  if (spark) {
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
    domain = [lo - (isBar ? 0 : pad), hi + pad];
    if (isBar) domain[0] = Math.min(0, lo);
    ticks = [];
  } else {
    ({ domain, ticks } = niceTicks(lo, hi, tickCount));
    if (fixedLo !== 'auto') domain[0] = fixedLo;
    if (fixedHi !== 'auto') domain[1] = fixedHi;
    ticks = ticks.filter((t) => t >= domain[0] && t <= domain[1]);
  }
  const yFormat = spec.yFormat ?? formatCompact;
  const tickLabels = ticks.map(yFormat);

  // Padding: room for tick labels and direct labels, measured, not guessed per chart.
  const labelWidth = Math.max(0, ...categories.map((c) => estimateTextWidth(c, fontSize)));
  const direct =
    withLabels && !spark && !isBar && visible.length >= 2 && visible.length <= 4
      ? Math.max(...visible.map((s) => estimateTextWidth(s.label, fontSize))) + 12
      : 0;
  let pad = { top: 8, right: 8, bottom: 8, left: 8 };
  if (spark) pad = { top: 6, right: 6, bottom: 6, left: 6 };
  else if (horizontal) {
    pad.left = Math.ceil(labelWidth) + 12;
    pad.bottom = fontSize + 12;
    pad.right = Math.max(12, estimateTextWidth(tickLabels[tickLabels.length - 1] ?? '', fontSize) / 2 + 4);
  } else {
    pad.left = Math.ceil(Math.max(0, ...tickLabels.map((t) => estimateTextWidth(t, fontSize)))) + 12;
    pad.bottom = fontSize + 14;
    const last = categories[n - 1] ?? '';
    pad.right = Math.max(direct || 8, isBar ? 8 : estimateTextWidth(last, fontSize) / 2 + 4);
  }
  const plot: ChartRect = {
    x: pad.left,
    y: pad.top,
    width: Math.max(1, width - pad.left - pad.right),
    height: Math.max(1, height - pad.top - pad.bottom),
  };
  scene.plot = plot;

  const value = horizontal
    ? linearScale(domain, [plot.x, plot.x + plot.width])
    : linearScale(domain, [plot.y + plot.height, plot.y]);
  const zero = value(Math.max(domain[0], Math.min(domain[1], 0)));

  // Grid and value ticks.
  if (!spark) {
    ticks.forEach((t, i) => {
      const p = value(t);
      if (spec.grid !== false && t !== 0)
        scene.grid.push(horizontal ? { x1: p, y1: plot.y, x2: p, y2: plot.y + plot.height } : { x1: plot.x, y1: p, x2: plot.x + plot.width, y2: p });
      if (horizontal) scene.xTicks.push({ x: p, y: plot.y + plot.height + fontSize + 6, text: tickLabels[i], anchor: 'middle' });
      else scene.yTicks.push({ x: plot.x - 8, y: p + fontSize * 0.35, text: tickLabels[i], anchor: 'end' });
    });
    scene.baseline = horizontal ? { x1: zero, y1: plot.y, x2: zero, y2: plot.y + plot.height } : { x1: plot.x, y1: zero, x2: plot.x + plot.width, y2: zero };
  }

  // Category positions: bands for bars, points spanning the full width for lines.
  const catExtent = horizontal ? plot.height : plot.width;
  const catStart = horizontal ? plot.y : plot.x;
  const band = n ? catExtent / n : catExtent;
  const step = isBar ? band : n > 1 ? catExtent / (n - 1) : catExtent;
  const center = (i: number) => (isBar ? catStart + band * (i + 0.5) : n > 1 ? catStart + step * i : catStart + catExtent / 2);

  // Category labels, thinned so they never overlap.
  if (!spark && n) {
    const need = horizontal ? fontSize + 6 : labelWidth + 12;
    const every = Math.max(1, Math.ceil(need / Math.max(1, step)));
    categories.forEach((c, i) => {
      if (i % every) return;
      if (horizontal) scene.yTicks.push({ x: plot.x - 8, y: center(i) + fontSize * 0.35, text: c, anchor: 'end' });
      else scene.xTicks.push({ x: center(i), y: plot.y + plot.height + fontSize + 8, text: c, anchor: 'middle' });
    });
  }

  // Hit bands: the whole category slot, always larger than the marks in it.
  for (let i = 0; i < n; i++) {
    const c = center(i);
    const w = isBar ? band : n > 1 ? step : catExtent;
    const startPos = Math.max(catStart, c - w / 2);
    const endPos = Math.min(catStart + catExtent, c + w / 2);
    scene.bands.push(
      horizontal
        ? { index: i, x: plot.x, y: startPos, width: plot.width, height: endPos - startPos, cx: plot.x + plot.width, cy: c }
        : { index: i, x: startPos, y: plot.y, width: endPos - startPos, height: plot.height, cx: c, cy: plot.y },
    );
  }

  if (isBar) {
    const maxBar = spec.maxBarSize ?? 24;
    const k = stacked ? 1 : Math.max(1, visible.length);
    const room = band * (k > 1 ? 0.8 : 0.64);
    const size = Math.max(1, Math.min(maxBar, (room - gap * (k - 1)) / k));
    const group = size * k + gap * (k - 1);
    // The outermost segment of each stack gets the rounded end.
    const outer = stacks.map((row) => {
      let pos = -1;
      let neg = -1;
      row.forEach((s, j) => {
        if (!s || s[1] === s[0]) return;
        if (s[1] > s[0]) pos = j;
        else neg = j;
      });
      return { pos, neg };
    });
    stacks.forEach((row, i) => {
      row.forEach((s, j) => {
        if (!s || s[1] === s[0]) return;
        const series = visible[j];
        const offset = stacked ? 0 : j * (size + gap);
        const across = center(i) - group / 2 + offset;
        const positive = s[1] > s[0];
        let a = value(s[0]);
        const b = value(s[1]);
        // Surface gap between stacked segments.
        if (stacked && s[0] !== 0) {
          const moved = a + (positive ? 1 : -1) * (horizontal ? gap : -gap);
          a = Math.sign(b - moved) === Math.sign(b - a) ? moved : b;
        }
        if (a === b) return;
        const isEnd = stacked ? (positive ? outer[i].pos === j : outer[i].neg === j) : true;
        const rect: ChartRect = horizontal
          ? { x: Math.min(a, b), y: across, width: Math.abs(b - a), height: size }
          : { x: across, y: Math.min(a, b), width: size, height: Math.abs(b - a) };
        const end: BarEnd = horizontal ? (positive ? 'right' : 'left') : positive ? 'top' : 'bottom';
        scene.bars.push({ series: series.index, index: i, d: barPath(rect, radius, isEnd ? end : null), color: series.color, rect });
      });
    });
    return scene;
  }

  // Lines and areas.
  const x = (i: number) => center(i);
  visible.forEach((series, j) => {
    const top = stacks.map((row, i) => (row[j] ? { x: x(i), y: value(row[j]![1]) } : null));
    scene.points.push({ series: series.index, color: series.color, points: top });
    if (spec.type === 'area') {
      // Sparklines fit their data, so an unstacked area fills to the bottom edge.
      const floor = plot.y + plot.height;
      const bottom = stacks.map((row, i) => (row[j] ? { x: x(i), y: Math.min(floor, value(row[j]![0])) } : null));
      scene.areas.push({ series: series.index, d: areaPath(top, bottom, curve), color: series.color });
    }
    scene.lines.push({ series: series.index, d: linePath(top, curve), color: series.color });
    const lastIndex = top.map((p, i) => (p ? i : -1)).filter((i) => i >= 0).pop();
    top.forEach((p, i) => {
      if (p && (spec.markers || i === lastIndex)) scene.dots.push({ series: series.index, index: i, cx: p.x, cy: p.y, color: series.color });
    });
    if (direct && lastIndex !== undefined) {
      const p = top[lastIndex]!;
      scene.labels.push({ series: series.index, x: plot.x + plot.width + 8, y: p.y + fontSize * 0.35, text: series.label, anchor: 'start' });
    }
  });
  return scene;
}

function buildDonut<T>(spec: ChartSpec<T>, metrics: ChartMetrics): ChartScene {
  const { width, height } = metrics;
  const gap = metrics.gap ?? 2;
  const scene = emptyScene('donut', width, height);
  const hidden = new Set(spec.hidden ?? []);
  const slices = donutSlices(spec);
  scene.categories = slices.map((s) => s.label);
  scene.legend = slices.map((s) => ({ key: s.label, label: s.label, color: s.color, hidden: hidden.has(s.label) }));
  const outer = Math.max(4, Math.min(width, height) / 2 - 4);
  const inner = outer * Math.max(0, Math.min(0.95, spec.innerRadius ?? 0.62));
  const cx = width / 2;
  const cy = height / 2;
  scene.center = { cx, cy, inner, outer };
  scene.plot = { x: cx - outer, y: cy - outer, width: outer * 2, height: outer * 2 };
  const shown = slices.map((s, i) => ({ ...s, index: i })).filter((s) => !hidden.has(s.label));
  const total = shown.reduce((sum, s) => sum + s.value, 0);
  let angle = 0;
  for (const s of shown) {
    const sweep = total ? (s.value / total) * Math.PI * 2 : 0;
    const mid = angle + sweep / 2;
    const c = polar(cx, cy, (inner + outer) / 2, mid);
    scene.arcs.push({
      index: s.index,
      d: arcPath(cx, cy, inner, outer, angle, angle + sweep, shown.length > 1 ? gap : 0),
      color: s.color,
      value: s.value,
      share: total ? s.value / total : 0,
      label: s.label,
      cx: c.x,
      cy: c.y,
    });
    angle += sweep;
  }
  return scene;
}

// ── Interaction helpers ────────────────────────────────────────────────────

/** Category (or slice) index under a point, or -1. */
export function chartHitTest(scene: ChartScene, x: number, y: number): number {
  if (scene.type === 'donut') {
    const c = scene.center;
    if (!c) return -1;
    const dx = x - c.cx;
    const dy = y - c.cy;
    const dist = Math.hypot(dx, dy);
    if (dist < c.inner - 6 || dist > c.outer + 6) return -1;
    let angle = Math.atan2(dx, -dy);
    if (angle < 0) angle += Math.PI * 2;
    let start = 0;
    for (const arc of scene.arcs) {
      const end = start + arc.share * Math.PI * 2;
      if (angle >= start && angle <= end) return arc.index;
      start = end;
    }
    return -1;
  }
  const { plot } = scene;
  if (x < plot.x - 4 || x > plot.x + plot.width + 4 || y < plot.y - 4 || y > plot.y + plot.height + 4) return -1;
  // The crosshair snaps to the nearest category, so readers aim at a date, not a line.
  let best = -1;
  let bestDist = Infinity;
  for (const b of scene.bands) {
    const d = scene.horizontal ? Math.abs(y - b.cy) : Math.abs(x - b.cx);
    if (d < bestDist) {
      bestDist = d;
      best = b.index;
    }
  }
  return best;
}

/** Tooltip content for a category (every visible series) or a donut slice. */
export function chartTooltip<T>(spec: ChartSpec<T>, scene: ChartScene, index: number): ChartTooltip | null {
  const format = spec.valueFormat ?? formatNumber;
  if (scene.type === 'donut') {
    const arc = scene.arcs.find((a) => a.index === index);
    if (!arc) return null;
    return {
      title: arc.label,
      rows: [{ label: `${Math.round(arc.share * 1000) / 10}%`, value: format(arc.value), color: arc.color, raw: arc.value }],
    };
  }
  const row = spec.data[index] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    title: scene.categories[index] ?? '',
    rows: scene.legend
      .filter((s) => !s.hidden)
      .map((s) => {
        const raw = num(row[s.key]);
        return { label: s.label, value: raw === null ? '—' : format(raw), color: s.color, raw };
      }),
  };
}

/** The chart's data as a table (the accessible alternative to the picture). */
export function chartTable<T>(spec: ChartSpec<T>, xLabel = 'Category'): { head: string[]; rows: string[][] } {
  const format = spec.valueFormat ?? formatNumber;
  if (spec.type === 'donut') {
    const slices = donutSlices(spec);
    const total = slices.reduce((s, x) => s + x.value, 0);
    return {
      head: [xLabel, spec.series[0]?.label ?? spec.series[0]?.key ?? 'Value', 'Share'],
      rows: slices.map((s) => [s.label, format(s.value), `${total ? Math.round((s.value / total) * 1000) / 10 : 0}%`]),
    };
  }
  const categories = chartCategories(spec);
  return {
    head: [xLabel, ...spec.series.map((s) => s.label ?? s.key)],
    rows: spec.data.map((row, i) => [
      categories[i],
      ...spec.series.map((s) => {
        const v = num((row as Record<string, unknown>)[s.key]);
        return v === null ? '—' : format(v);
      }),
    ]),
  };
}

/** Direction of a signed delta ("+12%", "−0.6 pts", -3) for stat tiles. */
export function deltaDirection(delta: string | number | null | undefined): 'up' | 'down' | 'flat' {
  if (delta === null || delta === undefined) return 'flat';
  const n = typeof delta === 'number' ? delta : Number.parseFloat(String(delta).trim().replace(/^[−–]/, '-').replace(/[^\d.+-]/g, ''));
  if (!Number.isFinite(n) || n === 0) return 'flat';
  return n > 0 ? 'up' : 'down';
}
