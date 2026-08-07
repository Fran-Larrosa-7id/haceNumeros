import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { CalculationState, RentCalculationResult } from '../../domain/rent-calculation.models';

export type CopyFeedback = 'idle' | 'copied' | 'error';

@Component({
  selector: 'app-rent-calculation-result',
  imports: [Icon],
  templateUrl: './rent-calculation-result.html',
  styleUrl: './rent-calculation-result.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentCalculationResultCard {
  readonly state = input.required<CalculationState>();
  readonly copyFeedback = input<CopyFeedback>('idle');
  readonly copyRequested = output<void>();
  readonly shareRequested = output<void>();

  private readonly currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  private readonly percentageFormatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  protected formatPercentage(value: number): string {
    return `${this.percentageFormatter.format(value)} %`;
  }

  protected formatCoefficient(value: number): string {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 8 }).format(value);
  }

  protected updateLabel(result: RentCalculationResult): string {
    if (!result.updatedAt) {
      return 'No corresponde';
    }
    return result.method === 'ipc' || result.method === 'casa-propia'
      ? new Intl.DateTimeFormat('es-AR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(`${result.updatedAt}-01T12:00:00Z`))
      : this.formatDate(result.updatedAt);
  }

  protected copyLabel(): string {
    switch (this.copyFeedback()) {
      case 'copied':
        return 'Resultado copiado';
      case 'error':
        return 'No se pudo copiar';
      default:
        return 'Copiar resultado';
    }
  }

  private formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  }
}
