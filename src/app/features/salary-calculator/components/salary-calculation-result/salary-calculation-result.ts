import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import {
  SalaryCalculationResult,
  SalaryCalculationState,
} from '../../domain/salary-calculation.models';

@Component({
  selector: 'app-salary-calculation-result',
  imports: [Icon],
  templateUrl: './salary-calculation-result.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryCalculationResultCard {
  readonly state = input.required<SalaryCalculationState>();
  readonly copyFeedback = input<'idle' | 'copied' | 'error'>('idle');
  readonly copyRequested = output<void>();
  readonly shareRequested = output<void>();
  private readonly currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  private readonly number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
  protected money(value: number): string {
    return this.currency.format(value);
  }
  protected percent(value: number): string {
    return `${this.number.format(value)} %`;
  }
  protected resultAmount(result: SalaryCalculationResult): number {
    return result.mode === 'gross-to-net' ? result.net : result.gross;
  }
  protected title(result: SalaryCalculationResult): string {
    return result.mode === 'gross-to-net'
      ? 'Sueldo neto mensual aproximado'
      : 'Sueldo bruto mensual estimado necesario';
  }
  protected barWidth(value: number, result: SalaryCalculationResult): number {
    return Math.max(0, Math.min(100, (value / result.gross) * 100));
  }
  protected copyLabel(): string {
    return this.copyFeedback() === 'copied'
      ? 'Resultado copiado'
      : this.copyFeedback() === 'error'
        ? 'No se pudo copiar'
        : 'Copiar resultado';
  }
  protected successfulResult(): SalaryCalculationResult | null {
    const state = this.state();
    return state.status === 'success' ? state.result : null;
  }
}
