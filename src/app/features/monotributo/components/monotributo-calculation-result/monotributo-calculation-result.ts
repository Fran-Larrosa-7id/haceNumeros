import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { DeterminingParameter, MonotributoCalculationState } from '../../domain/monotributo.models';

@Component({
  selector: 'app-monotributo-calculation-result',
  imports: [DecimalPipe, Icon, NgTemplateOutlet],
  templateUrl: './monotributo-calculation-result.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonotributoCalculationResultCard {
  readonly state = input.required<MonotributoCalculationState>();
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
  protected parameterName(parameter: DeterminingParameter): string {
    return {
      income: 'Ingresos brutos',
      surface: 'Superficie afectada',
      electricity: 'Energía eléctrica',
      rent: 'Alquiler anual',
      unitPrice: 'Precio unitario máximo',
    }[parameter];
  }
  protected copyLabel(): string {
    return this.copyFeedback() === 'copied'
      ? 'Resultado copiado'
      : this.copyFeedback() === 'error'
        ? 'No se pudo copiar'
        : 'Copiar resultado';
  }
}
