// The only script a plain-HTML page needs: styles + element definitions.
import './style.css';
import '../src/elements/define';
import { rules, toast } from '../src/index';
import { bindForm } from '../src/dom/index';

// Page glue: everything below is ordinary DOM events on the elements.
const root = document.documentElement;
document.getElementById('style')!.addEventListener('change', (e) => (root.dataset.mnStyle = (e.target as HTMLSelectElement).value));
document.getElementById('palette')!.addEventListener('mn-select', (e) => {
  const { value } = (e as CustomEvent<{ value: string }>).detail;
  if (value === 'profile') toast.info('Profile');
  else root.dataset.mnStyle = value;
});
document.querySelector('mn-menu')!.addEventListener('mn-select', (e) => toast.info(`Menu: ${(e as CustomEvent<{ value: string }>).detail.value}`));
document.getElementById('confirm-delete')!.addEventListener('click', () => toast.error('Project deleted'));
// Validation for a plain form: rules by field name, errors appear in each <mn-field>.
bindForm<Record<string, unknown>>(document.getElementById('signup') as HTMLFormElement, {
  rules: {
    email: [rules.required('Enter your email address.'), rules.email()],
    password: [rules.required('Choose a password.'), rules.minLength(8)],
    terms: rules.required('Accept the terms to continue.'),
  },
  onSubmit: async (values) => {
    await new Promise((r) => setTimeout(r, 600));
    const files = (values.portfolio as File[] | undefined)?.map((f) => f.name).join(', ') || 'none';
    toast.success({ title: 'Account created', description: `${values.email} · framework: ${values.framework} · files: ${files}` });
  },
});
