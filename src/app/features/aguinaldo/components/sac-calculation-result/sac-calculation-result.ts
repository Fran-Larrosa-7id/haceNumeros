import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { monthName } from '../../domain/sac-calculation';
import { SacCalculationResult, SacCalculationState } from '../../domain/sac.models';

@Component({
  selector: 'app-sac-calculation-result',
  imports: [Icon],
  templateUrl: './sac-calculation-result.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SacCalculationResultCard {
  readonly state = input.required<SacCalculationState>();
  readonly copyFeedback = input<'idle' | 'copied' | 'error'>('idle');
  readonly copyRequested = output<void>();
  readonly shareRequested = output<void>();

  private readonly currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  private readonly percentage = new Intl.NumberFormat('es-AR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  protected money(value: number): string {
    return this.currency.format(value);
  }

  protected percent(value: number): string {
    return this.percentage.format(value);
  }

  protected month(value: number): string {
    return monthName(value);
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  }

  protected copyLabel(): string {
    if (this.copyFeedback() === 'copied') return 'Resultado copiado';
    if (this.copyFeedback() === 'error') return 'No se pudo copiar';
    return 'Copiar resultado';
  }

  protected successfulResult(): SacCalculationResult | null {
    const state = this.state();
    return state.status === 'success' ? state.result : null;
  }
}
