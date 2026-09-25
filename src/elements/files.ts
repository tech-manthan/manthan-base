import { File as FileIcon, Upload, X, createIcon } from '@manthan/icons';
import { formatBytes, validateFiles } from '../core/files';
import { fileUpload } from '../recipes/advanced';
import { closeButton } from '../recipes/overlay';
import { createDropzone, setInputFiles } from '../dom/dropzone';
import { MnElement } from './base';

/**
 * `<mn-file-upload name="attachments" accept="image/*,.pdf" max-size="5242880" max-files="3" multiple
 *    label="Drop files here or browse" hint="PNG, JPG or PDF up to 5 MB"></mn-file-upload>`
 * The chosen files post with the surrounding form. Emits `mn-change` with `{ files }`.
 */
export class MnFileUploadElement extends MnElement {
  static observedAttributes = ['label', 'hint', 'disabled'];
  readonly input = document.createElement('input');
  private zone = document.createElement('div');
  private titleEl = document.createElement('p');
  private hintEl = document.createElement('p');
  private list = document.createElement('ul');
  private errors = document.createElement('div');
  private files: File[] = [];

  protected override build() {
    const s = fileUpload();
    this.setClass(s.root());
    this.input.type = 'file';
    this.input.className = 'sr-only';
    this.input.tabIndex = -1;
    this.input.name = this.attr('name') ?? '';
    if (this.attr('accept')) this.input.accept = this.attr('accept')!;
    this.input.multiple = this.flag('multiple');
    this.zone.className = s.dropzone();
    const icon = Object.assign(document.createElement('span'), { className: s.icon() });
    icon.append(createIcon(Upload));
    this.titleEl.className = s.title();
    this.hintEl.className = s.hint();
    this.zone.append(icon, this.titleEl, this.hintEl);
    this.list.className = s.list();
    this.errors.className = s.errors();
    this.errors.setAttribute('role', 'alert');
    this.append(this.zone, this.input, this.errors, this.list);
    (this.closest('mn-field') as { wire?(el: HTMLElement): void } | null)?.wire?.(this.zone);
  }
  protected override update() {
    this.titleEl.textContent = this.attr('label') ?? 'Drop files here, or click to browse';
    this.hintEl.textContent = this.attr('hint') ?? '';
    this.hintEl.hidden = !this.attr('hint');
    this.zone.setAttribute('aria-label', this.titleEl.textContent);
    this.zone.setAttribute('aria-disabled', String(this.flag('disabled')));
    this.input.disabled = this.flag('disabled');
  }
  protected override connect() {
    return createDropzone({ zone: this.zone, input: this.input, onFiles: (files) => this.add(files) });
  }

  private add(incoming: File[]) {
    const multiple = this.flag('multiple');
    const { accepted, rejected } = validateFiles(incoming, {
      accept: this.attr('accept'),
      maxSize: this.attr('max-size') ? Number(this.attr('max-size')) : undefined,
      maxFiles: multiple ? (this.attr('max-files') ? Number(this.attr('max-files')) : undefined) : 1,
      existing: multiple ? this.files.length : 0,
    });
    this.files = multiple ? [...this.files, ...accepted] : accepted.length ? accepted : this.files;
    this.errors.replaceChildren(...rejected.map((r) => Object.assign(document.createElement('p'), { textContent: r.message })));
    this.zone.setAttribute('aria-invalid', String(rejected.length > 0));
    this.sync();
  }
  removeFile(index: number) {
    this.files = this.files.filter((_, i) => i !== index);
    this.sync();
  }
  get value(): File[] {
    return this.files;
  }

  private sync() {
    setInputFiles(this.input, this.files);
    const s = fileUpload();
    this.list.replaceChildren(
      ...this.files.map((file, index) => {
        const li = Object.assign(document.createElement('li'), { className: s.item() });
        const icon = Object.assign(document.createElement('span'), { className: s.itemIcon() });
        icon.append(createIcon(FileIcon));
        const body = Object.assign(document.createElement('div'), { className: s.itemBody() });
        body.append(
          Object.assign(document.createElement('span'), { className: s.itemName(), textContent: file.name }),
          Object.assign(document.createElement('span'), { className: s.itemMeta(), textContent: formatBytes(file.size) }),
        );
        const remove = Object.assign(document.createElement('button'), { type: 'button', className: closeButton() });
        remove.setAttribute('aria-label', `Remove ${file.name}`);
        remove.append(createIcon(X));
        remove.addEventListener('click', () => this.removeFile(index));
        li.append(icon, body, remove);
        return li;
      }),
    );
    this.emit('mn-change', { files: this.files });
  }
}
