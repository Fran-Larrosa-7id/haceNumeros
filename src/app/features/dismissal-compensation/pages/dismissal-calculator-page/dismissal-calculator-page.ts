import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { DismissalCalculationResultCard } from '../../components/dismissal-calculation-result/dismissal-calculation-result';
import { DismissalCalculatorForm } from '../../components/dismissal-calculator-form/dismissal-calculator-form';
import {
  DISMISSAL_LAST_LEGAL_REVIEW,
  DISMISSAL_RELEVANT_ARTICLES,
  DISMISSAL_SOURCES,
} from '../../domain/dismissal-compensation.constants';
import { calculateTerminationEstimate } from '../../domain/dismissal-compensation';
import {
  DismissalCalculationInput,
  DismissalCalculationResult,
  DismissalCalculationState,
} from '../../domain/dismissal-compensation.models';

interface Faq {
  readonly question: string;
  readonly answer: string;
}

@Component({
  selector: 'app-dismissal-calculator-page',
  imports: [RouterLink, Icon, DismissalCalculatorForm, DismissalCalculationResultCard],
  templateUrl: './dismissal-calculator-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DismissalCalculatorPage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo = inject(SeoService);
  protected readonly calculationState = signal<DismissalCalculationState>({ status: 'idle' });
  protected readonly copyFeedback = signal<'idle' | 'copied' | 'error'>('idle');
  protected readonly sources = DISMISSAL_SOURCES;
  protected readonly articles = DISMISSAL_RELEVANT_ARTICLES;
  protected readonly legalReview = '7 de agosto de 2026';
  protected readonly lastLegalReview = DISMISSAL_LAST_LEGAL_REVIEW;

  private readonly currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  protected readonly faqs: readonly Faq[] = [
    {
      question: '¿Cómo se calcula la indemnización por antigüedad?',
      answer:
        'Para el régimen general, el art. 245 toma un mes de sueldo por cada año de servicio o fracción mayor de tres meses, con mínimo de un mes cuando aplica.',
    },
    {
      question: '¿Qué remuneración se toma?',
      answer:
        'Se toma la mejor remuneración mensual, normal y habitual computable, sin SAC, vacaciones ni conceptos de pago no mensual.',
    },
    {
      question: '¿Qué significa fracción mayor de tres meses?',
      answer:
        'La fracción debe superar tres meses calendario. Tres meses exactos no suman una unidad adicional.',
    },
    {
      question: '¿Qué pasa con horas extra y comisiones?',
      answer:
        'La normativa vigente contiene reglas específicas de habitualidad y promedios. Esta V1 pide la base computable ya revisada para no hacer un promedio incompleto.',
    },
    {
      question: '¿Qué es el tope del convenio?',
      answer:
        'Es un límite vinculado al convenio colectivo aplicable. No hay un tope nacional único, por eso se carga manualmente y es opcional.',
    },
    {
      question: '¿Cómo funciona el piso del 67 %?',
      answer:
        'Si se aplica un tope, la base no puede quedar por debajo del 67 % de la remuneración computable informada.',
    },
    {
      question: '¿Cuánto preaviso corresponde?',
      answer:
        'Fuera del período de prueba, corresponde un mes si la antigüedad no excede cinco años y dos meses si la supera.',
    },
    {
      question: '¿Qué es la integración del mes?',
      answer:
        'Si no hubo preaviso y el despido no fue el último día del mes, se estiman los días posteriores al despido hasta fin de mes.',
    },
    {
      question: '¿Qué pasa durante el período de prueba?',
      answer:
        'Con el texto vigente, esta herramienta no incluye art. 245, preaviso ni integración durante el período de prueba.',
    },
    {
      question: '¿SAC y vacaciones están incluidos?',
      answer:
        'No. Se muestran como conceptos que pueden corresponder, pero no se suman automáticamente porque requieren datos y bases adicionales.',
    },
  ];

  constructor() {
    this.seo.apply({
      title: 'Calculadora de indemnización por despido en Argentina | Hacé Números',
      description:
        'Estimá la indemnización por despido sin causa en Argentina con antigüedad, preaviso, integración del mes y tope de convenio opcional.',
      canonicalPath: '/calculadora-indemnizacion-despido',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://hacenumeros.com/' },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Calculadora de indemnización por despido',
              item: 'https://hacenumeros.com/calculadora-indemnizacion-despido',
            },
          ],
        },
      ],
    });
  }

  protected calculate(value: DismissalCalculationInput): void {
    this.copyFeedback.set('idle');
    try {
      const result = calculateTerminationEstimate(value);
      this.calculationState.set({ status: result.status, result });
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
    const result = this.currentResult();
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
    const result = this.currentResult();
    if (!result || !isPlatformBrowser(this.platformId)) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Indemnización por despido estimada',
          text: this.shareText(result),
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    await this.copyResult();
  }

  private currentResult(): DismissalCalculationResult | null {
    return this.calculationState().result ?? null;
  }

  private shareText(result: DismissalCalculationResult): string {
    return [
      'Hacé Números · Indemnización por despido estimada',
      `Estado: ${result.status}`,
      `Antigüedad art. 245: ${result.article245Units} unidades`,
      `Art. 245: ${this.currency.format(result.article245Indemnity)}`,
      `Preaviso: ${result.pendingNotice ? 'Pendiente' : this.currency.format(result.noticeIndemnity)}`,
      `Integración: ${result.pendingNotice ? 'Pendiente' : this.currency.format(result.monthIntegration)}`,
      `Total: ${this.currency.format(result.totalIndemnity)}`,
      `Normativa revisada: ${this.legalReview}`,
    ].join('\n');
  }
}
