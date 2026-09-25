import { Calendar as CalendarIcon, createIcon } from '@manthan/icons';
import { formatDate, type ISODate } from '../core/calendar';
import type { Placement } from '../core/position';
import { datePicker } from '../recipes/advanced';
import { createCalendar, type CalendarControllerOptions } from './calendar';
import { createPopover } from './popover';
import type { Cleanup } from './utils';

export interface DatePickerControllerOptions extends Omit<CalendarControllerOptions, 'onChange'> {
  trigger: HTMLButtonElement;
  /** Form field name; a hidden input carries the ISO value. */
  name?: string;
  placeholder?: string;
  placement?: Placement;
  format?: Intl.DateTimeFormatOptions;
  onChange?: (value: ISODate) => void;
}

/** Plain-DOM date picker: a field-like button that opens a calendar popover. */
export function createDatePicker(options: DatePickerControllerOptions): Cleanup {
  const { trigger, name, placeholder = 'Pick a date', placement = 'bottom-start', format, onChange, ...calendarOptions } = options;
  const s = datePicker({ size: calendarOptions.size });
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  if (name) hidden.name = name;
  trigger.after(hidden);
  const content = document.createElement('div');
  content.className = s.content();
  content.setAttribute('aria-label', 'Choose date');
  document.body.append(content);
  trigger.type = 'button';
  trigger.className = s.trigger(trigger.className);

  const paint = (value: ISODate | null) => {
    hidden.value = value ?? '';
    const label = document.createElement('span');
    label.className = value ? s.value() : s.placeholder();
    label.textContent = value ? formatDate(value, calendarOptions.locale, format) : placeholder;
    trigger.replaceChildren(createIcon(CalendarIcon), label);
  };

  const calendarRoot = document.createElement('div');
  content.append(calendarRoot);
  const live = createCalendar(calendarRoot, {
    ...calendarOptions,
    onChange: (value) => {
      paint(value);
      popover.close();
      onChange?.(value);
    },
  });
  const popover = createPopover({
    trigger,
    content,
    placement,
    autoFocus: false,
    onOpenChange: (open) => open && live.focus(),
  });
  paint(calendarOptions.value ?? null);

  return () => {
    popover.destroy();
    live.destroy();
    content.remove();
    hidden.remove();
  };
}
