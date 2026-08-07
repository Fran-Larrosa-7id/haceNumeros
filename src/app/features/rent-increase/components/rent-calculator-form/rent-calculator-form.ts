import { ChangeDetectionStrategy, Component, DestroyRef, inject, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '../../../../shared/ui/icon/icon';
import { DatePicker } from '../../../../shared/ui/date-picker/date-picker';
import { MoneyInput } from '../../../../shared/ui/money-input/money-input';
import { hasValidDateRange, monthsBetween } from '../../domain/rent-calculation';
import {
  AdjustmentFrequency,
  RentFormValue,
  RentIndexType,
} from '../../domain/rent-calculation.models';

interface SelectOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-rent-calculator-form',
  imports: [ReactiveFormsModule, Icon, DatePicker, MoneyInput],
  templateUrl: './rent-calculator-form.html',
  styleUrl: './rent-calculator-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentCalculatorForm {
  private readonly destroyRef = inject(DestroyRef);
  private usesMonthlyPeriods = false;

  readonly calculateRequested = output<RentFormValue>();
  readonly invalidSubmitted = output<void>();
  readonly cleared = output<void>();

  protected readonly indexOptions: readonly SelectOption<RentIndexType>[] = [
    { value: 'icl', label: 'ICL' },
    { value: 'ipc', label: 'IPC' },
    { value: 'casa-propia', label: 'Casa Propia' },
    { value: 'manual', label: 'Porcentaje manual' },
  ];

  protected readonly frequencyOptions: readonly SelectOption<AdjustmentFrequency>[] = [
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'four-monthly', label: 'Cuatrimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' },
  ];

  protected readonly form = new FormGroup({
    currentRent: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(1_000_000_000_000),
    ]),
    indexType: new FormControl<RentIndexType>('icl', { nonNullable: true }),
    lastAdjustmentDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    nextAdjustmentDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    frequency: new FormControl<AdjustmentFrequency>('annual', { nonNullable: true }),
    manualPercentage: new FormControl<number | null>(null),
  });

  constructor() {
    this.configureMode(this.form.controls.indexType.value);

    this.form.controls.indexType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => this.configureMode(type));

    merge(
      this.form.controls.lastAdjustmentDate.valueChanges,
      this.form.controls.nextAdjustmentDate.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clearDateRangeError());
  }

  protected isManualMode(): boolean {
    return this.form.controls.indexType.value === 'manual';
  }

  protected isIpcMode(): boolean {
    return this.form.controls.indexType.value === 'ipc';
  }

  protected startPeriodLabel(): string {
    return this.isIpcMode() ? 'Mes inicial' : 'Fecha del último ajuste';
  }

  protected endPeriodLabel(): string {
    return this.isIpcMode() ? 'Mes final' : 'Fecha del próximo ajuste';
  }

  protected startPeriodError(): string {
    return this.isIpcMode() ? 'Elegí el mes inicial.' : 'Elegí la fecha del último ajuste.';
  }

  protected endPeriodError(): string {
    return this.isIpcMode() ? 'Elegí el mes final.' : 'Elegí la fecha del próximo ajuste.';
  }

  protected rangeError(): string {
    return this.isIpcMode()
      ? 'El mes final debe ser posterior al mes inicial.'
      : 'La próxima fecha debe ser posterior al último ajuste.';
  }

  protected indexHelp(): string {
    switch (this.form.controls.indexType.value) {
      case 'icl':
        return 'Elegí ICL solamente si figura expresamente en tu contrato.';
      case 'ipc':
        return 'El IPC se publica por períodos mensuales. Seleccioná los meses que correspondan a tu contrato.';
      case 'casa-propia':
        return 'La integración de datos de Casa Propia está pendiente.';
      case 'manual':
        return 'Ingresá el porcentaje fijo indicado en tu contrato.';
    }
  }

  protected frequencyWarning(): string | null {
    if (this.isManualMode()) {
      return null;
    }

    const months = monthsBetween(
      this.form.controls.lastAdjustmentDate.value,
      this.form.controls.nextAdjustmentDate.value,
    );
    if (months === null) {
      return null;
    }

    const expectedMonths: Readonly<Record<AdjustmentFrequency, number>> = {
      quarterly: 3,
      'four-monthly': 4,
      semiannual: 6,
      annual: 12,
    };
    const selected = this.form.controls.frequency.value;

    return Math.abs(months - expectedMonths[selected]) > 1
      ? 'Las fechas no parecen coincidir con la frecuencia elegida. Revisalas antes de calcular.'
      : null;
  }

  protected hasError(
    controlName: 'currentRent' | 'lastAdjustmentDate' | 'nextAdjustmentDate' | 'manualPercentage',
    errorName: string,
  ): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.validateDateRange();

    if (this.form.invalid) {
      this.invalidSubmitted.emit();
      return;
    }

    const value = this.form.getRawValue();
    this.calculateRequested.emit({
      currentRent: value.currentRent ?? 0,
      indexType: value.indexType,
      lastAdjustmentDate: value.lastAdjustmentDate,
      nextAdjustmentDate: value.nextAdjustmentDate,
      frequency: value.frequency,
      manualPercentage: value.manualPercentage,
    });
  }

  protected reset(): void {
    this.form.reset({
      currentRent: null,
      indexType: 'icl',
      lastAdjustmentDate: '',
      nextAdjustmentDate: '',
      frequency: 'annual',
      manualPercentage: null,
    });
    this.configureMode('icl');
    this.cleared.emit();
  }

  private configureMode(type: RentIndexType): void {
    const switchesPeriodType = this.usesMonthlyPeriods !== (type === 'ipc');
    this.usesMonthlyPeriods = type === 'ipc';
    const manualControl = this.form.controls.manualPercentage;
    const dateControls = [
      this.form.controls.lastAdjustmentDate,
      this.form.controls.nextAdjustmentDate,
    ];

    if (switchesPeriodType) {
      for (const control of dateControls) {
        control.reset('', { emitEvent: false });
      }
    }

    if (type === 'manual') {
      manualControl.setValidators([Validators.required, Validators.min(0), Validators.max(1_000)]);
      for (const control of dateControls) {
        control.clearValidators();
        control.setErrors(null);
      }
    } else {
      manualControl.clearValidators();
      manualControl.setErrors(null);
      for (const control of dateControls) {
        control.setValidators([Validators.required]);
      }
    }

    manualControl.updateValueAndValidity({ emitEvent: false });
    for (const control of dateControls) {
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private validateDateRange(): void {
    if (this.isManualMode()) {
      return;
    }

    const startDate = this.form.controls.lastAdjustmentDate.value;
    const endControl = this.form.controls.nextAdjustmentDate;
    const endDate = endControl.value;

    if (startDate && endDate && !hasValidDateRange(startDate, endDate)) {
      endControl.setErrors({ ...endControl.errors, dateRange: true });
    }
  }

  private clearDateRangeError(): void {
    const control = this.form.controls.nextAdjustmentDate;
    if (!control.hasError('dateRange')) {
      return;
    }

    const { dateRange: _, ...remainingErrors } = control.errors ?? {};
    control.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
  }
}
