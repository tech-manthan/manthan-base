// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createForm, formatBytes, matchesAccept, rules, runRules, validateFiles } from '../src/index';
import { createDropzone } from '../src/dom/index';
import { defineElements } from '../src/elements/index';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('validation rules', () => {
  it('validates common cases', () => {
    expect(rules.required()('')).toBeTruthy();
    expect(rules.required()(false)).toBeTruthy();
    expect(rules.email()('ada@example.com')).toBeUndefined();
    expect(rules.email()('ada@')).toMatch(/email/);
    expect(rules.email()('')).toBeUndefined(); // optional unless required
    expect(rules.url()('ftp://x.dev')).toBeTruthy();
    expect(rules.url()('https://x.dev')).toBeUndefined();
    expect(rules.minLength(3)('ab')).toMatch(/3/);
    expect(rules.max(10)('11')).toBeTruthy();
    expect(rules.matches('password')('a', { password: 'b' })).toBeTruthy();
  });

  it('returns the first error and supports async rules', async () => {
    expect(runRules('', {}, [rules.required('Need it'), rules.minLength(2)])).toBe('Need it');
    const taken = async (v: unknown) => (v === 'ada' ? 'That username is taken.' : undefined);
    await expect(runRules('ada', {}, [rules.required(), taken])).resolves.toBe('That username is taken.');
  });
});

describe('form store', () => {
  const make = (onSubmit = vi.fn()) =>
    createForm({
      initialValues: { email: '', password: '', confirm: '', terms: false },
      rules: {
        email: [rules.required(), rules.email()],
        password: [rules.required(), rules.minLength(8)],
        confirm: rules.matches('password', 'Passwords do not match.'),
        terms: rules.required('Accept the terms to continue.'),
      },
      onSubmit,
    });

  it('shows errors only after blur or submit', async () => {
    const form = make();
    form.setValue('email', 'nope');
    expect(form.field('email').error).toBeUndefined();
    form.blur('email');
    expect(form.field('email').error).toMatch(/email/);
    form.setValue('email', 'ada@example.com'); // revalidates on change once erroring
    expect(form.field('email').error).toBeUndefined();
    expect(form.getSnapshot().dirty).toBe(true);
  });

  it('blocks invalid submits and calls onSubmit when valid', async () => {
    const onSubmit = vi.fn();
    const form = make(onSubmit);
    const preventDefault = vi.fn();
    expect(await form.submit({ preventDefault })).toBe(false);
    expect(preventDefault).toHaveBeenCalled();
    expect(form.visibleError('terms')).toBe('Accept the terms to continue.');
    form.setValues({ email: 'ada@example.com', password: 'correcthorse', confirm: 'correcthorse', terms: true });
    expect(await form.submit()).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correcthorse', confirm: 'correcthorse', terms: true });
    form.reset();
    expect(form.getSnapshot()).toMatchObject({ dirty: false, submitCount: 0, errors: {} });
  });

  it('re-validates dependants (confirm password) when the source changes', async () => {
    const form = make();
    form.setValue('password', 'correcthorse');
    form.setValue('confirm', 'correcthorse');
    form.blur('confirm');
    expect(form.field('confirm').error).toBeUndefined();
    form.setValue('password', 'batterystaple'); // confirm was visited, so it re-checks now
    expect(form.field('confirm').error).toBe('Passwords do not match.');
    form.setValue('confirm', 'batterystaple');
    expect(form.field('confirm').error).toBeUndefined();
  });
});

describe('file helpers', () => {
  const file = (name: string, type: string, size: number) => ({ name, type, size });
  it('formats sizes and matches accept lists', () => {
    expect(formatBytes(1536, 'en-US')).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024, 'en-US')).toBe('5 MB');
    expect(matchesAccept(file('a.PNG', 'image/png', 1), 'image/*')).toBe(true);
    expect(matchesAccept(file('a.pdf', 'application/pdf', 1), '.pdf, image/*')).toBe(true);
    expect(matchesAccept(file('a.exe', 'application/x-msdownload', 1), '.pdf,image/*')).toBe(false);
  });
  it('splits accepted files and rejections', () => {
    const { accepted, rejected } = validateFiles(
      [file('a.png', 'image/png', 10), file('b.exe', 'x/y', 10), file('c.png', 'image/png', 9999), file('d.png', 'image/png', 10)],
      { accept: 'image/*', maxSize: 1000, maxFiles: 2, existing: 1 },
    );
    expect(accepted.map((f) => f.name)).toEqual(['a.png']);
    expect(rejected.map((r) => r.reason)).toEqual(['type', 'size', 'count']);
  });
});

describe('dropzone', () => {
  beforeAll(() => defineElements());

  it('opens the picker from the keyboard and takes dropped files', () => {
    document.body.innerHTML = `<div id="z"></div><input id="i" type="file">`;
    const zone = document.getElementById('z')!;
    const input = document.getElementById('i') as HTMLInputElement;
    const onFiles = vi.fn();
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    createDropzone({ zone, input, onFiles });
    expect(zone.getAttribute('role')).toBe('button');
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(click).toHaveBeenCalled();
    const drop = new Event('drop', { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown };
    const f = new File(['x'], 'a.txt', { type: 'text/plain' });
    drop.dataTransfer = { files: [f], types: ['Files'] };
    zone.dispatchEvent(drop);
    expect(onFiles).toHaveBeenCalledWith([f]);
  });

  it('lists files, rejects bad ones and removes on request in <mn-file-upload>', async () => {
    document.body.innerHTML = `<mn-file-upload name="docs" accept=".pdf" multiple max-files="2"></mn-file-upload>`;
    const el = document.querySelector('mn-file-upload') as HTMLElement & { value: File[] };
    await flush();
    const zone = el.querySelector('[role=button]')!;
    const drop = (files: File[]) => {
      const e = new Event('drop', { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown };
      e.dataTransfer = { files, types: ['Files'] };
      zone.dispatchEvent(e);
    };
    drop([new File(['1'], 'a.pdf', { type: 'application/pdf' }), new File(['2'], 'b.png', { type: 'image/png' })]);
    expect(el.value.map((f) => f.name)).toEqual(['a.pdf']);
    expect(el.textContent).toContain("b.png: this file type isn't allowed.");
    expect(zone.getAttribute('aria-invalid')).toBe('true');
    (el.querySelector('[aria-label="Remove a.pdf"]') as HTMLElement).click();
    expect(el.value).toEqual([]);
  });
});

import { bindForm } from '../src/dom/index';

describe('bindForm', () => {
  it('validates a plain form and posts only when valid', async () => {
    document.body.innerHTML = `
      <form>
        <mn-field label="Email"><mn-input name="email" type="email"></mn-input></mn-field>
        <input name="age" type="number"><span data-mn-error="age"></span>
        <label><input type="checkbox" name="terms"> I agree</label>
        <button>Send</button>
      </form>`;
    await flush();
    const form = document.querySelector('form')!;
    const onSubmit = vi.fn();
    bindForm(form, { rules: { email: [rules.required(), rules.email()], age: rules.min(18, 'You must be 18 or older.'), terms: rules.required('Accept the terms.') }, onSubmit });
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.querySelector('mn-field')!.getAttribute('error')).toBe('This field is required.');
    const age = form.querySelector<HTMLInputElement>('[name=age]')!;
    age.value = '12';
    age.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('[data-mn-error=age]')!.textContent).toBe('You must be 18 or older.');
    expect(age.getAttribute('aria-invalid')).toBe('true');

    const email = form.querySelector<HTMLInputElement>('input[name=email]')!;
    email.value = 'ada@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    age.value = '36';
    age.dispatchEvent(new Event('input', { bubbles: true }));
    form.querySelector<HTMLInputElement>('[name=terms]')!.click();
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', age: '36', terms: true });
    expect(document.querySelector('mn-field')!.hasAttribute('error')).toBe(false);
  });
});
