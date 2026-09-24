export type ThemeMode = 'light' | 'dark' | 'system';

export interface DesignStyleInfo {
  id: DesignStyle;
  label: string;
  description: string;
  /** Design systems and movements the style borrows from. */
  inspiredBy: string[];
  /** Web fonts the style prefers (loaded by you; every style falls back to system fonts). */
  fonts: string[];
}

export const designStyles = [
  {
    id: 'default',
    label: 'Default',
    description: 'Crisp, neutral and accessible. The baseline every other style re-maps.',
    inspiredBy: ['Radix Themes', 'shadcn/ui', 'Linear'],
    fonts: ['Inter'],
  },
  {
    id: 'glass',
    label: 'Glassmorphism',
    description: 'Frosted translucent layers floating over a vivid mesh gradient.',
    inspiredBy: ['Apple visionOS', 'Liquid Glass', 'Windows 11 Mica'],
    fonts: ['Inter'],
  },
  {
    id: 'neu',
    label: 'Neumorphism',
    description: 'Soft UI: controls extruded from, and pressed into, one continuous surface.',
    inspiredBy: ['Soft UI (Alexander Plyuto)', 'neumorphism.io'],
    fonts: ['Poppins'],
  },
  {
    id: 'brutal',
    label: 'Neo-brutalism',
    description: 'Thick ink outlines, hard offset shadows and loud flat colour.',
    inspiredBy: ['Gumroad', 'neobrutalism.dev', 'Figma Config'],
    fonts: ['Space Grotesk'],
  },
  {
    id: 'material',
    label: 'Material 3',
    description: 'Tonal surfaces, pill buttons, state layers and elevation.',
    inspiredBy: ['Material Design 3', 'Android'],
    fonts: ['Roboto Flex'],
  },
  {
    id: 'fluent',
    label: 'Fluent 2',
    description: 'Calm neutrals, 4px corners, acrylic flyouts and underline focus.',
    inspiredBy: ['Microsoft Fluent 2', 'Windows 11'],
    fonts: ['Segoe UI Variable'],
  },
  {
    id: 'clay',
    label: 'Claymorphism',
    description: 'Puffy, inflated pastel shapes with inner highlights and bouncy motion.',
    inspiredBy: ['Claymorphism (Michał Malewicz)', '3D clay illustration'],
    fonts: ['Nunito'],
  },
  {
    id: 'retro',
    label: 'Retro 8-bit',
    description: 'Pixel bevels, square corners and stepped motion.',
    inspiredBy: ['NES.css', '8-bit game UIs'],
    fonts: ['Press Start 2P', 'Silkscreen', 'VT323'],
  },
  {
    id: 'neon',
    label: 'Neon / Cyberpunk',
    description: 'Always-dark synthwave grid with glowing outlines and text.',
    inspiredBy: ['Cyberpunk 2077 UI', 'Synthwave', 'Tron'],
    fonts: ['Orbitron', 'Rajdhani'],
  },
  {
    id: 'minimal',
    label: 'Minimal / Swiss',
    description: 'Monochrome, hairlines, sharp corners and no shadows.',
    inspiredBy: ['Vercel Geist', 'Swiss / International Style'],
    fonts: ['Helvetica Neue'],
  },
  {
    id: 'skeuo',
    label: 'Skeuomorphic',
    description: 'Glossy gel buttons, bevels and tactile textures.',
    inspiredBy: ['Mac OS X Aqua', 'iOS 6'],
    fonts: ['Lucida Grande'],
  },
] as const satisfies ReadonlyArray<Omit<DesignStyleInfo, 'id'> & { id: string }>;

export type DesignStyle = (typeof designStyles)[number]['id'];

export const designStyleIds = designStyles.map((s) => s.id) as DesignStyle[];

export interface ApplyThemeOptions {
  mode?: ThemeMode;
  style?: DesignStyle;
  /** Element that receives the data attributes. @default document.documentElement */
  target?: HTMLElement;
}

/** Set `data-mn-theme` / `data-mn-style` on the document (or any scope element). */
export function applyTheme({ mode, style, target }: ApplyThemeOptions): void {
  const el = target ?? document.documentElement;
  if (mode) el.dataset.mnTheme = mode;
  if (style) el.dataset.mnStyle = style;
}

/** The theme actually rendered for a mode (resolves `system`). */
export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
