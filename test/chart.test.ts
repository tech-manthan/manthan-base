// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  arcPath,
  barPath,
  buildChartScene,
  chartColor,
  chartHitTest,
  chartTable,
  chartTooltip,
  deltaDirection,
  donutSlices,
  linePath,
  niceTicks,
  type ChartSpec,
} from '../src/index';
import { createChart } from '../src/dom';
import { defineElements } from '../src/elements';

const data = [
  { month: 'Jan', a: 10, b: 5 },
  { month: 'Feb', a: 30, b: 12 },
  { month: 'Mar', a: 20, b: null },
  { month: 'Apr', a: 45, b: 18 },
];
const base: ChartSpec<(typeof data)[number]> = {
  type: 'line',
  data,
  x: 'month',
  series: [
    { key: 'a', label: 'Alpha' },
    { key: 'b', label: 'Beta' },
  ],
};

describe('chart core', () => {
  it('rounds domains to clean ticks', () => {
    expect(niceTicks(0, 47, 5)).toEqual({ domain: [0, 50], ticks: [0, 10, 20, 30, 40, 50] });
    expect(niceTicks(3, 3).domain).toEqual([0, 3]);
    expect(niceTicks(-12, 7, 4).ticks).toEqual([-15, -10, -5, 0, 5, 10]);
  });

  it('assigns palette slots by position and never cycles', () => {
    expect(chartColor(undefined, 1)).toBe('var(--mn-chart-1)');
    expect(chartColor(undefined, 9)).toBe('var(--mn-chart-other)');
    expect(chartColor(3, 1)).toBe('var(--mn-chart-3)');
    expect(chartColor('accent', 1)).toBe('var(--mn-accent-9)');
    expect(chartColor('#f00', 1)).toBe('#f00');
  });

  it('reads the direction of a delta', () => {
    expect(deltaDirection('+12.4%')).toBe('up');
    expect(deltaDirection('−0.6 pts')).toBe('down');
    expect(deltaDirection(-3)).toBe('down');
    expect(deltaDirection('0%')).toBe('flat');
  });

  it('draws gaps for missing values', () => {
    const d = linePath([{ x: 0, y: 0 }, { x: 1, y: 1 }, null, { x: 3, y: 3 }, { x: 4, y: 2 }]);
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it('rounds only the data end of a bar', () => {
    expect(barPath({ x: 0, y: 0, width: 20, height: 50 }, 4, 'top')).toContain('a4,4');
    expect(barPath({ x: 0, y: 0, width: 20, height: 50 }, 4, null)).not.toContain('a');
    // radius never exceeds half the thickness
    expect(barPath({ x: 0, y: 0, width: 4, height: 50 }, 8, 'top')).toContain('a2,2');
  });

  it('builds arcs, including a full ring', () => {
    expect(arcPath(50, 50, 30, 50, 0, Math.PI, 2)).toMatch(/^M.*A50,50.*L.*A30,30.*Z$/);
    expect(arcPath(50, 50, 30, 50, 0, Math.PI * 2).match(/A/g)).toHaveLength(4);
  });

  it('lays out a line chart with ticks, end dots and direct labels', () => {
    const scene = buildChartScene(base, { width: 600, height: 240 });
    expect(scene.lines).toHaveLength(2);
    expect(scene.yTicks.map((t) => t.text)).toContain('40');
    expect(scene.xTicks.map((t) => t.text)).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
    // one end dot per series, on the last non-null point
    expect(scene.dots.map((d) => [d.series, d.index])).toEqual([
      [0, 3],
      [1, 3],
    ]);
    expect(scene.labels.map((l) => l.text)).toEqual(['Alpha', 'Beta']);
    expect(scene.bands).toHaveLength(4);
  });

  it('fits line and sparkline domains to the data, but grows bars from zero', () => {
    const high = data.map((d) => ({ ...d, a: d.a + 200, b: null }));
    const line = buildChartScene({ ...base, data: high }, { width: 600, height: 240 });
    expect(line.yTicks.map((t) => t.text)).not.toContain('0');
    const bar = buildChartScene({ ...base, type: 'bar', data: high }, { width: 600, height: 240 });
    expect(bar.yTicks[0].text).toBe('0');
    const spark = buildChartScene({ ...base, type: 'area', sparkline: true, data: high }, { width: 200, height: 40 });
    const ys = spark.points[0].points.map((p) => p!.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20);
  });

  it('drops direct labels that would collide', () => {
    const close = data.map((d) => ({ ...d, b: d.a }));
    const scene = buildChartScene({ ...base, data: close }, { width: 600, height: 240 });
    expect(scene.labels).toHaveLength(0);
  });

  it('keeps colours when a series is hidden', () => {
    const scene = buildChartScene({ ...base, hidden: ['a'] }, { width: 600, height: 240 });
    expect(scene.lines).toHaveLength(1);
    expect(scene.lines[0].color).toBe('var(--mn-chart-2)');
    expect(scene.legend.map((s) => s.hidden)).toEqual([true, false]);
  });

  it('groups and stacks bars with rounded outer ends only', () => {
    const grouped = buildChartScene({ ...base, type: 'bar' }, { width: 600, height: 240 });
    expect(grouped.bars).toHaveLength(7); // one null
    expect(Math.max(...grouped.bars.map((b) => b.rect.width))).toBeLessThanOrEqual(24);
    const stacked = buildChartScene({ ...base, type: 'bar', stacked: true }, { width: 600, height: 240, radius: 4 });
    const jan = stacked.bars.filter((b) => b.index === 0);
    expect(jan[0].d).not.toContain('a4'); // inner segment is square
    expect(jan[1].d).toContain('a4'); // outer segment carries the rounded end
    // 2px surface gap between segments
    expect(jan[0].rect.y - (jan[1].rect.y + jan[1].rect.height)).toBeCloseTo(2);
  });

  it('supports horizontal bars and negative values', () => {
    const scene = buildChartScene(
      { type: 'bar', horizontal: true, x: 'k', data: [{ k: 'Up', v: 5 }, { k: 'Down', v: -3 }], series: [{ key: 'v' }] },
      { width: 400, height: 200 },
    );
    expect(scene.horizontal).toBe(true);
    expect(scene.yTicks.map((t) => t.text)).toEqual(['Up', 'Down']);
    const [up, down] = scene.bars;
    expect(up.rect.x).toBeCloseTo(scene.baseline!.x1);
    expect(down.rect.x + down.rect.width).toBeCloseTo(scene.baseline!.x1);
  });

  it('folds donut slices past eight into Other', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ name: `S${i}`, v: 10 - i }));
    const slices = donutSlices({ type: 'donut', x: 'name', data: rows, series: [{ key: 'v' }] });
    expect(slices).toHaveLength(8);
    expect(slices[7]).toMatchObject({ label: 'Other', value: 6, color: 'var(--mn-chart-other)' });
  });

  it('hit-tests, and builds tooltips and the accessible table', () => {
    const scene = buildChartScene(base, { width: 600, height: 240 });
    const band = scene.bands[1];
    expect(chartHitTest(scene, band.cx + 3, band.y + 10)).toBe(1);
    expect(chartHitTest(scene, 0, 0)).toBe(-1);
    expect(chartTooltip(base, scene, 2)).toEqual({
      title: 'Mar',
      rows: [
        { label: 'Alpha', value: '20', color: 'var(--mn-chart-1)', raw: 20 },
        { label: 'Beta', value: '—', color: 'var(--mn-chart-2)', raw: null },
      ],
    });
    expect(chartTable(base, 'Month')).toEqual({
      head: ['Month', 'Alpha', 'Beta'],
      rows: [
        ['Jan', '10', '5'],
        ['Feb', '30', '12'],
        ['Mar', '20', '—'],
        ['Apr', '45', '18'],
      ],
    });

    const donut: ChartSpec = { type: 'donut', x: 'k', data: [{ k: 'A', v: 1 }, { k: 'B', v: 3 }], series: [{ key: 'v' }] };
    const ds = buildChartScene(donut, { width: 200, height: 200 });
    // B spans 90°–360°, so 9 o'clock is B.
    expect(chartHitTest(ds, 100 - 80, 100)).toBe(1);
    expect(chartHitTest(ds, 100, 100)).toBe(-1); // the hole
    expect(chartTooltip(donut, ds, 1)?.rows[0]).toMatchObject({ label: '75%', value: '3' });
  });
});

describe('createChart', () => {
  it('renders marks, legend and table, and toggles series', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const hiddenChanges: string[][] = [];
    const chart = createChart(root, { ...base, title: 'Revenue', onHiddenChange: (h) => hiddenChanges.push(h) });
    const svg = root.querySelector('svg')!;
    expect(svg.getAttribute('aria-label')).toBe('Revenue');
    expect(root.querySelectorAll('.mn-chart-line')).toHaveLength(2);
    expect(root.querySelectorAll('table tbody tr')).toHaveLength(4);
    const buttons = root.querySelectorAll<HTMLButtonElement>('[role=group] button');
    expect(buttons).toHaveLength(2);
    buttons[0].click();
    expect(hiddenChanges).toEqual([['a']]);
    expect(root.querySelectorAll('.mn-chart-line')).toHaveLength(1);
    expect(root.querySelector('.mn-chart-line')!.getAttribute('style')).toContain('--mn-chart-2');
    // hiding the last visible series is refused
    root.querySelectorAll<HTMLButtonElement>('[role=group] button')[1].click();
    expect(root.querySelectorAll('.mn-chart-line')).toHaveLength(1);
    chart.destroy();
  });

  it('shows the tooltip from the keyboard', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const active: number[] = [];
    createChart(root, { ...base, type: 'bar', onActiveChange: (i) => active.push(i) });
    const svg = root.querySelector('svg')!;
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(active).toEqual([0, 1]);
    const tip = root.querySelector<HTMLElement>('[aria-hidden=true][data-open]')!;
    expect(tip.textContent).toContain('Feb');
    expect(tip.textContent).toContain('Alpha30');
    expect(root.querySelectorAll('.mn-chart-bar[data-active]')).toHaveLength(2);
    expect(root.querySelector('[aria-live]')!.textContent).toBe('Feb: Alpha 30, Beta 12');
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.hasAttribute('data-active')).toBe(false);
  });

  it('renders through <mn-chart>', () => {
    defineElements();
    document.body.innerHTML = `
      <mn-chart type="donut" x="k" label="Share" center-label="Total" class="mine">
        <mn-series key="v" label="Visits"></mn-series>
        <script type="application/json">[{"k":"A","v":2},{"k":"B","v":6}]</script>
      </mn-chart>`;
    const el = document.querySelector('mn-chart')!;
    expect(el.classList.contains('mine')).toBe(true);
    expect(el.querySelectorAll('.mn-chart-arc')).toHaveLength(2);
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Share');
    el.setAttribute('type', 'bar');
    expect(el.querySelectorAll('.mn-chart-bar')).toHaveLength(2);
  });
});
