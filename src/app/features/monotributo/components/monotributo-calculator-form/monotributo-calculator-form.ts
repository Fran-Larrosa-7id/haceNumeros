import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '../../../../shared/ui/icon/icon';
import { MoneyInput } from '../../../../shared/ui/money-input/money-input';
import {
  ContributionSituation,
  EvaluationMode,
  MonotributoActivity,
  MonotributoCalculationInput,
} from '../../domain/monotributo.models';

@Component({
  selector: 'app-monotributo-calculator-form',
  imports: [ReactiveFormsModule, Icon, MoneyInput],
  templateUrl: './monotributo-calculator-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonotributoCalculatorForm {
  readonly calculateRequested = output<MonotributoCalculationInput>();
  readonly invalidSubmitted = output<void>();
  readonly cleared = output<void>();
  protected readonly conditionalError = signal('');
  protected readonly form = new FormGroup({
    mode: new FormControl<EvaluationMode>('quick', { nonNullable: true }),
    activity: new FormControl<MonotributoActivity>('services', { nonNullable: true }),
    annualIncome: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    contributionSituation: new FormControl<ContributionSituation>('independent-only', {
      nonNullable: true,
    }),
    hasPremises: new FormControl(false, { nonNullable: true }),
    surfaceM2: new FormControl<number | null>(null, Validators.min(0.01)),
    annualElectricityKwh: new FormControl<number | null>(null, Validators.min(0.01)),
    annualRent: new FormControl<number | null>(null, Validators.min(0)),
    excludeSurface: new FormControl(false, { nonNullable: true }),
    excludeElectricity: new FormControl(false, { nonNullable: true }),
    maxUnitPriceGoods: new FormControl<number | null>(null, Validators.min(0.01)),
  });

  protected mode(): EvaluationMode {
    return this.form.controls.mode.value;
  }
  protected activity(): MonotributoActivity {
    return this.form.controls.activity.value;
  }
  protected hasPremises(): boolean {
    return this.form.controls.hasPremises.value;
  }
  protected hasError(
    name:
      'annualIncome' | 'surfaceM2' | 'annualElectricityKwh' | 'annualRent' | 'maxUnitPriceGoods',
  ): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  protected chooseMode(mode: EvaluationMode): void {
    this.form.controls.mode.setValue(mode);
    this.conditionalError.set('');
    this.cleared.emit();
  }

  protected chooseActivity(activity: MonotributoActivity): void {
    this.form.controls.activity.setValue(activity);
    this.conditionalError.set('');
    this.cleared.emit();
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.conditionalError.set('');
    if (this.form.invalid || !this.validateConditionalFields()) {
      this.invalidSubmitted.emit();
      return;
    }
    const value = this.form.getRawValue();
    this.calculateRequested.emit({
      ...value,
      annualIncome: value.annualIncome as number,
    });
  }

  protected reset(): void {
    this.form.reset({
      mode: 'quick',
      activity: 'services',
      annualIncome: null,
      contributionSituation: 'independent-only',
      hasPremises: false,
      surfaceM2: null,
      annualElectricityKwh: null,
      annualRent: null,
      excludeSurface: false,
      excludeElectricity: false,
      maxUnitPriceGoods: null,
    });
    this.conditionalError.set('');
    this.cleared.emit();
  }

  private validateConditionalFields(): boolean {
    const value = this.form.getRawValue();
    if (value.mode === 'quick') return true;
    if (value.hasPremises) {
      if (!value.excludeSurface && value.surfaceM2 === null)
        return this.setConditionalError(
          'Ingresá la superficie o indicá que verificaste que no aplica.',
        );
      if (!value.excludeElectricity && value.annualElectricityKwh === null)
        return this.setConditionalError(
          'Ingresá la energía anual o indicá que verificaste que no aplica.',
        );
      if (value.annualRent === null)
        return this.setConditionalError(
          'Ingresá el alquiler anual. Si el local es propio, indicá $0.',
        );
    }
    if (value.activity === 'goods' && value.maxUnitPriceGoods === null)
      return this.setConditionalError('Ingresá el precio unitario máximo del producto más caro.');
    return true;
  }

  private setConditionalError(message: string): false {
    this.conditionalError.set(message);
    return false;
  }
}
