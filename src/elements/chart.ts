import type { ChartCurve, ChartSeries, ChartType } from '../core/chart';
import { createChart, type ChartController } from '../dom/chart';
import { MnElement } from './base';

/**
 * `<mn-chart type="bar" x="month" label="Revenue">` with `<mn-series key="revenue" label="Revenue">`
 * children and rows from a `<script type="application/json">` child or the `data` property.
 */
export class MnChartElement<T = Record<string, unknown>> extends MnElement {
  static observedAttributes = ['type', 'x', 'label', 'stacked', 'horizontal', 'curve', 'height', 'markers', 'sparkline', 'center-label', 'legend'];
  private seriesDefs: ChartSeries[] = [];
  private rows: T[] = [];
  private controller?: ChartController<T>;

  protected override build() {
    this.seriesDefs = Array.from(this.querySelectorAll('mn-series')).map((el) => ({
      key: el.getAttribute('key') ?? '',
      label: el.getAttribute('label') ?? undefined,
      color: el.getAttribute('color') ?? undefined,
    }));
    const json = this.querySelector('script[type="application/json"]');
    if (json && !this.rows.length) this.rows = JSON.parse(json.textContent || '[]');
    this.replaceChildren();
  }

  private options() {
    const legend = this.attr('legend');
    return {
      type: (this.attr('type') as ChartType) ?? 'line',
      x: this.attr('x') ?? 'x',
      data: this.rows,
      series: this.seriesDefs,
      title: this.attr('label'),
      stacked: this.flag('stacked'),
      horizontal: this.flag('horizontal'),
      curve: (this.attr('curve') as ChartCurve) ?? undefined,
      height: this.attr('height') ? Number(this.attr('height')) : undefined,
      markers: this.flag('markers'),
      sparkline: this.flag('sparkline'),
      centerLabel: this.attr('center-label'),
      legend: legend === undefined ? ('auto' as const) : legend !== 'false',
    };
  }

  protected override update() {
    this.controller?.update(this.options());
  }

  protected override connect() {
    this.controller = createChart<T>(this, {
      ...this.options(),
      onHiddenChange: (hidden) => this.emit('mn-hidden-change', { hidden }),
      onActiveChange: (index) => this.emit('mn-active-change', { index }),
    });
    return () => {
      this.controller?.destroy();
      this.controller = undefined;
    };
  }

  get data(): T[] {
    return this.rows;
  }
  set data(rows: T[]) {
    this.rows = rows;
    this.controller?.update({ data: rows });
  }
  get series(): ChartSeries[] {
    return this.seriesDefs;
  }
  set series(series: ChartSeries[]) {
    this.seriesDefs = series;
    this.controller?.update({ series });
  }
}
