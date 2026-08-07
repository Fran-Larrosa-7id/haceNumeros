import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  forwardRef,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type AirDatepicker from 'air-datepicker';
import type { AirDatepickerLocale } from 'air-datepicker';
import { Icon } from '../icon/icon';

export type DatePickerMode = 'day' | 'month';

@Component({
  selector: 'app-date-picker',
  imports: [Icon],
  templateUrl: './date-picker.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePicker),
      multi: true,
    },
  ],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePicker implements ControlValueAccessor, OnDestroy {
  readonly inputId = input.required<string>();
  readonly mode = input<DatePickerMode>('day');
  readonly describedBy = input<string>();
  readonly invalid = input(false);

  protected readonly displayValue = signal('');
  protected readonly disabled = signal(false);

  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('pickerInput');
  private picker?: AirDatepicker<HTMLInputElement>;
  private modelValue = '';
  private destroyed = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    afterNextRender(() => void this.initialize());

    effect(() => {
      const mode = this.mode();
      if (!this.picker) {
        return;
      }

      this.picker.update(
        {
          dateFormat: mode === 'month' ? 'MMMM yyyy' : 'dd/MM/yyyy',
          minView: mode === 'month' ? 'months' : 'days',
          view: mode === 'month' ? 'months' : 'days',
        },
        { silent: true },
      );
      this.displayValue.set(formatModelValue(this.modelValue, mode));
      void this.syncPickerSelection();
    });
  }

  writeValue(value: string | null): void {
    this.modelValue = value ?? '';
    this.displayValue.set(formatModelValue(this.modelValue, this.mode()));
    void this.syncPickerSelection();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected acceptNormalizedValue(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!toDate(value, this.mode())) {
      return;
    }

    this.modelValue = value;
    this.displayValue.set(formatModelValue(value, this.mode()));
    this.onChange(value);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.picker?.destroy();
  }

  private async initialize(): Promise<void> {
    const { default: AirDatepicker } = await import('air-datepicker');

    if (this.destroyed) {
      return;
    }

    const monthMode = this.mode() === 'month';
    const selectedDate = toDate(this.modelValue, this.mode());
    this.picker = new AirDatepicker(this.inputElement().nativeElement, {
      locale: SPANISH_LOCALE,
      autoClose: true,
      buttons: ['clear', 'today'],
      dateFormat: monthMode ? 'MMMM yyyy' : 'dd/MM/yyyy',
      minView: monthMode ? 'months' : 'days',
      view: monthMode ? 'months' : 'days',
      position: 'bottom left',
      selectedDates: selectedDate ? [selectedDate] : false,
      onSelect: ({ date }) => {
        const selectedDate = Array.isArray(date) ? date[0] : date;
        const value = selectedDate instanceof Date ? toModelValue(selectedDate, this.mode()) : '';
        this.modelValue = value;
        this.displayValue.set(formatModelValue(value, this.mode()));
        this.onChange(value);
        this.onTouched();
      },
      onHide: (isAnimationComplete) => {
        if (isAnimationComplete) {
          this.onTouched();
        }
      },
    });
  }

  private async syncPickerSelection(): Promise<void> {
    if (!this.picker) {
      return;
    }

    const date = toDate(this.modelValue, this.mode());
    if (!date) {
      this.picker.clear({ silent: true });
      return;
    }

    await this.picker.selectDate(date, { silent: true });
  }
}

const SPANISH_LOCALE: AirDatepickerLocale = {
  days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  daysShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  daysMin: ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'],
  months: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthsShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  today: 'Hoy',
  clear: 'Limpiar',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  firstDay: 1,
};

function toDate(value: string, mode: DatePickerMode): Date | null {
  const pattern = mode === 'month' ? /^(\d{4})-(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = pattern.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day = '1'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}

function toModelValue(date: Date, mode: DatePickerMode): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return mode === 'month' ? `${year}-${month}` : `${year}-${month}-${day}`;
}

function formatModelValue(value: string, mode: DatePickerMode): string {
  const date = toDate(value, mode);
  if (!date) {
    return '';
  }

  if (mode === 'month') {
    return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
