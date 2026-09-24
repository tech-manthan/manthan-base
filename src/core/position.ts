export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';
export type Placement = Side | `${Side}-${Exclude<Align, 'center'>}`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionOptions {
  placement?: Placement;
  /** Gap between anchor and floating element. @default 8 */
  offset?: number;
  /** Minimum distance from the viewport edge. @default 8 */
  padding?: number;
  /** Flip to the opposite side when there is not enough room. @default true */
  flip?: boolean;
  /** Slide along the anchor to stay in the viewport. @default true */
  shift?: boolean;
  viewport?: { width: number; height: number };
}

export interface PositionResult {
  x: number;
  y: number;
  placement: Placement;
  side: Side;
  align: Align;
  /** CSS transform-origin that points at the anchor (for scale animations). */
  transformOrigin: string;
}

const opposite: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export function parsePlacement(placement: Placement): [Side, Align] {
  const [side, align = 'center'] = placement.split('-') as [Side, Align?];
  return [side, align];
}

function coords(anchor: Rect, floating: { width: number; height: number }, side: Side, align: Align, offset: number) {
  const vertical = side === 'top' || side === 'bottom';
  let x: number;
  let y: number;
  if (vertical) {
    y = side === 'top' ? anchor.y - floating.height - offset : anchor.y + anchor.height + offset;
    x =
      align === 'start'
        ? anchor.x
        : align === 'end'
          ? anchor.x + anchor.width - floating.width
          : anchor.x + anchor.width / 2 - floating.width / 2;
  } else {
    x = side === 'left' ? anchor.x - floating.width - offset : anchor.x + anchor.width + offset;
    y =
      align === 'start'
        ? anchor.y
        : align === 'end'
          ? anchor.y + anchor.height - floating.height
          : anchor.y + anchor.height / 2 - floating.height / 2;
  }
  return { x, y };
}

function overflows(side: Side, x: number, y: number, floating: { width: number; height: number }, vp: { width: number; height: number }, padding: number) {
  if (side === 'top') return y < padding;
  if (side === 'bottom') return y + floating.height > vp.height - padding;
  if (side === 'left') return x < padding;
  return x + floating.width > vp.width - padding;
}

/**
 * Viewport-relative positioning for `position: fixed` floating layers
 * (tooltips, popovers, menus). Pure function: no DOM access.
 */
export function computePosition(
  anchor: Rect,
  floating: { width: number; height: number },
  options: PositionOptions = {},
): PositionResult {
  const { placement = 'bottom', offset = 8, padding = 8, flip = true, shift = true } = options;
  const vp = options.viewport ?? { width: globalThis.innerWidth ?? 1024, height: globalThis.innerHeight ?? 768 };
  let [side, align] = parsePlacement(placement);
  let { x, y } = coords(anchor, floating, side, align, offset);

  if (flip && overflows(side, x, y, floating, vp, padding)) {
    const flipped = opposite[side];
    const next = coords(anchor, floating, flipped, align, offset);
    if (!overflows(flipped, next.x, next.y, floating, vp, padding)) {
      side = flipped;
      ({ x, y } = next);
    }
  }

  if (shift) {
    const vertical = side === 'top' || side === 'bottom';
    if (vertical) x = Math.min(Math.max(x, padding), Math.max(padding, vp.width - floating.width - padding));
    else y = Math.min(Math.max(y, padding), Math.max(padding, vp.height - floating.height - padding));
  }

  const originX = side === 'left' ? 'right' : side === 'right' ? 'left' : `${anchor.x + anchor.width / 2 - x}px`;
  const originY = side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : `${anchor.y + anchor.height / 2 - y}px`;

  return {
    x: Math.round(x),
    y: Math.round(y),
    side,
    align,
    placement: (align === 'center' ? side : `${side}-${align}`) as Placement,
    transformOrigin: `${originX} ${originY}`,
  };
}
