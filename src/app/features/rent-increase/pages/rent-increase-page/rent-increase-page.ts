import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Icon, IconName } from '../../../../shared/ui/icon/icon';
import { RentCalculationResultCard } from '../../components/rent-calculation-result/rent-calculation-result';
import { RentCalculatorForm } from '../../components/rent-calculator-form/rent-calculator-form';
import { RentIndexRepository } from '../../data-access/rent-index-repository';
import {
  calculateCasaPropiaIncrease,
  calculateIndexedIncrease,
  calculateManualIncrease,
  MissingCasaPropiaPeriodsError,
} from '../../domain/rent-calculation';
import {
  CalculationState,
  IndexedRentType,
  RentCalculationResult,
  RentFormValue,
  RentIndexDataset,
  RentIndexManifest,
  RentIndexManifestEntry,
} from '../../domain/rent-calculation.models';

interface Faq {
  readonly question: string;
  readonly answer: string;
}

interface RelatedTool {
  readonly title: string;
  readonly icon: IconName;
}

@Component({
  selector: 'app-rent-increase-page',
  imports: [RouterLink, Icon, RentCalculatorForm, RentCalculationResultCard],
  templateUrl: './rent-increase-page.html',
  styleUrl: './rent-increase-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentIncreasePage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly repository = inject(RentIndexRepository);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly calculationState = signal<CalculationState>({ status: 'idle' });
  protected readonly copyFeedback = signal<'idle' | 'copied' | 'error'>('idle');
  protected readonly manifest = signal<RentIndexManifest | null>(null);
  protected readonly manifestState = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  protected readonly relatedTools: readonly RelatedTool[] = [
    { title: 'Sueldo bruto a neto', icon: 'money' },
    { title: 'Contado versus cuotas', icon: 'wallet' },
    { title: 'Consumo eléctrico', icon: 'spark' },
    { title: 'Combustible y viajes', icon: 'car' },
  ];

  protected readonly faqs: readonly Faq[] = [
    {
      question: '¿Qué índice debo elegir?',
      answer:
        'Elegí únicamente el índice o porcentaje que aparece expresamente en tu contrato. La herramienta no determina qué régimen legal corresponde a tu caso.',
    },
    {
      question: '¿Qué fecha tengo que ingresar?',
      answer:
        'Ingresá la fecha del último ajuste y la fecha en la que corresponde el próximo. Ambas deberían surgir del contrato o de la última actualización aplicada.',
    },
    {
      question: '¿Sirve para aumentos trimestrales?',
      answer:
        'Sí, la frecuencia trimestral se puede indicar como referencia. El cálculo por índice utiliza las fechas concretas, mientras que el modo manual aplica el porcentaje pactado.',
    },
    {
      question: '¿El resultado es oficial?',
      answer:
        'No. Es una estimación orientativa. Puede variar por redondeos, fechas, cláusulas particulares o datos que todavía no estén incorporados.',
    },
    {
      question: '¿Qué pasa si mi contrato establece un porcentaje fijo?',
      answer:
        'Elegí “Porcentaje manual” e ingresá el porcentaje indicado. En ese modo el cálculo se realiza completamente en tu navegador.',
    },
    {
      question: '¿Por qué no hay datos disponibles para una fecha?',
      answer:
        'Porque el dataset no contiene exactamente la fecha o el período consultado. No buscamos automáticamente otro dato ni completamos valores mediante interpolación.',
    },
    {
      question: '¿Cada cuánto se actualizan los datos?',
      answer:
        'La actualización es manual y cada dataset muestra hasta qué fecha o período tiene observaciones. No son datos en tiempo real.',
    },
  ];

  private readonly currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  private readonly percentageFormatter = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  });

  constructor() {
    const pageTitle = 'Calculadora de aumento de alquiler | ICL, IPC y porcentaje';
    const description =
      'Calculá el aumento de tu alquiler en Argentina según el índice o porcentaje indicado en tu contrato. Obtené el nuevo valor, la diferencia y el desglose del cálculo.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    afterNextRender(() => void this.loadAvailability());
  }

  protected calculate(value: RentFormValue): void {
    this.copyFeedback.set('idle');

    if (value.indexType === 'manual') {
      if (value.manualPercentage === null) {
        this.calculationState.set({ status: 'invalid' });
        return;
      }

      this.calculationState.set({
        status: 'success',
        result: calculateManualIncrease(value.currentRent, value.manualPercentage),
      });
      return;
    }

    void this.calculateWithIndex(value, value.indexType);
  }

  protected showInvalidState(): void {
    this.copyFeedback.set('idle');
    this.calculationState.set({ status: 'invalid' });
  }

  protected clearResult(): void {
    this.copyFeedback.set('idle');
    this.calculationState.set({ status: 'idle' });
  }

  protected async copyResult(): Promise<void> {
    const result = this.getSuccessfulResult();
    if (!result || !isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      this.copyFeedback.set('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.buildShareText(result));
      this.copyFeedback.set('copied');
    } catch {
      this.copyFeedback.set('error');
    }
  }

  protected async shareResult(): Promise<void> {
    const result = this.getSuccessfulResult();
    if (!result || !isPlatformBrowser(this.platformId)) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Resultado estimado de aumento de alquiler',
          text: this.buildShareText(result),
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
      }
    }

    await this.copyResult();
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  protected formatPercentage(value: number): string {
    return `${this.percentageFormatter.format(value)} %`;
  }

  protected formatCoefficient(value: number): string {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 8 }).format(value);
  }

  protected comparisonHeight(value: number, result: RentCalculationResult): number {
    const maximum = Math.max(result.currentRent, result.newRent, 1);
    return Math.max(12, Math.min(100, (value / maximum) * 100));
  }

  protected successfulResult(): RentCalculationResult | null {
    return this.getSuccessfulResult();
  }

  protected availabilityLabel(type: IndexedRentType, entry: RentIndexManifestEntry): string {
    return type === 'icl'
      ? `Disponible hasta el ${this.formatDate(entry.to)}`
      : `Último período: ${this.formatMonth(entry.to)}`;
  }

  private async calculateWithIndex(value: RentFormValue, type: IndexedRentType): Promise<void> {
    const labels: Readonly<Record<IndexedRentType, string>> = {
      icl: 'ICL',
      ipc: 'IPC',
      'casa-propia': 'Casa Propia',
    };
    this.calculationState.set({
      status: 'loading',
      indexType: type,
      indexLabel: labels[type],
    });

    let dataset: RentIndexDataset;
    try {
      dataset = await this.repository.getDataset(type);
    } catch {
      this.calculationState.set({
        status: 'load-error',
        indexType: type,
        indexLabel: labels[type],
        message:
          'No pudimos cargar el archivo estático del índice. Podés intentar nuevamente o usar el cálculo por porcentaje manual.',
      });
      return;
    }

    if (type === 'casa-propia') {
      try {
        this.calculationState.set({
          status: 'success',
          result: calculateCasaPropiaIncrease({
            currentRent: value.currentRent,
            startPeriod: value.lastAdjustmentDate,
            endPeriod: value.nextAdjustmentDate,
            dataset,
          }),
        });
      } catch (error) {
        if (!(error instanceof MissingCasaPropiaPeriodsError)) {
          throw error;
        }
        this.calculationState.set({
          status: 'unavailable',
          indexType: type,
          indexLabel: labels[type],
          startDate: value.lastAdjustmentDate,
          endDate: value.nextAdjustmentDate,
          missingPeriods: error.periods,
          message: `No encontramos todos los coeficientes mensuales requeridos. Hay datos disponibles desde ${this.formatCoverage(type, dataset.coverage.from)} hasta ${this.formatCoverage(type, dataset.coverage.to)}. No completamos ni interpolamos períodos faltantes.`,
        });
      }
      return;
    }

    const initialPoint = this.repository.findPoint(dataset, value.lastAdjustmentDate);
    const finalPoint = this.repository.findPoint(dataset, value.nextAdjustmentDate);

    if (!initialPoint || !finalPoint) {
      this.calculationState.set({
        status: 'unavailable',
        indexType: type,
        indexLabel: labels[type],
        startDate: value.lastAdjustmentDate,
        endDate: value.nextAdjustmentDate,
        message: `No encontramos las dos observaciones seleccionadas. Hay datos disponibles desde ${this.formatCoverage(type, dataset.coverage.from)} hasta ${this.formatCoverage(type, dataset.coverage.to)}. No interpolamos ni reemplazamos períodos automáticamente.`,
      });
      return;
    }

    this.calculationState.set({
      status: 'success',
      result: calculateIndexedIncrease({
        currentRent: value.currentRent,
        type,
        initialPoint,
        finalPoint,
        dataset,
      }),
    });
  }

  private getSuccessfulResult(): RentCalculationResult | null {
    const state = this.calculationState();
    return state.status === 'success' ? state.result : null;
  }

  private async loadAvailability(): Promise<void> {
    this.manifestState.set('loading');
    try {
      this.manifest.set(await this.repository.getManifest());
      this.manifestState.set('loaded');
    } catch {
      this.manifestState.set('error');
    }
  }

  private formatCoverage(type: IndexedRentType, value: string): string {
    return type === 'icl' ? this.formatDate(value) : this.formatMonth(value);
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(
      new Date(`${value}T12:00:00Z`),
    );
  }

  protected formatMonth(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}-01T12:00:00Z`));
  }

  private buildShareText(result: RentCalculationResult): string {
    return [
      'Resultado estimado de aumento de alquiler',
      `Alquiler actual: ${this.formatCurrency(result.currentRent)}`,
      `Nuevo alquiler: ${this.formatCurrency(result.newRent)}`,
      `Aumento: ${this.formatPercentage(result.accumulatedPercentage)}`,
      `Método: ${result.methodLabel}`,
      'Calculado con Hacé Números',
    ].join('\n');
  }
}
