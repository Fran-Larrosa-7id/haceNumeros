import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const ARGENTINE_MONEY_FORMATTER = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

@Component({
  selector: 'app-money-input',
  templateUrl: './money-input.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoneyInput),
      multi: true,
    },
  ],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoneyInput implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly describedBy = input<string>();
  readonly invalid = input(false);
  readonly placeholder = input('Ingresá el monto');

  protected readonly displayValue = signal('');
  protected readonly disabled = signal(false);

  private readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('moneyInput');
  private value: number | null = null;
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.value = typeof value === 'number' && Number.isFinite(value) ? value : null;
    this.updateDisplayValue(this.value === null ? '' : formatArgentineMoney(this.value));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected handleInput(event: Event): void {
    const rawValue = (event.target as HTMLInputElement).value;
    this.updateDisplayValue(rawValue);
    this.value = parseArgentineMoney(rawValue);
    this.onChange(this.value);
  }

  protected handleBlur(): void {
    this.onTouched();
    if (this.value !== null) {
      this.updateDisplayValue(formatArgentineMoney(this.value));
    }
  }

  private updateDisplayValue(value: string): void {
    this.displayValue.set(value);
    const inputElement = this.inputElement();
    if (inputElement) {
      inputElement.nativeElement.value = value;
    }
  }
}

export function formatArgentineMoney(value: number): string {
  return ARGENTINE_MONEY_FORMATTER.format(value);
}

export function parseArgentineMoney(rawValue: string): number | null {
  const compactValue = rawValue.trim().replace(/[$\s\u00a0]/g, '');
  if (!compactValue || !/^-?[\d.,]+$/.test(compactValue)) {
    return null;
  }

  const negative = compactValue.startsWith('-');
  const unsignedValue = negative ? compactValue.slice(1) : compactValue;
  if (!unsignedValue || unsignedValue.startsWith('.') || unsignedValue.startsWith(',')) {
    return null;
  }

  const normalized = normalizeSeparators(unsignedValue);
  if (normalized === null || !/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const value = Number(`${negative ? '-' : ''}${normalized}`);
  return Number.isFinite(value) ? value : null;
}

function normalizeSeparators(value: string): string | null {
  const dotCount = countOccurrences(value, '.');
  const commaCount = countOccurrences(value, ',');

  if (dotCount > 0 && commaCount > 0) {
    const decimalSeparator = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
    const groupingSeparator = decimalSeparator === ',' ? '.' : ',';
    const withoutGrouping = value.replaceAll(groupingSeparator, '');
    return replaceDecimalSeparator(withoutGrouping, decimalSeparator);
  }

  if (commaCount > 0) {
    return commaCount === 1 ? replaceDecimalSeparator(value, ',') : null;
  }

  if (dotCount === 0) {
    return value;
  }

  const groups = value.split('.');
  if (groups.slice(1).every((group) => group.length === 3)) {
    return groups.join('');
  }

  if (groups.length === 2) {
    return replaceDecimalSeparator(value, '.');
  }

  const decimalDigits = groups.at(-1)?.length ?? 0;
  if (
    decimalDigits > 0 &&
    decimalDigits <= 2 &&
    groups.slice(1, -1).every((group) => group.length === 3)
  ) {
    return `${groups.slice(0, -1).join('')}.${groups.at(-1)}`;
  }

  return null;
}

function replaceDecimalSeparator(value: string, separator: ',' | '.'): string | null {
  const parts = value.split(separator);
  return parts.length === 1 ? value : parts.length === 2 ? `${parts[0]}.${parts[1]}` : null;
}

function countOccurrences(value: string, character: string): number {
  return value.split(character).length - 1;
}
