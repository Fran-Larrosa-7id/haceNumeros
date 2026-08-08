import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Icon } from '../../../../shared/ui/icon/icon';
import { DismissalCalculationState } from '../../domain/dismissal-compensation.models';

@Component({
  selector: 'app-dismissal-calculation-result',
  imports: [Icon, NgTemplateOutlet],
  templateUrl: './dismissal-calculation-result.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DismissalCalculationResultCard {
  readonly state = input.required<DismissalCalculationState>();
  readonly copyFeedback = input<'idle' | 'copied' | 'error'>('idle');
  readonly copyRequested = output<void>();
  readonly shareRequested = output<void>();

  private readonly currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  protected money(value: number): string {
    return this.currency.format(value);
  }

  protected copyLabel(): string {
    if (this.copyFeedback() === 'copied') return 'Resultado copiado';
    if (this.copyFeedback() === 'error') return 'No se pudo copiar';
    return 'Copiar resultado';
  }
}
