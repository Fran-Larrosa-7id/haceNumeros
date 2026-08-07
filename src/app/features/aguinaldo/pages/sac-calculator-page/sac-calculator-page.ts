import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SacCalculationResultCard } from '../../components/sac-calculation-result/sac-calculation-result';
import {
  SacCalculatorForm,
  SacFormSubmission,
} from '../../components/sac-calculator-form/sac-calculator-form';
import { SAC_PAYMENT_DATES, SAC_SOURCES } from '../../domain/sac.constants';
import { calculateSac, findBestMonthlyRemuneration, monthName } from '../../domain/sac-calculation';
import { SacCalculationResult, SacCalculationState } from '../../domain/sac.models';

interface Faq {
  readonly question: string;
  readonly answer: string;
}

@Component({
  selector: 'app-sac-calculator-page',
  imports: [RouterLink, Icon, SacCalculatorForm, SacCalculationResultCard],
  templateUrl: './sac-calculator-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SacCalculatorPage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo = inject(SeoService);
  protected readonly calculationState = signal<SacCalculationState>({ status: 'idle' });
  protected readonly copyFeedback = signal<'idle' | 'copied' | 'error'>('idle');
  protected readonly sources = SAC_SOURCES;
  protected readonly paymentDates = SAC_PAYMENT_DATES;

  private readonly currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  protected readonly faqs: readonly Faq[] = [
    {
      question: '¿Cómo se calcula el aguinaldo?',
      answer:
        'Para un semestre completo se toma el 50 % de la mayor remuneración mensual computable devengada en el semestre.',
    },
    {
      question: '¿Se calcula sobre el sueldo bruto o neto?',
      answer:
        'La base es la remuneración bruta computable, antes de los descuentos personales. El resultado de esta herramienta también es bruto.',
    },
    {
      question: '¿Qué sueldo se toma si cobré importes distintos?',
      answer:
        'Se utiliza la mayor remuneración mensual computable del semestre. Podés cargar los seis meses para que la calculadora la encuentre.',
    },
    {
      question: '¿Cuándo se paga el aguinaldo?',
      answer: `Las fechas legales de vencimiento son el ${SAC_PAYMENT_DATES.first} y el ${SAC_PAYMENT_DATES.second}.`,
    },
    {
      question: '¿Cómo se calcula si no trabajé todo el semestre?',
      answer:
        'Esta estimación prorratea el medio aguinaldo por los días calendario inclusivos trabajados sobre los días reales del semestre seleccionado.',
    },
    {
      question: '¿La calculadora contempla años bisiestos?',
      answer: 'Sí. Cuenta los días reales del semestre y febrero tiene 29 días cuando corresponde.',
    },
    {
      question: '¿Qué pasa con la cuota de diciembre?',
      answer:
        'El empleador puede estimar la remuneración de diciembre para pagar la segunda cuota y luego integrar la diferencia si corresponde.',
    },
    {
      question: '¿El resultado es exacto?',
      answer:
        'Es orientativo. Conceptos remunerativos computables, licencias, extinción del contrato, convenio y liquidación real pueden modificarlo.',
    },
    {
      question: '¿Se descuentan aportes del aguinaldo?',
      answer:
        'El resultado mostrado es bruto. Los descuentos aplicables se reflejan luego en la liquidación, por eso no equivale al importe neto a cobrar.',
    },
  ];

  constructor() {
    this.seo.apply({
      title: 'Calculadora de aguinaldo en Argentina | Hacé Números',
      description:
        'Calculá tu aguinaldo bruto o SAC proporcional por días, usando la mejor remuneración del semestre y fechas legales de Argentina.',
      canonicalPath: '/calculadora-aguinaldo',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://hacenumeros.com/' },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Calculadora de aguinaldo',
              item: 'https://hacenumeros.com/calculadora-aguinaldo',
            },
          ],
        },
      ],
    });
  }

  protected calculate(value: SacFormSubmission): void {
    this.copyFeedback.set('idle');
    try {
      const best =
        value.inputMode === 'monthly-values'
          ? findBestMonthlyRemuneration(value.monthlyValues)
          : { remuneration: value.bestRemuneration as number };
      const result = calculateSac({
        ...best,
        year: value.year,
        semester: value.semester,
        workPeriodMode: value.workPeriodMode,
        startDate: value.startDate || undefined,
        endDate: value.endDate || undefined,
      });
      this.calculationState.set({ status: 'success', result });
    } catch {
      this.calculationState.set({ status: 'invalid' });
    }
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
    const result = this.successfulResult();
    if (!result || !isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      this.copyFeedback.set('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(this.shareText(result));
      this.copyFeedback.set('copied');
    } catch {
      this.copyFeedback.set('error');
    }
  }

  protected async shareResult(): Promise<void> {
    const result = this.successfulResult();
    if (!result || !isPlatformBrowser(this.platformId)) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Aguinaldo bruto estimado', text: this.shareText(result) });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    await this.copyResult();
  }

  private successfulResult(): SacCalculationResult | null {
    const state = this.calculationState();
    return state.status === 'success' ? state.result : null;
  }

  private shareText(result: SacCalculationResult): string {
    return [
      'Hacé Números · Aguinaldo bruto estimado',
      `Mejor remuneración: ${this.currency.format(result.bestRemuneration)}${result.bestMonth ? ` (${monthName(result.bestMonth)})` : ''}`,
      `Resultado: ${this.currency.format(result.estimatedSac)}`,
      result.proportional
        ? `Proporcional: ${result.daysCounted} de ${result.semesterDays} días`
        : 'Semestre completo',
    ].join('\n');
  }
}
