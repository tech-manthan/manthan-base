import './style.css';
import * as I from '@manthan/icons';
import { toSvg, type IconNode } from '@manthan/icons';
import {
  accordion,
  alert,
  avatar,
  avatarGroup,
  badge,
  breadcrumb,
  button,
  buttonGroup,
  card,
  checkbox,
  closeButton,
  designStyles,
  dialog,
  field,
  getPaginationItems,
  heading,
  input,
  inputGroup,
  kbd,
  link,
  menu,
  pagination,
  popover,
  progress,
  progressCircle,
  radio,
  radioGroup,
  select,
  separator,
  skeleton,
  slider,
  spinner,
  switchRecipe,
  table,
  tabs,
  textarea,
  toast,
  type DesignStyle,
  type ThemeMode,
  type Tone,
  calendar,
  combobox,
  command,
  commandDialog,
  formatHotkey,
  todayISO,
  addDays,
  toggleGroup,
} from '../src/index';
import { autoInit, createDataTable, mountToaster } from '../src/dom/index';

const tones: Tone[] = ['primary', 'neutral', 'success', 'info', 'warning', 'danger'];
const icon = (node: IconNode, cls = '', strokeWidth: number | string = 2) => toSvg(node, { class: cls, strokeWidth });

// ── Small markup helpers ────────────────────────────────────────────────

function section(id: string, title: string, lead: string, body: string) {
  return `<section id="${id}" class="scroll-mt-28 flex flex-col gap-5">
    <div class="flex flex-col gap-1">
      <h2 class="${heading({ size: 4 })}">${title}</h2>
      <p class="text-sm text-fg-muted max-w-2xl">${lead}</p>
    </div>
    ${body}
  </section>`;
}

function panel(title: string, body: string, extra = '') {
  const c = card({ size: 'sm' });
  return `<div class="${c.root(extra)}"><div class="text-xs font-medium uppercase tracking-wider text-fg-muted">${title}</div>${body}</div>`;
}

function checkboxEl(label: string, o: { checked?: boolean; indeterminate?: boolean; disabled?: boolean; description?: string } = {}) {
  const s = checkbox();
  return `<label class="${s.label()}"><span class="${s.root()}"><input type="checkbox" class="${s.input()}" ${o.checked ? 'checked' : ''} ${o.disabled ? 'disabled' : ''} ${o.indeterminate ? 'data-indeterminate' : ''} /><span class="${s.control()}">${icon(I.Check, s.check(), 3)}${icon(I.Minus, s.minus(), 3)}</span></span><span class="${s.text()}">${label}${o.description ? `<span class="${s.description()}">${o.description}</span>` : ''}</span></label>`;
}

function radioEl(name: string, label: string, o: { checked?: boolean; disabled?: boolean } = {}) {
  const s = radio();
  return `<label class="${s.label()}"><span class="${s.root()}"><input type="radio" name="${name}" class="${s.input()}" ${o.checked ? 'checked' : ''} ${o.disabled ? 'disabled' : ''} /><span class="${s.control()}"><span class="${s.dot()}"></span></span></span><span class="${s.text()}">${label}</span></label>`;
}

function switchEl(label: string, o: { checked?: boolean; size?: 'sm' | 'md' | 'lg'; tone?: Tone; disabled?: boolean } = {}) {
  const s = switchRecipe({ size: o.size, tone: o.tone });
  return `<label class="${s.label()}"><span class="${s.root()}"><input type="checkbox" role="switch" class="${s.input()}" ${o.checked ? 'checked' : ''} ${o.disabled ? 'disabled' : ''} /><span class="${s.track()}"><span class="${s.thumb()}"></span></span></span>${label}</label>`;
}

function selectEl(options: string[], size?: 'sm' | 'md' | 'lg', id = '') {
  const s = select({ size });
  return `<div class="${s.root()}"><select ${id ? `id="${id}"` : ''} class="${s.select()}">${options.map((o) => `<option>${o}</option>`).join('')}</select>${icon(I.ChevronDown, s.icon())}</div>`;
}

// ── Header / controls ───────────────────────────────────────────────────

const themeButtons: Array<[ThemeMode, IconNode]> = [
  ['light', I.Sun],
  ['dark', I.Moon],
  ['system', I.Monitor],
];

function header() {
  const t = tabs({ variant: 'segmented', size: 'sm' });
  return `<header class="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b-mn border-border bg-bg/80 backdrop-blur-xl">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
      <a href="#top" class="flex items-center gap-2 font-semibold me-auto">
        <span class="inline-flex size-8 items-center justify-center rounded-control bg-accent-9 text-accent-contrast shadow-btn">${icon(I.Sparkles, 'size-4')}</span>
        <span class="mn-heading-type text-lg">Manthan UI</span>
      </a>
      <label class="flex items-center gap-2 text-sm text-fg-muted"><span class="hidden md:inline">Style</span>
        <div class="w-44">${selectEl(designStyles.map((s) => s.label), 'sm', 'style-select')}</div>
      </label>
      <label class="flex items-center gap-2 text-sm text-fg-muted" title="Brand hue"><span class="hidden md:inline">Hue</span>
        <input id="hue" type="range" min="0" max="360" value="272" aria-label="Brand hue" class="${slider({ size: 'sm', class: 'w-24' })}" />
      </label>
      <div role="group" aria-label="Theme" class="${t.list()}">
        ${themeButtons
          .map(
            ([mode, node]) =>
              `<button type="button" role="tab" data-theme-mode="${mode}" aria-label="${mode} theme" class="${t.trigger('px-2')}">${icon(node)}</button>`,
          )
          .join('')}
      </div>
    </div>
    <nav aria-label="Sections" class="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm sm:px-6">
      ${['styles', 'buttons', 'forms', 'data-display', 'overlays', 'feedback', 'navigation', 'advanced']
        .map((id) => `<a href="#${id}" class="${button({ variant: 'ghost', size: 'xs', tone: 'neutral' })}">${id.replace('-', ' ')}</a>`)
        .join('')}
    </nav>
  </header>`;
}

function hero() {
  return `<div id="top" class="flex flex-col items-start gap-5 pt-6">
    <span class="${badge({ variant: 'surface' })}">${icon(I.Zap)} v0.1 · Tailwind CSS v4</span>
    <h1 class="${heading({ size: 1, class: 'mn-heading-glow max-w-3xl' })}">One component library. Eleven design languages. Every stack.</h1>
    <p class="max-w-2xl text-lg text-fg-muted">Manthan UI is built from Tailwind recipes that React, Vue, Svelte, Angular and plain HTML all share. Switch the style above and every component re-skins, from glassmorphism to neo-brutalism.</p>
    <div class="flex flex-wrap gap-3">
      <a href="#buttons" class="${button({ size: 'lg' })}">Explore components ${icon(I.ArrowRight)}</a>
      <a href="#styles" class="${button({ size: 'lg', variant: 'surface', tone: 'neutral' })}">${icon(I.Palette)} Compare styles</a>
    </div>
    <div class="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
      ${['React', 'Vue', 'Svelte', 'Angular'].map((f) => `<span class="${badge({ variant: 'outline', tone: 'neutral' })}">${f}</span>`).join('')}
      <a href="./elements.html" class="${badge({ variant: 'surface' })} hover:underline">HTML / Web Components ${icon(I.ArrowRight)}</a>
    </div>
  </div>`;
}

// ── Style gallery: every design language side by side ───────────────────

function miniSample(style: (typeof designStyles)[number]) {
  const c = card({ size: 'sm' });
  const sw = switchRecipe({ size: 'sm' });
  const p = progress({ size: 'sm' });
  return `<div data-mn-style="${style.id}" class="relative overflow-hidden rounded-xl p-4 ring-1 ring-black/5">
    <div class="${c.root()}">
      <div class="${c.header()}">
        <div class="flex items-center justify-between gap-2">
          <h3 class="${c.title()}">${style.label}</h3>
          <span class="${badge({ size: 'sm' })}">${style.id}</span>
        </div>
        <p class="${c.description('line-clamp-2')}">${style.description}</p>
      </div>
      <input class="${input({ size: 'sm' })}" placeholder="Email address" aria-label="Email (${style.label})" />
      <div class="flex items-center justify-between gap-3">
        <label class="${sw.label()}"><span class="${sw.root()}"><input type="checkbox" role="switch" checked class="${sw.input()}" aria-label="Enabled (${style.label})"/><span class="${sw.track()}"><span class="${sw.thumb()}"></span></span></span></label>
        <div class="${p.root('max-w-28')}"><div class="${p.indicator()}" style="translate:-35% 0"></div></div>
      </div>
      <div class="${c.footer()}">
        <button class="${button({ size: 'sm' })}">Subscribe</button>
        <button class="${button({ size: 'sm', variant: 'surface', tone: 'neutral' })}">Later</button>
        <button class="${button({ size: 'sm', variant: 'soft', tone: 'danger', iconOnly: true })}" aria-label="Delete">${icon(I.Trash)}</button>
      </div>
    </div>
    <p class="mt-3 text-xs text-fg-muted">Inspired by ${style.inspiredBy.join(', ')}</p>
  </div>`;
}

function styleGallery() {
  return section(
    'styles',
    'Design languages',
    'The same recipe rendered in each style. Styles are token maps (plus a few targeted rules), so they can be scoped to any element with <code class="font-mono text-xs">data-mn-style</code>, and mixed on one page.',
    `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${designStyles.map(miniSample).join('')}</div>`,
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────

function buttons() {
  const variants = ['solid', 'soft', 'surface', 'outline', 'ghost', 'link'] as const;
  const matrix = `<div class="overflow-x-auto"><table class="w-full border-separate border-spacing-2 text-sm">
    <thead><tr><th></th>${tones.map((t) => `<th class="text-start font-medium text-fg-muted capitalize">${t}</th>`).join('')}</tr></thead>
    <tbody>${variants
      .map(
        (v) =>
          `<tr><th class="text-start font-medium text-fg-muted capitalize pe-2">${v}</th>${tones
            .map((t) => `<td><button class="${button({ variant: v, tone: t, size: 'sm' })}">Button</button></td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody></table></div>`;

  const sizes = (['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => `<button class="${button({ size: s })}">${s.toUpperCase()}</button>`).join('');
  const withIcons = `
    <button class="${button()}">${icon(I.Download)} Download</button>
    <button class="${button({ variant: 'surface' })}">Continue ${icon(I.ArrowRight)}</button>
    <button class="${button({ variant: 'soft', iconOnly: true })}" aria-label="Settings" data-mn-tooltip="Settings">${icon(I.Settings)}</button>
    <button class="${button({ variant: 'outline', iconOnly: true, tone: 'danger' })}" aria-label="Delete" data-mn-tooltip="Delete forever">${icon(I.Trash)}</button>
    <button class="${button({ variant: 'solid' })}" aria-busy="true" disabled><span class="${spinner({ size: 'sm' })}"></span> Saving…</button>
    <button class="${button({ variant: 'solid' })}" disabled>Disabled</button>`;
  const group = `
    <div class="${buttonGroup({ attached: true })}">
      <button class="${button({ variant: 'surface', tone: 'neutral' })}">${icon(I.Copy)} Copy</button>
      <button class="${button({ variant: 'surface', tone: 'neutral' })}">${icon(I.Share)} Share</button>
      <button class="${button({ variant: 'surface', tone: 'neutral', iconOnly: true })}" aria-label="More">${icon(I.MoreHorizontal)}</button>
    </div>`;

  return section(
    'buttons',
    'Buttons',
    '6 variants × 6 tones × 5 sizes. Tones re-point the 12-step accent scale, so any element can be <code class="font-mono text-xs">tone-danger</code>.',
    `<div class="grid gap-4">${panel('Variants × tones', matrix)}
      <div class="grid gap-4 lg:grid-cols-2">
        ${panel('Sizes', `<div class="flex flex-wrap items-center gap-3">${sizes}</div>`)}
        ${panel('Icons, loading & groups', `<div class="flex flex-wrap items-center gap-3">${withIcons}${group}</div>`)}
      </div></div>`,
  );
}

// ── Forms ───────────────────────────────────────────────────────────────

function forms() {
  const f = field();
  const fr = field({ required: true });
  const ig = inputGroup();
  const inputs = `
    <div class="${fr.root()}"><label class="${fr.label()}" for="email">Email</label>
      <div class="${ig.root()}"><span class="${ig.start()}">${icon(I.Mail)}</span><input id="email" type="email" placeholder="you@example.com" class="${input({ withStart: true })}" /></div>
      <p class="${f.description()}">We'll never share it.</p></div>
    <div class="${f.root()}"><label class="${f.label()}" for="pw">Password</label>
      <div class="${ig.root()}"><input id="pw" type="password" value="hunter2" class="${input({ withEnd: true })}" aria-invalid="true" /><button type="button" class="${ig.end()} ${closeButton()}" aria-label="Show password">${icon(I.Eye)}</button></div>
      <p class="${f.error()}">Password must be at least 12 characters.</p></div>
    <div class="${f.root()}"><label class="${f.label()}" for="fw">Framework</label>${selectEl(['React', 'Vue', 'Svelte', 'Angular', 'Solid', 'Vanilla'], 'md', 'fw')}</div>
    <div class="${f.root()}"><label class="${f.label()}" for="bio">Bio</label><textarea id="bio" class="${textarea({ resize: 'auto' })}" placeholder="This textarea grows as you type"></textarea></div>
    <div class="grid grid-cols-3 gap-2">
      <input class="${input({ size: 'sm' })}" placeholder="Small" aria-label="Small" />
      <input class="${input()}" placeholder="Medium" aria-label="Medium" />
      <input class="${input({ size: 'lg' })}" placeholder="Large" aria-label="Large" />
    </div>
    <input class="${input()}" disabled placeholder="Disabled" aria-label="Disabled" />`;

  const choices = `
    <fieldset class="flex flex-col gap-3"><legend class="${f.label('mb-3')}">Notifications</legend>
      ${checkboxEl('Product updates', { checked: true, description: 'New features and releases.' })}
      ${checkboxEl('Select all', { indeterminate: true })}
      ${checkboxEl('Security alerts', {})}
      ${checkboxEl('Unavailable', { disabled: true })}
    </fieldset>
    <div class="${separator()}"></div>
    <fieldset><legend class="${f.label('mb-3')}">Plan</legend>
      <div role="radiogroup" class="${radioGroup({ orientation: 'horizontal' })}">
        ${radioEl('plan', 'Hobby')}${radioEl('plan', 'Pro', { checked: true })}${radioEl('plan', 'Team')}${radioEl('plan', 'Enterprise', { disabled: true })}
      </div></fieldset>
    <div class="${separator()}"></div>
    <div class="flex flex-wrap gap-x-6 gap-y-3">
      ${switchEl('Wi-Fi', { checked: true })}${switchEl('Small', { size: 'sm' })}${switchEl('Large', { size: 'lg', checked: true, tone: 'success' })}${switchEl('Disabled', { disabled: true })}
    </div>
    <div class="${separator()}"></div>
    <div class="${f.root()}"><label class="${f.label()}" for="vol">Volume</label><input id="vol" type="range" value="60" class="${slider()}" /></div>
    <div class="grid grid-cols-2 gap-4"><input type="range" value="30" class="${slider({ size: 'sm', tone: 'success' })}" aria-label="Small slider" /><input type="range" value="80" class="${slider({ size: 'lg', tone: 'warning' })}" aria-label="Large slider" /></div>`;

  return section(
    'forms',
    'Forms',
    'Native inputs, restyled rather than replaced: they autofill, validate and submit like the platform intends. <code class="font-mono text-xs">&lt;select&gt;</code> becomes a fully styled picker where <code class="font-mono text-xs">appearance: base-select</code> is supported.',
    `<div class="grid gap-4 lg:grid-cols-2">${panel('Text fields', inputs)}${panel('Choices', choices)}</div>`,
  );
}

// ── Data display ────────────────────────────────────────────────────────

function dataDisplay() {
  const c = card();
  const people = [
    ['Ada Lovelace', 'AL', 'primary'],
    ['Alan Turing', 'AT', 'success'],
    ['Grace Hopper', 'GH', 'warning'],
    ['Linus Torvalds', 'LT', 'danger'],
  ] as const;
  const avatars = `<div class="flex flex-wrap items-center gap-3">
      ${(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s, i) => `<span class="${avatar({ size: s, tone: tones[i] }).root()}">${['A', 'MS', 'JD', 'KT', 'RX'][i]}</span>`).join('')}
      <span class="${avatar({ shape: 'square' }).root()}">${icon(I.User, 'size-5')}</span>
      <div class="${avatarGroup()}">${people.map(([, i, t]) => `<span class="${avatar({ size: 'sm', tone: t }).root()}">${i}</span>`).join('')}</div>
    </div>`;
  const badges = `<div class="flex flex-wrap items-center gap-2">
      ${(['solid', 'soft', 'surface', 'outline'] as const).map((v) => `<span class="${badge({ variant: v })}">${v}</span>`).join('')}
      ${tones.map((t) => `<span class="${badge({ tone: t })}">${t}</span>`).join('')}
      <span class="${badge({ tone: 'success', variant: 'surface' })}">${icon(I.CheckCircle)} Verified</span>
    </div>
    <p class="text-sm text-fg-muted">Press ${`<kbd class="${kbd()}">⌘</kbd> <kbd class="${kbd()}">K</kbd>`} to search · ${`<a href="#top" class="${link()}">Read the docs</a>`}</p>`;

  const cards = `<div class="grid gap-4 md:grid-cols-3">
    <article class="${c.root()}">
      <div class="${c.header()}"><p class="${c.description()}">Revenue</p><h3 class="${c.title('text-3xl tabular-nums')}">$48,210</h3></div>
      <div class="flex items-center gap-2 text-sm"><span class="${badge({ tone: 'success' })}">${icon(I.TrendingUp)} 12.5%</span><span class="text-fg-muted">vs last month</span></div>
      <div class="${progress().root()}"><div class="${progress().indicator()}" style="translate:-28% 0"></div></div>
    </article>
    <article class="${c.root()}">
      <div class="flex items-center gap-3"><span class="${avatar({ size: 'lg' }).root()}">GH</span>
        <div class="${c.header()}"><h3 class="${c.title()}">Grace Hopper</h3><p class="${c.description()}">Rear admiral · Compilers</p></div></div>
      <p class="${c.content('text-fg-muted')}">It's easier to ask forgiveness than it is to get permission.</p>
      <div class="${c.footer()}"><button class="${button({ size: 'sm' })}">${icon(I.Plus)} Follow</button><button class="${button({ size: 'sm', variant: 'ghost', tone: 'neutral' })}">${icon(I.MessageCircle)} Message</button></div>
    </article>
    <article class="${card({ interactive: true }).root()}" tabindex="0">
      <div class="${c.header()}"><span class="${badge({ variant: 'solid', size: 'sm' })}">Popular</span><h3 class="${c.title()}">Pro plan</h3><p class="${c.description()}">For growing teams.</p></div>
      <p class="mn-heading-type text-4xl">$29<span class="text-base text-fg-muted font-normal">/mo</span></p>
      <ul class="flex flex-col gap-2 text-sm">${['Unlimited projects', 'All 11 styles', 'Priority support'].map((x) => `<li class="flex items-center gap-2">${icon(I.Check, 'size-4 text-accent-11')}${x}</li>`).join('')}</ul>
    </article>
  </div>`;

  const t = table({ striped: false });
  const rows = [
    ['INV-001', 'Paid', 'success', 'Ada Lovelace', '$250.00'],
    ['INV-002', 'Pending', 'warning', 'Alan Turing', '$150.00'],
    ['INV-003', 'Overdue', 'danger', 'Grace Hopper', '$350.00'],
    ['INV-004', 'Paid', 'success', 'Linus Torvalds', '$450.00'],
  ] as const;
  const tableHtml = `<div class="${t.root()}"><table class="${t.table()}">
    <thead class="${t.header()}"><tr class="${t.row()}"><th class="${t.head()}">Invoice</th><th class="${t.head()}">Status</th><th class="${t.head()}">Customer</th><th class="${t.head('text-end')}">Amount</th></tr></thead>
    <tbody class="${t.body()}">${rows
      .map(
        ([id, s, tone, who, amt]) =>
          `<tr class="${t.row()}"><td class="${t.cell('font-medium')}">${id}</td><td class="${t.cell()}"><span class="${badge({ tone, size: 'sm' })}">${s}</span></td><td class="${t.cell()}">${who}</td><td class="${t.cell('text-end tabular-nums')}">${amt}</td></tr>`,
      )
      .join('')}</tbody>
    <caption class="${t.caption()}">Recent invoices</caption></table></div>`;

  const tb = (variant: 'line' | 'pills' | 'segmented', idp: string) => {
    const s = tabs({ variant });
    const names = ['Overview', 'Analytics', 'Reports', 'Settings'];
    return `<div class="${s.root()}"><div role="tablist" data-mn-tabs aria-label="${variant} tabs" class="${s.list()}">${names
      .map(
        (n, i) =>
          `<button role="tab" id="${idp}-t${i}" aria-controls="${idp}-p${i}" aria-selected="${i === 0}" class="${s.trigger()}" ${i === 3 ? 'disabled' : ''}>${n}</button>`,
      )
      .join('')}</div>${names
      .map(
        (n, i) =>
          `<div role="tabpanel" id="${idp}-p${i}" aria-labelledby="${idp}-t${i}" tabindex="0" class="${s.panel('text-fg-muted')}" ${i ? 'hidden' : ''}>${n} content. Use the arrow keys to move between tabs.</div>`,
      )
      .join('')}</div>`;
  };

  const a = accordion();
  const faq = [
    ['Which frameworks are supported?', 'React, Vue, Svelte and Angular have native bindings. Everything else (Solid, Qwik, Lit, htmx, Rails, Django, Laravel) can use the recipes and the DOM controllers directly.'],
    ['Do I need Tailwind?', 'Yes. Manthan is a Tailwind v4 theme plus class recipes, so you keep full control with utilities.'],
    ['Is it accessible?', 'Components follow WAI-ARIA patterns and lean on native elements (dialog, popover, details, input) for focus management and keyboard support.'],
  ];
  const acc = `<div class="${a.root()}">${faq
    .map(
      ([q, ans], i) =>
        `<details name="faq" class="${a.item()}" ${i === 0 ? 'open' : ''}><summary class="${a.trigger()}">${q}${icon(I.ChevronDown, a.icon())}</summary><div class="${a.content()}">${ans}</div></details>`,
    )
    .join('')}</div>`;

  return section(
    'data-display',
    'Data display',
    'Cards, tables, tabs, accordions, avatars and badges.',
    `<div class="grid gap-4">${cards}
      <div class="grid gap-4 lg:grid-cols-2">${panel('Avatars', avatars)}${panel('Badges, kbd & links', badges)}</div>
      ${tableHtml}
      <div class="grid gap-4 lg:grid-cols-2">
        ${panel('Tabs', `<div class="flex flex-col gap-6">${tb('line', 'ta')}${tb('pills', 'tb')}${tb('segmented', 'tc')}</div>`)}
        ${panel('Accordion (native &lt;details name&gt;)', acc)}
      </div></div>`,
  );
}

// ── Overlays ────────────────────────────────────────────────────────────

function overlays() {
  const d = dialog();
  const dr = dialog({ placement: 'right' });
  const f = field();
  const m = menu();
  const md = menu({ tone: 'danger' });
  const p = popover();
  const dialogs = `
    <dialog id="demo-dialog" class="${d.content()}" aria-labelledby="demo-dialog-title">
      <div class="${d.header()}"><h2 id="demo-dialog-title" class="${d.title()}">Edit profile</h2><p class="${d.description()}">Make changes to your profile. Click save when you're done.</p></div>
      <div class="${d.body('grid gap-4')}">
        <div class="${f.root()}"><label class="${f.label()}" for="dlg-name">Name</label><input id="dlg-name" class="${input()}" value="Ada Lovelace" /></div>
        <div class="${f.root()}"><label class="${f.label()}" for="dlg-user">Username</label><input id="dlg-user" class="${input()}" value="@ada" /></div>
      </div>
      <div class="${d.footer()}"><button class="${button({ variant: 'surface', tone: 'neutral' })}" data-mn-dialog-close>Cancel</button><button class="${button()}" data-mn-dialog-close data-toast-on-click="Profile saved">Save changes</button></div>
      <button class="${closeButton({ class: d.close() })}" data-mn-dialog-close aria-label="Close">${icon(I.X)}</button>
    </dialog>
    <dialog id="demo-drawer" class="${dr.content()}" aria-labelledby="demo-drawer-title">
      <div class="${dr.header()}"><h2 id="demo-drawer-title" class="${dr.title()}">Filters</h2><p class="${dr.description()}">Drawers are dialogs with a placement.</p></div>
      <div class="${dr.body('flex flex-col gap-3')}">${checkboxEl('In stock', { checked: true })}${checkboxEl('On sale')}${checkboxEl('Free shipping', { checked: true })}</div>
      <div class="${dr.footer('mt-auto')}"><button class="${button({ fullWidth: true })}" data-mn-dialog-close>Apply filters</button></div>
      <button class="${closeButton({ class: dr.close() })}" data-mn-dialog-close aria-label="Close">${icon(I.X)}</button>
    </dialog>`;

  const menuHtml = `<button class="${button({ variant: 'surface', tone: 'neutral' })}" data-mn-menu popovertarget="demo-menu">${icon(I.User)} Account ${icon(I.ChevronDown)}</button>
    <div id="demo-menu" popover class="${m.content()}">
      <div class="${m.label()}">ada@example.com</div>
      <button role="menuitem" class="${m.item()}">${icon(I.User)} Profile <span class="${m.shortcut()}">⇧⌘P</span></button>
      <button role="menuitem" class="${m.item()}">${icon(I.CreditCard)} Billing <span class="${m.shortcut()}">⌘B</span></button>
      <button role="menuitem" class="${m.item()}">${icon(I.Settings)} Settings <span class="${m.shortcut()}">⌘,</span></button>
      <button role="menuitem" class="${m.item()}" aria-disabled="true">${icon(I.Users)} Team (soon)</button>
      <div role="separator" class="${m.separator()}"></div>
      <button role="menuitem" class="${md.item('text-accent-11')}">${icon(I.LogOut)} Log out</button>
    </div>`;

  const popoverHtml = `<button class="${button({ variant: 'surface', tone: 'neutral' })}" data-mn-popover popovertarget="demo-popover">${icon(I.Sliders)} Dimensions</button>
    <div id="demo-popover" popover class="${p.content('grid gap-3')}">
      <div><h3 class="${p.title()}">Dimensions</h3><p class="${p.description()}">Set the layer size.</p></div>
      ${['Width', 'Height'].map((l) => `<label class="grid grid-cols-3 items-center gap-2 text-sm">${l}<input class="${input({ size: 'sm', class: 'col-span-2' })}" value="${l === 'Width' ? '100%' : '25px'}" /></label>`).join('')}
    </div>`;

  const toastButtons = (['success', 'info', 'warning', 'danger'] as const)
    .map((t) => `<button class="${button({ variant: 'soft', tone: t, size: 'sm' })}" data-toast="${t}">${t}</button>`)
    .join('');

  return section(
    'overlays',
    'Overlays',
    'Dialog, drawer, popover, menu, tooltip and toast. Built on native <code class="font-mono text-xs">&lt;dialog&gt;</code> and the Popover API: top layer, focus trapping, Escape and light-dismiss come from the platform, with CSS-only enter and exit animations.',
    `${dialogs}<div class="grid gap-4 lg:grid-cols-2">
      ${panel('Dialogs', `<div class="flex flex-wrap gap-3"><button class="${button()}" data-mn-dialog-open="demo-dialog">Open dialog</button><button class="${button({ variant: 'outline' })}" data-mn-dialog-open="demo-drawer">${icon(I.Filter)} Open drawer</button></div>`)}
      ${panel('Menu & popover', `<div class="flex flex-wrap gap-3">${menuHtml}${popoverHtml}</div>`)}
      ${panel('Tooltips', `<div class="flex flex-wrap gap-3">${[
        [I.Type, 'Bold'],
        [I.Link, 'Insert link'],
        [I.Image, 'Upload image'],
        [I.Code, 'Code block'],
      ]
        .map(([n, l]) => `<button class="${button({ variant: 'surface', tone: 'neutral', iconOnly: true })}" aria-label="${l}" data-mn-tooltip="${l}">${icon(n as IconNode)}</button>`)
        .join('')}</div>`)}
      ${panel('Toasts', `<div class="flex flex-wrap gap-2">${toastButtons}<button class="${button({ variant: 'surface', tone: 'neutral', size: 'sm' })}" data-toast="promise">Promise</button><button class="${button({ variant: 'surface', tone: 'neutral', size: 'sm' })}" data-toast="action">With action</button></div>`)}
    </div>`,
  );
}

// ── Feedback ────────────────────────────────────────────────────────────

function feedback() {
  const alertIcons: Record<string, IconNode> = { info: I.Info, success: I.CheckCircle, warning: I.AlertTriangle, danger: I.XCircle };
  const alerts = (
    [
      ['info', 'soft', 'Heads up!', 'You can add components to your app using the CLI.'],
      ['success', 'surface', 'Payment received', 'Your invoice has been paid in full.'],
      ['warning', 'outline', 'Storage almost full', "You've used 92% of your storage."],
      ['danger', 'solid', 'Deployment failed', 'Build exited with code 1.'],
    ] as const
  )
    .map(([t, v, title, desc]) => {
      const a = alert({ tone: t, variant: v });
      return `<div role="alert" class="${a.root()}">${icon(alertIcons[t]!, a.icon())}<div class="${a.content()}"><div class="${a.title()}">${title}</div><div class="${a.description()}">${desc}</div></div></div>`;
    })
    .join('');

  const bars = `<div class="flex flex-col gap-4">
      ${([['sm', 25, 'primary'], ['md', 60, 'success'], ['lg', 85, 'warning']] as const)
        .map(([s, v, t]) => {
          const p = progress({ size: s, tone: t });
          return `<div class="${p.root()}" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><div class="${p.indicator()}" style="translate:-${100 - v}% 0"></div></div>`;
        })
        .join('')}
      <div class="${progress({ indeterminate: true }).root()}" role="progressbar" aria-label="Loading"><div class="${progress({ indeterminate: true }).indicator()}"></div></div>
    </div>`;

  const circle = (value: number, size: 'sm' | 'md' | 'lg' | 'xl', t: Tone, indeterminate = false) => {
    const s = progressCircle({ size, tone: t, indeterminate });
    const r = 16;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - (indeterminate ? 0.25 : value / 100));
    return `<div class="${s.root()}" role="progressbar" aria-valuenow="${value}"><svg viewBox="0 0 40 40" class="${s.svg()}"><circle cx="20" cy="20" r="${r}" stroke-width="4" class="${s.track()}"/><circle cx="20" cy="20" r="${r}" stroke-width="4" stroke-dasharray="${c}" stroke-dashoffset="${offset}" class="${s.indicator()}"/></svg>${indeterminate || size === 'sm' ? '' : `<span class="${s.label()}">${value}%</span>`}</div>`;
  };

  const loaders = `<div class="flex flex-wrap items-center gap-5">
      ${circle(40, 'sm', 'primary')}${circle(65, 'md', 'success')}${circle(80, 'lg', 'info')}${circle(0, 'md', 'primary', true)}
      ${(['xs', 'sm', 'md', 'lg'] as const).map((s) => `<span class="${spinner({ size: s, tone: 'primary' })}" role="status" aria-label="Loading"></span>`).join('')}
    </div>
    <div class="flex items-center gap-3"><span class="${skeleton({ shape: 'circle', class: 'size-12' })}"></span><div class="flex flex-1 flex-col gap-2"><span class="${skeleton({ shape: 'text', class: 'w-2/3' })}"></span><span class="${skeleton({ shape: 'text' })}"></span></div></div>
    <span class="${skeleton({ class: 'h-24 w-full' })}"></span>`;

  return section(
    'feedback',
    'Feedback',
    'Alerts, progress, spinners and skeletons.',
    `<div class="grid gap-4 lg:grid-cols-2"><div class="flex flex-col gap-3">${alerts}</div><div class="flex flex-col gap-4">${panel('Progress', bars)}${panel('Loading', loaders)}</div></div>`,
  );
}

// ── Navigation ──────────────────────────────────────────────────────────

let currentPage = 5;
function paginationHtml() {
  const p = pagination({ variant: 'outline' });
  const items = getPaginationItems({ page: currentPage, total: 12 });
  return `<nav aria-label="Pagination" class="${p.root()}"><ul class="${p.list()}">
    <li><button class="${p.item()}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">${icon(I.ChevronLeft)}</button></li>
    ${items
      .map((it) =>
        typeof it === 'number'
          ? `<li><button class="${p.item()}" data-page="${it}" ${it === currentPage ? 'aria-current="page"' : ''}>${it}</button></li>`
          : `<li class="${p.ellipsis()}" aria-hidden="true">${icon(I.MoreHorizontal, 'size-4')}</li>`,
      )
      .join('')}
    <li><button class="${p.item()}" data-page="${currentPage + 1}" ${currentPage === 12 ? 'disabled' : ''} aria-label="Next page">${icon(I.ChevronRight)}</button></li>
  </ul></nav>`;
}

function navigation() {
  const b = breadcrumb();
  const crumbs = `<nav aria-label="Breadcrumb" class="${b.root()}"><ol class="${b.list()}">
    ${['Home', 'Components', 'Navigation'].map((c) => `<li class="${b.item()}"><a href="#top" class="${b.link()}">${c}</a></li><li role="presentation" aria-hidden="true" class="${b.separator()}">${icon(I.ChevronRight)}</li>`).join('')}
    <li class="${b.item()}"><span aria-current="page" class="${b.page()}">Breadcrumb</span></li></ol></nav>`;
  return section(
    'navigation',
    'Navigation',
    'Breadcrumbs and pagination (the page range comes from <code class="font-mono text-xs">getPaginationItems</code>, shared by every binding).',
    `<div class="grid gap-4 lg:grid-cols-2">${panel('Breadcrumb', crumbs)}${panel('Pagination', `<div id="pagination">${paginationHtml()}</div>`)}</div>`,
  );
}


// ── Advanced: combobox, command palette, calendar, date picker, toggle groups ──

function advanced() {
  const f = field();
  const cb = combobox();
  const frameworks: Array<[string, string, string]> = [
    ['Frontend', 'react', 'React'],
    ['Frontend', 'vue', 'Vue'],
    ['Frontend', 'svelte', 'Svelte'],
    ['Frontend', 'angular', 'Angular'],
    ['Frontend', 'solid', 'SolidJS'],
    ['Frontend', 'qwik', 'Qwik'],
    ['Meta-frameworks', 'next', 'Next.js'],
    ['Meta-frameworks', 'nuxt', 'Nuxt'],
    ['Meta-frameworks', 'sveltekit', 'SvelteKit'],
    ['Meta-frameworks', 'astro', 'Astro'],
    ['Server-rendered', 'htmx', 'htmx'],
    ['Server-rendered', 'rails', 'Ruby on Rails'],
    ['Server-rendered', 'django', 'Django'],
    ['Server-rendered', 'laravel', 'Laravel'],
  ];
  const groups = [...new Set(frameworks.map(([g]) => g))];
  const comboboxHtml = `<div class="${f.root()}"><label class="${f.label()}" for="fw-combobox">Framework</label>
    <div class="${cb.root()}">
      <input id="fw-combobox" data-mn-combobox data-mn-open-on-focus aria-controls="fw-list" placeholder="Search 14 frameworks…" class="${input({ withEnd: true })}" />
      <span class="${cb.trigger('pointer-events-none')}" aria-hidden="true">${icon(I.ChevronsUpDown)}</span>
    </div>
    <div id="fw-list" popover="manual" class="${cb.listbox()}">
      ${groups
        .map(
          (g, gi) => `<div role="group" aria-labelledby="fw-g${gi}" class="${cb.group()}"><div id="fw-g${gi}" class="${cb.groupLabel()}">${g}</div>
          ${frameworks
            .filter(([fg]) => fg === g)
            .map(([, v, l]) => `<div role="option" data-value="${v}" aria-selected="false" class="${cb.option()}">${l}${icon(I.Check, cb.check())}</div>`)
            .join('')}</div>`,
        )
        .join('')}
      <div data-empty hidden class="${cb.empty()}">No framework found.</div>
    </div>
    <p class="${f.description()}">Type to filter; ↑ ↓ to move, Enter to choose. Accent-insensitive ranking.</p></div>`;

  const cmd = command();
  const commands: Array<[string, string, IconNode, string, string?]> = [
    ['Suggestions', 'calendar', I.Calendar, 'Open calendar'],
    ['Suggestions', 'search', I.Search, 'Search docs', 'mod+/'],
    ['Suggestions', 'theme', I.Contrast, 'Toggle dark mode', 'mod+j'],
    ['Settings', 'profile', I.User, 'Profile', 'mod+p'],
    ['Settings', 'billing', I.CreditCard, 'Billing', 'mod+b'],
    ['Settings', 'settings', I.Settings, 'Settings', 'mod+,'],
    ['Styles', 'style-glass', I.Droplet, 'Switch to Glassmorphism'],
    ['Styles', 'style-brutal', I.Square, 'Switch to Neo-brutalism'],
    ['Styles', 'style-neon', I.Zap, 'Switch to Neon'],
  ];
  const cmdGroups = [...new Set(commands.map(([g]) => g))];
  const palette = `<dialog id="cmdk" class="${commandDialog()}" aria-label="Command palette">
    <div data-mn-command class="${cmd.root()}">
      <div class="${cmd.inputWrap()}">${icon(I.Search)}<input class="${cmd.input()}" placeholder="Type a command or search…" aria-label="Command" autofocus /></div>
      <div role="listbox" class="${cmd.list()}">
        ${cmdGroups
          .map(
            (g, gi) => `<div role="group" aria-labelledby="cmd-g${gi}"><div id="cmd-g${gi}" class="${cmd.groupLabel()}">${g}</div>
            ${commands
              .filter(([cg]) => cg === g)
              .map(([, v, n, l, k]) => `<div role="option" data-value="${v}" class="${cmd.item()}">${icon(n)}${l}${k ? `<span class="${cmd.shortcut()}">${formatHotkey(k)}</span>` : ''}</div>`)
              .join('')}</div>`,
          )
          .join('')}
        <div data-empty hidden class="${cmd.empty()}">No results found.</div>
      </div>
      <div class="${cmd.footer()}"><span><kbd class="${kbd()}">↑</kbd> <kbd class="${kbd()}">↓</kbd> navigate</span><span><kbd class="${kbd()}">↵</kbd> select</span><span><kbd class="${kbd()}">esc</kbd> close</span></div>
    </div>
  </dialog>`;

  const tg = (variant: 'segmented' | 'outline' | 'ghost', type: 'single' | 'multiple', items: Array<[string, string | IconNode, boolean?]>, label: string) => {
    const s = toggleGroup({ variant });
    return `<div data-mn-toggle-group="${type}" aria-label="${label}" class="${s.root()}">${items
      .map(
        ([v, content, pressed]) =>
          `<button type="button" data-value="${v}" aria-pressed="${!!pressed}" class="${s.item()}" ${typeof content === 'string' ? '' : `aria-label="${v}"`}>${typeof content === 'string' ? content : icon(content)}</button>`,
      )
      .join('')}</div>`;
  };
  const toggles = `<div class="flex flex-col items-start gap-4">
    ${tg('segmented', 'single', [['day', 'Day'], ['week', 'Week', true], ['month', 'Month'], ['year', 'Year']], 'Range')}
    ${tg('outline', 'multiple', [['bold', I.Bold, true], ['italic', I.Italic], ['underline', I.Underline], ['strikethrough', I.Strikethrough]], 'Text formatting')}
    ${tg('ghost', 'single', [['left', I.AlignLeft, true], ['center', I.AlignCenter], ['right', I.AlignRight], ['justify', I.AlignJustify]], 'Alignment')}
  </div>`;

  const today = todayISO();
  const dates = `<div class="flex flex-wrap items-start gap-6">
      <div data-mn-calendar data-value="${addDays(today, 3)}" data-min="${addDays(today, -30)}" data-max="${addDays(today, 90)}" class="${calendar().root()}"></div>
      <div class="flex min-w-56 flex-1 flex-col gap-4">
        <div class="${f.root()}"><label class="${f.label()}">Due date</label><button data-mn-datepicker data-name="due" data-placeholder="Pick a due date" data-min="${today}"></button><p class="${f.description()}">Past dates are disabled.</p></div>
        <div class="${f.root()}"><label class="${f.label()}">Start date</label><button data-mn-datepicker data-name="start" data-value="${today}"></button></div>
      </div>
    </div>`;

  return section(
    'advanced',
    'Advanced',
    'Combobox, command palette, calendar, date picker and toggle groups. Dates are plain ISO strings, week starts and names follow the locale, and every widget follows the WAI-ARIA keyboard pattern.',
    `${palette}<div class="grid gap-4 lg:grid-cols-2">
      ${panel('Combobox', comboboxHtml)}
      ${panel('Command palette', `<div class="flex flex-col items-start gap-3"><button class="${button({ variant: 'surface', tone: 'neutral', class: 'w-full max-w-xs justify-between' })}" data-mn-dialog-open="cmdk" data-mn-hotkey="mod+k"><span class="flex items-center gap-2">${icon(I.Search)} Search…</span><kbd class="${kbd()}">${formatHotkey('mod+k')}</kbd></button><p class="text-sm text-fg-muted">Press ${formatHotkey('mod+k')} anywhere on this page.</p></div>`)}
      ${panel('Calendar & date picker', dates)}
      ${panel('Toggle groups', toggles)}
    </div>
    ${panel('Data table: sort, search, select, paginate', '<div id="invoices"></div>')}`,
  );
}

// ── Mount ───────────────────────────────────────────────────────────────

const app = document.getElementById('app')!;
app.innerHTML = `${header()}<main class="mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-24 sm:px-6">${hero()}${styleGallery()}${buttons()}${forms()}${dataDisplay()}${overlays()}${feedback()}${navigation()}${advanced()}</main>
  <footer class="border-t-mn border-border py-8 text-center text-sm text-fg-muted">Manthan UI · MIT · Built with Tailwind CSS v4</footer>`;

document.querySelectorAll<HTMLInputElement>('input[data-indeterminate]').forEach((el) => (el.indeterminate = true));
autoInit();
mountToaster();

// Theme + style controls (?style=glass&theme=dark is also supported for deep links).
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const readStored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

const styleSelect = document.getElementById('style-select') as HTMLSelectElement;
function setStyle(id: DesignStyle) {
  root.dataset.mnStyle = id;
  styleSelect.selectedIndex = designStyles.findIndex((s) => s.id === id);
  store('mn-style', id);
}
function setMode(mode: ThemeMode) {
  root.dataset.mnTheme = mode;
  document.querySelectorAll<HTMLElement>('[data-theme-mode]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.themeMode === mode)));
  store('mn-theme', mode);
}
styleSelect.addEventListener('change', () => setStyle(designStyles[styleSelect.selectedIndex]!.id));
document.querySelectorAll<HTMLElement>('[data-theme-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.themeMode as ThemeMode)));
const hue = document.getElementById('hue') as HTMLInputElement;
hue.addEventListener('input', () => root.style.setProperty('--mn-primary-h', hue.value));

const initialStyle = (params.get('style') ?? readStored('mn-style') ?? 'default') as DesignStyle;
setStyle(designStyles.some((s) => s.id === initialStyle) ? initialStyle : 'default');
const viewerTheme = root.getAttribute('data-theme');
setMode((params.get('theme') ?? readStored('mn-theme') ?? (viewerTheme === 'dark' || viewerTheme === 'light' ? viewerTheme : 'system')) as ThemeMode);

// Toast demos
document.addEventListener('click', (event) => {
  const target = (event.target as Element).closest<HTMLElement>('[data-toast],[data-toast-on-click],[data-page]');
  if (!target) return;
  if (target.dataset.toastOnClick) toast.success(target.dataset.toastOnClick);
  if (target.dataset.page) {
    currentPage = Math.min(12, Math.max(1, Number(target.dataset.page)));
    document.getElementById('pagination')!.innerHTML = paginationHtml();
    document.querySelector<HTMLElement>('#pagination [aria-current=page]')?.focus();
  }
  const kind = target.dataset.toast;
  if (!kind) return;
  if (kind === 'promise') {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1600)), {
      loading: { title: 'Deploying…', description: 'Building 42 routes' },
      success: { title: 'Deployed', description: 'Your site is live.' },
      error: 'Deploy failed',
    });
  } else if (kind === 'action') {
    toast({ title: 'Message archived', description: '1 conversation moved to Archive.', action: { label: 'Undo', onClick: () => toast.info('Restored') } });
  } else {
    const titles: Record<string, [string, string]> = {
      success: ['Changes saved', 'Your profile has been updated.'],
      info: ['New version available', 'Reload to get v0.2.0.'],
      warning: ['Low disk space', 'Only 2 GB remaining.'],
      danger: ['Upload failed', 'The file exceeds 10 MB.'],
    };
    const [title, description] = titles[kind]!;
    toast.show({ title, description, tone: kind as Tone });
  }
});

// Command palette actions
const palette = document.getElementById('cmdk') as HTMLDialogElement;
palette.addEventListener('mn-select', (event) => {
  const value = (event as CustomEvent<string>).detail;
  palette.close();
  if (value.startsWith('style-')) setStyle(value.slice(6) as DesignStyle);
  else if (value === 'theme') setMode(root.dataset.mnTheme === 'dark' ? 'light' : 'dark');
  else toast.info({ title: 'Command', description: value });
});
palette.addEventListener('close', () => {
  const input = palette.querySelector('input')!;
  input.value = '';
  input.dispatchEvent(new Event('input'));
});

// Data table demo
const customers = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Linus Torvalds', 'Margaret Hamilton', 'Dennis Ritchie', 'Barbara Liskov', 'Ken Thompson', 'Radia Perlman', 'Tim Berners-Lee', 'Frances Allen', 'Donald Knuth'];
const statuses = ['Paid', 'Pending', 'Overdue', 'Refunded'];
const invoices = Array.from({ length: 36 }, (_, i) => ({
  id: `INV-${String(1042 + i)}`,
  customer: customers[(i * 5) % customers.length]!,
  status: statuses[(i * 7 + (i >> 2)) % 4]!,
  amount: Math.round(((i * 7919) % 4800) + 120 + ((i * 37) % 100) / 100) ,
  issued: addDays(todayISO(), -((i * 3) % 90)),
}));
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
createDataTable(document.getElementById('invoices')!, {
  rows: invoices,
  getRowId: (row) => row.id,
  selectable: true,
  pageSize: 8,
  caption: 'Invoices issued in the last 90 days',
  columns: [
    { key: 'id', header: 'Invoice', width: '8rem' },
    { key: 'customer', header: 'Customer' },
    { key: 'status', header: 'Status' },
    { key: 'issued', header: 'Issued', format: (v) => new Date(`${v}T12:00`).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
    { key: 'amount', header: 'Amount', align: 'end', format: (v) => money.format(v as number) },
  ],
});
