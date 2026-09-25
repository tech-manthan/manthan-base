// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { defineElements, type MnDataTableElement, type MnDialogElement } from '../src/elements/index';

beforeAll(() => defineElements());
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('custom elements', () => {
  it('renders a native button with recipe classes', () => {
    document.body.innerHTML = `<mn-button variant="soft" tone="danger" loading type="submit">Delete</mn-button>`;
    const button = document.querySelector('mn-button button') as HTMLButtonElement;
    expect(button.textContent).toContain('Delete');
    expect(button.type).toBe('submit');
    expect(button.className).toContain('mn-btn-soft');
    expect(button.className).toContain('tone-danger');
    expect(button.disabled).toBe(true);
    document.querySelector('mn-button')!.removeAttribute('loading');
    expect(button.disabled).toBe(false);
  });

  it('posts form values from inputs, switches, selects and comboboxes', () => {
    document.body.innerHTML = `
      <form>
        <mn-field label="Email" error="Required">
          <mn-input name="email" type="email" value="ada@example.com" start-icon="mail"></mn-input>
        </mn-field>
        <mn-switch name="wifi" checked>Wi-Fi</mn-switch>
        <mn-checkbox name="terms" value="yes">I agree</mn-checkbox>
        <mn-select name="plan"><option>Free</option><option selected>Pro</option></mn-select>
        <mn-combobox name="framework" value="vue"><optgroup label="UI"><option value="react">React</option><option value="vue">Vue</option></optgroup></mn-combobox>
      </form>`;
    const data = new FormData(document.querySelector('form')!);
    expect(Object.fromEntries(data)).toEqual({ email: 'ada@example.com', wifi: 'on', plan: 'Pro', framework: 'vue' });
    const email = document.querySelector('mn-input input') as HTMLInputElement;
    const label = document.querySelector('mn-field label') as HTMLLabelElement;
    expect(label.htmlFor).toBe(email.id);
    expect(email.getAttribute('aria-invalid')).toBe('');
    expect(email.getAttribute('aria-describedby')).toContain('error');
    expect((document.querySelector('mn-combobox input[role=combobox]') as HTMLInputElement).value).toBe('Vue');
    expect(document.querySelector('mn-switch input')!.getAttribute('role')).toBe('switch');
  });

  it('opens a dialog from a data-mn-open button and closes it', () => {
    document.body.innerHTML = `
      <button data-mn-open="edit">Edit</button>
      <mn-dialog id="edit" heading="Edit profile">Body <div slot="footer"><button data-mn-close>Cancel</button></div></mn-dialog>`;
    const el = document.getElementById('edit') as MnDialogElement;
    const onChange = vi.fn();
    el.addEventListener('mn-open-change', onChange);
    (document.querySelector('[data-mn-open]') as HTMLElement).click();
    expect(el.dialog.open).toBe(true);
    expect(el.dialog.textContent).toContain('Edit profile');
    (el.querySelector('[data-mn-close]') as HTMLElement).click();
    expect(el.dialog.open).toBe(false);
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('switches tabs and emits changes', () => {
    document.body.innerHTML = `
      <mn-tabs variant="pills"><mn-tab value="a">A</mn-tab><mn-tab value="b">B</mn-tab>
        <mn-tab-panel value="a">First</mn-tab-panel><mn-tab-panel value="b">Second</mn-tab-panel></mn-tabs>`;
    const tabs = document.querySelector('mn-tabs')!;
    const onChange = vi.fn();
    tabs.addEventListener('mn-change', (e) => onChange((e as CustomEvent).detail));
    const [a, b] = Array.from(tabs.querySelectorAll<HTMLButtonElement>('[role=tab]'));
    expect(a!.getAttribute('aria-selected')).toBe('true');
    b!.click();
    expect(onChange).toHaveBeenCalledWith({ value: 'b' });
    expect((tabs.querySelector('mn-tab-panel[value=b]') as HTMLElement).hidden).toBe(false);
    expect((tabs.querySelector('mn-tab-panel[value=a]') as HTMLElement).hidden).toBe(true);
  });

  it('builds menus and emits the chosen value', () => {
    document.body.innerHTML = `
      <mn-menu><button>Account</button>
        <mn-menu-label>ada@example.com</mn-menu-label>
        <mn-menu-item value="profile" icon="user" shortcut="⌘P">Profile</mn-menu-item>
        <mn-menu-separator></mn-menu-separator>
        <mn-menu-item value="logout" tone="danger">Log out</mn-menu-item></mn-menu>`;
    const menu = document.querySelector('mn-menu')!;
    const onSelect = vi.fn();
    menu.addEventListener('mn-select', (e) => onSelect((e as CustomEvent).detail));
    const items = menu.querySelectorAll<HTMLElement>('[role=menuitem]');
    expect(items).toHaveLength(2);
    items[1]!.click();
    expect(onSelect).toHaveBeenCalledWith({ value: 'logout' });
  });

  it('renders a data table from inline JSON', async () => {
    document.body.innerHTML = `
      <mn-data-table page-size="2" selectable>
        <mn-column key="id" header="Invoice"></mn-column>
        <mn-column key="amount" header="Amount" align="end"></mn-column>
        <script type="application/json">[{"id":"A","amount":3},{"id":"B","amount":1},{"id":"C","amount":2}]</script>
      </mn-data-table>`;
    const table = document.querySelector('mn-data-table') as MnDataTableElement;
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(table.textContent).toContain('1–2 of 3');
    table.rows = [{ id: 'Z', amount: 9 }];
    await tick();
    expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(table.textContent).toContain('Z');
  });

  it('renders icons, badges, alerts and progress', () => {
    document.body.innerHTML = `
      <mn-icon name="check" size="16"></mn-icon>
      <mn-badge tone="success">Paid</mn-badge>
      <mn-alert tone="warning" heading="Careful">Details</mn-alert>
      <mn-progress value="25"></mn-progress>
      <mn-avatar alt="Grace Hopper"></mn-avatar>`;
    expect(document.querySelector('mn-icon svg')!.getAttribute('width')).toBe('16');
    expect(document.querySelector('mn-badge')!.className).toContain('tone-success');
    expect(document.querySelector('mn-alert')!.getAttribute('role')).toBe('alert');
    expect((document.querySelector('mn-progress div') as HTMLElement).style.translate).toBe('-75% 0');
    expect(document.querySelector('mn-avatar')!.textContent).toBe('GH');
  });
});

describe('author classes', () => {
  it('keeps classes written on the element', () => {
    document.body.innerHTML = `<mn-badge class="ms-2" tone="info">x</mn-badge><mn-select class="w-44"><option>a</option></mn-select>`;
    expect(document.querySelector('mn-badge')!.className).toMatch(/mn-badge.* ms-2$/);
    document.querySelector('mn-badge')!.setAttribute('tone', 'danger');
    expect(document.querySelector('mn-badge')!.className).toContain('ms-2');
    expect(document.querySelector('mn-select')!.className).toContain('w-44');
  });
});
