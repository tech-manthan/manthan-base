import { createForm, type FormOptions, type FormStore, type FormValues } from '../core/form';
import { on, type Cleanup } from './utils';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function readControl(form: HTMLFormElement, name: string): unknown {
  const controls = Array.from(form.elements).filter((el): el is Control => (el as Control).name === name);
  if (!controls.length) return undefined;
  const first = controls[0]!;
  if (first instanceof HTMLInputElement && first.type === 'checkbox') {
    return controls.length > 1 ? controls.filter((c) => (c as HTMLInputElement).checked).map((c) => c.value) : first.checked;
  }
  if (first instanceof HTMLInputElement && first.type === 'radio') return (controls.find((c) => (c as HTMLInputElement).checked) as HTMLInputElement | undefined)?.value ?? '';
  if (first instanceof HTMLInputElement && first.type === 'file') return Array.from(first.files ?? []);
  return first.value;
}

export interface BindFormOptions<V extends FormValues> extends Omit<FormOptions<V>, 'initialValues'> {
  /** Defaults to the form's current values. */
  initialValues?: V;
}

/**
 * Validate a plain `<form>` with Manthan rules. Fields are matched by `name`; errors
 * appear on the enclosing `<mn-field>` (its `error` attribute) or in `[data-mn-error="name"]`,
 * and the control gets `aria-invalid`.
 */
export function bindForm<V extends FormValues>(form: HTMLFormElement, options: BindFormOptions<V>): { store: FormStore<V>; destroy: Cleanup } {
  const names = [...new Set(Array.from(form.elements).map((el) => (el as Control).name).filter(Boolean))];
  const read = () => Object.fromEntries(names.map((n) => [n, readControl(form, n)])) as V;
  const store = createForm<V>({ ...options, initialValues: options.initialValues ?? read() });
  form.noValidate = true;

  const render = () => {
    for (const name of Object.keys({ ...store.getSnapshot().values, ...options.rules })) {
      const error = store.visibleError(name as keyof V);
      const control = Array.from(form.elements).find((el) => (el as Control).name === name) as HTMLElement | undefined;
      const fieldEl = control?.closest('mn-field') ?? form.querySelector(`mn-field[data-for="${name}"]`);
      if (fieldEl) {
        if (error) fieldEl.setAttribute('error', error);
        else fieldEl.removeAttribute('error');
      } else {
        const slot = form.querySelector<HTMLElement>(`[data-mn-error="${name}"]`);
        if (slot) slot.textContent = error ?? '';
        control?.setAttribute('aria-invalid', String(!!error));
      }
    }
    form.toggleAttribute('aria-busy', store.getSnapshot().submitting);
  };

  const nameOf = (e: Event) => (e.target as Control).name;
  const cleanups: Cleanup[] = [
    store.subscribe(render),
    on(form, 'input', (e) => nameOf(e) && store.setValue(nameOf(e) as keyof V, readControl(form, nameOf(e)) as V[keyof V])),
    on(form, 'change', (e) => {
      if (!nameOf(e)) return;
      store.setValue(nameOf(e) as keyof V, readControl(form, nameOf(e)) as V[keyof V]);
      const type = (e.target as HTMLInputElement).type;
      if (type === 'checkbox' || type === 'radio' || type === 'file' || e.target instanceof HTMLSelectElement) store.blur(nameOf(e) as keyof V);
    }),
    on(form, 'focusout', (e) => nameOf(e) && store.blur(nameOf(e) as keyof V)),
    on(form, 'submit', (e) => {
      store.setValues(read());
      void store.submit(e).then((ok) => {
        if (!ok) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
    }),
    on(form, 'reset', () => setTimeout(() => store.reset(read()))),
  ];
  return { store, destroy: () => cleanups.forEach((c) => c()) };
}
