import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from '../../../../shared/ui/date-picker/date-picker';
import { Icon } from '../../../../shared/ui/icon/icon';
import { MoneyInput } from '../../../../shared/ui/money-input/money-input';
import {
  DismissalCalculationInput,
  YesNoUnknown,
} from '../../domain/dismissal-compensation.models';

@Component({
  selector: 'app-dismissal-calculator-form',
  imports: [ReactiveFormsModule, DatePicker, Icon, MoneyInput],
  templateUrl: './dismissal-calculator-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DismissalCalculatorForm {
  readonly calculateRequested = output<DismissalCalculationInput>();
  readonly invalidSubmitted = output<void>();
  readonly cleared = output<void>();

  protected readonly form = new FormGroup({
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    dismissalDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    article245Base: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(1_000_000_000_000),
    ]),
    useSameSalaryForNotice: new FormControl(true, { nonNullable: true }),
    currentMonthlySalary: new FormControl<number | null>({ value: null, disabled: true }, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(1_000_000_000_000),
    ]),
    terminationFundStatus: new FormControl<YesNoUnknown>('no', { nonNullable: true }),
    trialPeriodStatus: new FormControl<YesNoUnknown>('no', { nonNullable: true }),
    noticeStatus: new FormControl<YesNoUnknown>('no', { nonNullable: true }),
    cctCap: new FormControl<number | null>(null, [
      Validators.min(0.01),
      Validators.max(1_000_000_000_000),
    ]),
  });

  protected hasError(
    controlName:
      'startDate' | 'dismissalDate' | 'article245Base' | 'currentMonthlySalary' | 'cctCap',
  ): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.controls.useSameSalaryForNotice.value) {
      this.form.controls.currentMonthlySalary.setValue(this.form.controls.article245Base.value);
    }

    if (this.form.invalid) {
      this.invalidSubmitted.emit();
      return;
    }

    const raw = this.form.getRawValue();
    this.calculateRequested.emit({
      startDate: raw.startDate,
      dismissalDate: raw.dismissalDate,
      article245Base: raw.article245Base as number,
      currentMonthlySalary: (raw.useSameSalaryForNotice
        ? raw.article245Base
        : raw.currentMonthlySalary) as number,
      terminationFundStatus: raw.terminationFundStatus,
      trialPeriodStatus: raw.trialPeriodStatus,
      noticeStatus: raw.noticeStatus,
      cctCap: raw.cctCap,
    });
  }

  protected reset(): void {
    this.form.reset({
      startDate: '',
      dismissalDate: '',
      article245Base: null,
      useSameSalaryForNotice: true,
      currentMonthlySalary: null,
      terminationFundStatus: 'no',
      trialPeriodStatus: 'no',
      noticeStatus: 'no',
      cctCap: null,
    });
    this.form.controls.currentMonthlySalary.disable();
    this.cleared.emit();
  }

  protected setChoice(
    controlName: 'terminationFundStatus' | 'trialPeriodStatus' | 'noticeStatus',
    value: YesNoUnknown,
  ): void {
    this.form.controls[controlName].setValue(value);
    this.cleared.emit();
  }

  protected toggleSameSalary(): void {
    const nextValue = !this.form.controls.useSameSalaryForNotice.value;
    this.form.controls.useSameSalaryForNotice.setValue(nextValue);
    if (nextValue) {
      this.form.controls.currentMonthlySalary.disable();
    } else {
      this.form.controls.currentMonthlySalary.enable();
    }
    if (nextValue)
      this.form.controls.currentMonthlySalary.setValue(this.form.controls.article245Base.value);
    this.cleared.emit();
  }
}
