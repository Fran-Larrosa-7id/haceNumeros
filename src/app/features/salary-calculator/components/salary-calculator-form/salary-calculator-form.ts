import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '../../../../shared/ui/icon/icon';
import { MoneyInput } from '../../../../shared/ui/money-input/money-input';
import {
  SalaryCalculationInput,
  SalaryCalculationMode,
} from '../../domain/salary-calculation.models';

export interface SalaryFormSubmission extends SalaryCalculationInput {
  readonly mode: SalaryCalculationMode;
}

@Component({
  selector: 'app-salary-calculator-form',
  imports: [ReactiveFormsModule, Icon, MoneyInput],
  templateUrl: './salary-calculator-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryCalculatorForm {
  readonly calculateRequested = output<SalaryFormSubmission>();
  readonly invalidSubmitted = output<void>();
  readonly cleared = output<void>();

  protected readonly form = new FormGroup({
    mode: new FormControl<SalaryCalculationMode>('gross-to-net', { nonNullable: true }),
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(1_000_000_000_000),
    ]),
    otherDiscounts: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(1_000_000_000_000),
    ]),
  });

  protected mode(): SalaryCalculationMode {
    return this.form.controls.mode.value;
  }
  protected amountLabel(): string {
    return this.mode() === 'gross-to-net' ? 'Sueldo bruto mensual' : 'Sueldo neto deseado';
  }
  protected actionLabel(): string {
    return this.mode() === 'gross-to-net' ? 'Calcular sueldo neto' : 'Calcular sueldo bruto';
  }
  protected hasError(name: 'amount' | 'otherDiscounts'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  protected changeMode(mode: SalaryCalculationMode): void {
    if (mode === this.mode()) return;
    this.form.reset({ mode, amount: null, otherDiscounts: null });
    this.cleared.emit();
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.invalidSubmitted.emit();
      return;
    }
    const value = this.form.getRawValue();
    this.calculateRequested.emit({
      mode: value.mode,
      amount: value.amount ?? 0,
      otherDiscounts: value.otherDiscounts ?? 0,
    });
  }

  protected reset(): void {
    this.form.reset({ mode: this.mode(), amount: null, otherDiscounts: null });
    this.cleared.emit();
  }
}
