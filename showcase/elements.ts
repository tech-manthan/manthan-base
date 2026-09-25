// The only script a plain-HTML page needs: styles + element definitions.
import './style.css';
import '../src/elements/define';
import { toast } from '../src/index';

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
document.getElementById('signup')!.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
  toast.success({ title: 'Form submitted', description: JSON.stringify(data) });
});
