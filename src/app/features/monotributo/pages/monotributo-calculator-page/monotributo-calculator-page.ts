import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { MONOTRIBUTO_DATASET } from '../../data-access/monotributo-dataset';
import { MonotributoCalculationResultCard } from '../../components/monotributo-calculation-result/monotributo-calculation-result';
import { MonotributoCalculatorForm } from '../../components/monotributo-calculator-form/monotributo-calculator-form';
import { calculateMonotributoEstimate } from '../../domain/monotributo-calculation';
import {
  MonotributoCalculationInput,
  MonotributoCalculationResult,
  MonotributoCalculationState,
} from '../../domain/monotributo.models';

interface Faq {
  readonly question: string;
  readonly answer: string;
}

@Component({
  selector: 'app-monotributo-calculator-page',
  imports: [RouterLink, Icon, MonotributoCalculatorForm, MonotributoCalculationResultCard],
  templateUrl: './monotributo-calculator-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonotributoCalculatorPage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo = inject(SeoService);
  protected readonly dataset = MONOTRIBUTO_DATASET;
  protected readonly calculationState = signal<MonotributoCalculationState>({ status: 'idle' });
  protected readonly copyFeedback = signal<'idle' | 'copied' | 'error'>('idle');
  protected readonly sources = [
    { name: 'ARCA — Montos y categorías vigentes', url: MONOTRIBUTO_DATASET.sourceUrl },
    {
      name: 'ARCA — Parámetros del Monotributo',
      url: 'https://www.arca.gob.ar/monotributo/ayuda/parametros.asp',
    },
    {
      name: 'ARCA — Tipos de Monotributo',
      url: 'https://www.arca.gob.ar/monotributo/ayuda/tipos-de-monotributo.asp',
    },
    {
      name: 'ARCA — Recategorización',
      url: 'https://www.arca.gob.ar/monotributo/ayuda/recategorizacion.asp',
    },
    { name: 'ARCA — Exclusión', url: 'https://www.arca.gob.ar/monotributo/ayuda/exclusion.asp' },
  ];
  protected readonly faqs: readonly Faq[] = [
    {
      question: '¿Qué categoría de Monotributo me corresponde?',
      answer:
        'La categoría se determina por el primer límite compatible de cada parámetro aplicable. La categoría final es la mayor que resulte de ingresos, local, energía, alquiler y, para ventas, precio unitario.',
    },
    {
      question: '¿Cuánto puedo facturar?',
      answer:
        'La tabla indica el máximo anual de ingresos de cada categoría. Esta calculadora usa siempre los últimos 12 meses, no el año calendario.',
    },
    {
      question: '¿La categoría depende solo de los ingresos?',
      answer:
        'No. Si trabajás en un local, también pueden influir superficie, energía y alquileres. Para venta de productos se agrega el precio unitario máximo.',
    },
    {
      question: '¿Qué parámetros se toman si tengo local?',
      answer:
        'ARCA informa superficie afectada, energía eléctrica anual y alquileres devengados anualmente. Algunas actividades o localidades tienen excepciones: por eso los controles se activan únicamente si ya verificaste que aplican.',
    },
    {
      question: '¿Qué es el precio unitario máximo?',
      answer:
        'Para venta de cosas muebles, es el precio del producto más caro. Si supera el máximo publicado por ARCA, no existe una categoría superior dentro del Monotributo.',
    },
    {
      question: '¿Cuánto pago por mes?',
      answer:
        'Para trabajo independiente se muestra impuesto integrado, SIPA y obra social individual. La obra social corresponde al titular sin adherentes; estos pueden aumentar el importe.',
    },
    {
      question: '¿Qué pasa si trabajo también en relación de dependencia?',
      answer:
        'ARCA indica que se paga solo el componente impositivo, porque los aportes jubilatorios y de obra social corresponden al empleador.',
    },
    {
      question: '¿Por qué mi cuota puede ser distinta?',
      answer:
        'Esta V1 no calcula Monotributo Social, promovido, cooperativas, jubilaciones, cajas provinciales, adherentes, locación exclusiva de inmuebles ni otros regímenes especiales.',
    },
    {
      question: '¿Cuándo debo recategorizarme?',
      answer:
        'ARCA informa períodos en febrero y agosto, evaluando los últimos 12 meses. El trámite puede hacerse hasta el día 5 y quienes tienen menos de seis meses de actividad no deben recategorizarse.',
    },
    {
      question: '¿Qué pasa si supero la categoría K?',
      answer:
        'La herramienta muestra que se supera un parámetro máximo del Monotributo. No concluye automáticamente cuál es tu régimen fiscal posterior.',
    },
  ];
  private readonly currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  constructor() {
    this.seo.apply({
      title: 'Calculadora de Monotributo en Argentina | Hacé Números',
      description:
        'Estimá tu categoría de Monotributo según ingresos y parámetros de tu actividad, consultá los límites vigentes y la cuota mensual aproximada.',
      canonicalPath: '/calculadora-monotributo',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://hacenumeros.com/' },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Calculadora de Monotributo',
              item: 'https://hacenumeros.com/calculadora-monotributo',
            },
          ],
        },
      ],
    });
  }

  protected calculate(value: MonotributoCalculationInput): void {
    this.copyFeedback.set('idle');
    try {
      const result = calculateMonotributoEstimate(this.dataset, value);
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
  protected date(value: string): string {
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(`${value}T00:00:00Z`),
    );
  }

  protected money(value: number): string {
    return this.currency.format(value);
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
          title: 'Categoría de Monotributo estimada',
          text: this.shareText(result),
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    await this.copyResult();
  }
  private currentResult(): MonotributoCalculationResult | null {
    return this.calculationState().result ?? null;
  }
  private shareText(result: MonotributoCalculationResult): string {
    if (!result.category)
      return 'Hacé Números · El caso supera al menos un parámetro máximo del Monotributo.';
    return [
      'Hacé Números · Monotributo',
      `Categoría estimada: ${result.category.code}`,
      result.contribution?.total
        ? `Cuota mensual estimada: ${this.currency.format(result.contribution.total)}`
        : 'Cuota: revisar según la situación previsional',
      `Valores vigentes desde ${this.date(this.dataset.effectiveFrom)}`,
    ].join('\n');
  }
}
