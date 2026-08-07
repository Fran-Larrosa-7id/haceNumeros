import { ChangeDetectionStrategy, Component, signal, output } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from '../../../../shared/ui/date-picker/date-picker';
import { Icon } from '../../../../shared/ui/icon/icon';
import { MoneyInput } from '../../../../shared/ui/money-input/money-input';
import {
  SAC_DEFAULT_YEAR,
  SAC_MONTH_NAMES,
  SAC_PAYMENT_DATES,
  SAC_YEAR_OPTIONS,
} from '../../domain/sac.constants';
import { getSemesterBounds } from '../../domain/sac-calculation';
import {
  SacInputMode,
  SacMonthValue,
  SacSemester,
  SacWorkPeriodMode,
} from '../../domain/sac.models';

export interface SacFormSubmission {
  readonly semester: SacSemester;
  readonly year: number;
  readonly inputMode: SacInputMode;
  readonly workPeriodMode: SacWorkPeriodMode;
  readonly bestRemuneration: number | null;
  readonly monthlyValues: readonly SacMonthValue[];
  readonly startDate: string;
  readonly endDate: string;
}

@Component({
  selector: 'app-sac-calculator-form',
  imports: [ReactiveFormsModule, DatePicker, Icon, MoneyInput],
  templateUrl: './sac-calculator-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SacCalculatorForm {
  readonly calculateRequested = output<SacFormSubmission>();
  readonly invalidSubmitted = output<void>();
  readonly cleared = output<void>();

  protected readonly yearOptions = SAC_YEAR_OPTIONS;
  protected readonly monthlyError = signal(false);
  protected readonly dateRangeError = signal('');
  protected readonly form = new FormGroup({
    semester: new FormControl<SacSemester>('first', { nonNullable: true }),
    year: new FormControl(SAC_DEFAULT_YEAR, { nonNullable: true }),
    inputMode: new FormControl<SacInputMode>('manual-best', { nonNullable: true }),
    workPeriodMode: new FormControl<SacWorkPeriodMode>('full-semester', { nonNullable: true }),
    bestRemuneration: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(1_000_000_000_000),
    ]),
    monthlyValues: new FormArray(
      Array.from(
        { length: 6 },
        () =>
          new FormControl<number | null>({ value: null, disabled: true }, [
            Validators.min(0.01),
            Validators.max(1_000_000_000_000),
          ]),
      ),
    ),
    startDate: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    endDate: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
  });

  protected semester(): SacSemester {
    return this.form.controls.semester.value;
  }

  protected inputMode(): SacInputMode {
    return this.form.controls.inputMode.value;
  }

  protected workPeriodMode(): SacWorkPeriodMode {
    return this.form.controls.workPeriodMode.value;
  }

  protected monthSlots(): readonly {
    readonly index: number;
    readonly month: number;
    readonly label: string;
  }[] {
    const firstMonth = this.semester() === 'first' ? 1 : 7;
    return Array.from({ length: 6 }, (_, index) => ({
      index,
      month: firstMonth + index,
      label: SAC_MONTH_NAMES[firstMonth + index - 1],
    }));
  }

  protected semesterBounds(): { readonly startDate: string; readonly endDate: string } {
    return getSemesterBounds(this.form.controls.year.value, this.semester());
  }

  protected paymentDate(): string {
    return SAC_PAYMENT_DATES[this.semester()];
  }

  protected changeSemester(semester: SacSemester): void {
    if (semester === this.semester()) return;
    this.form.controls.semester.setValue(semester);
    this.resetDependentValues();
  }

  protected changeWorkPeriodMode(mode: SacWorkPeriodMode): void {
    if (mode === this.workPeriodMode()) return;
    this.form.controls.workPeriodMode.setValue(mode);
    const dates = [this.form.controls.startDate, this.form.controls.endDate];
    for (const control of dates) {
      control.reset('');
      if (mode === 'proportional') {
        control.enable();
        control.setValidators([Validators.required]);
      } else {
        control.clearValidators();
        control.disable();
      }
      control.updateValueAndValidity({ emitEvent: false });
    }
    this.dateRangeError.set('');
    this.cleared.emit();
  }

  protected changeInputMode(mode: SacInputMode): void {
    if (mode === this.inputMode()) return;
    this.form.controls.inputMode.setValue(mode);
    const manual = this.form.controls.bestRemuneration;
    if (mode === 'monthly-values') {
      manual.reset(null);
      manual.disable();
      this.form.controls.monthlyValues.controls.forEach((control) => control.enable());
    } else {
      this.form.controls.monthlyValues.reset();
      this.form.controls.monthlyValues.controls.forEach((control) => control.disable());
      manual.enable();
    }
    this.monthlyError.set(false);
    this.cleared.emit();
  }

  protected hasError(controlName: 'bestRemuneration' | 'startDate' | 'endDate'): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  protected monthlyControl(index: number): FormControl<number | null> {
    return this.form.controls.monthlyValues.controls[index];
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.monthlyError.set(false);
    this.dateRangeError.set('');

    const monthlyValues = this.getMonthlyValues();
    if (
      this.inputMode() === 'monthly-values' &&
      !monthlyValues.some((value) => (value.remuneration ?? 0) > 0)
    ) {
      this.monthlyError.set(true);
    }
    if (this.workPeriodMode() === 'proportional') this.validateDateRange();

    if (this.form.invalid || this.monthlyError() || this.dateRangeError()) {
      this.invalidSubmitted.emit();
      return;
    }

    const raw = this.form.getRawValue();
    this.calculateRequested.emit({
      semester: raw.semester,
      year: raw.year,
      inputMode: raw.inputMode,
      workPeriodMode: raw.workPeriodMode,
      bestRemuneration: raw.bestRemuneration,
      monthlyValues,
      startDate: raw.startDate,
      endDate: raw.endDate,
    });
  }

  protected reset(): void {
    this.form.reset({
      semester: 'first',
      year: SAC_DEFAULT_YEAR,
      inputMode: 'manual-best',
      workPeriodMode: 'full-semester',
      bestRemuneration: null,
      monthlyValues: [null, null, null, null, null, null],
      startDate: '',
      endDate: '',
    });
    this.form.controls.bestRemuneration.enable();
    this.form.controls.monthlyValues.controls.forEach((control) => control.disable());
    this.form.controls.startDate.disable();
    this.form.controls.endDate.disable();
    this.monthlyError.set(false);
    this.dateRangeError.set('');
    this.cleared.emit();
  }

  private getMonthlyValues(): readonly SacMonthValue[] {
    return this.monthSlots().map(({ index, month }) => ({
      month,
      remuneration: this.form.controls.monthlyValues.controls[index].value,
    }));
  }

  private validateDateRange(): void {
    const { startDate, endDate } = this.form.getRawValue();
    if (!startDate || !endDate) return;
    const bounds = this.semesterBounds();
    if (startDate < bounds.startDate || endDate > bounds.endDate) {
      this.dateRangeError.set('Las fechas deben estar dentro del semestre y año seleccionados.');
    } else if (startDate > endDate) {
      this.dateRangeError.set('La fecha de inicio no puede ser posterior a la fecha de fin.');
    }
  }

  protected resetDependentValues(): void {
    this.form.controls.monthlyValues.reset();
    this.form.controls.startDate.reset('');
    this.form.controls.endDate.reset('');
    this.monthlyError.set(false);
    this.dateRangeError.set('');
    this.cleared.emit();
  }
}
