import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SalaryCalculationResultCard } from '../../components/salary-calculation-result/salary-calculation-result';
import {
  SalaryCalculatorForm,
  SalaryFormSubmission,
} from '../../components/salary-calculator-form/salary-calculator-form';
import { SalaryParametersRepository } from '../../data-access/salary-parameters-repository';
import { calculateGrossSalary, calculateNetSalary } from '../../domain/salary-calculation';
import {
  SalaryCalculationResult,
  SalaryCalculationState,
  SalaryParameters,
} from '../../domain/salary-calculation.models';

interface Faq {
  readonly question: string;
  readonly answer: string;
}

@Component({
  selector: 'app-salary-calculator-page',
  imports: [RouterLink, Icon, SalaryCalculatorForm, SalaryCalculationResultCard],
  templateUrl: './salary-calculator-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryCalculatorPage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly repository = inject(SalaryParametersRepository);
  private readonly seo = inject(SeoService);
  protected readonly parameters = signal<SalaryParameters | null>(null);
  protected readonly parameterState = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly calculationState = signal<SalaryCalculationState>({ status: 'idle' });
  protected readonly copyFeedback = signal<'idle' | 'copied' | 'error'>('idle');
  private readonly currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  protected readonly faqs: readonly Faq[] = [
    {
      question: '¿Qué diferencia hay entre sueldo bruto y sueldo neto?',
      answer:
        'El bruto es la remuneración antes de descuentos. El neto es el importe que queda después de aportes y otros descuentos.',
    },
    {
      question: '¿Qué descuentos incluye la calculadora?',
      answer:
        'Incluye 11 % de jubilación, 3 % de obra social y 3 % de INSSJP/PAMI, más el importe fijo opcional que ingreses.',
    },
    {
      question: '¿Incluye Impuesto a las Ganancias?',
      answer:
        'No. Ganancias depende de deducciones, acumulados y situación fiscal, por lo que esta versión lo excluye expresamente.',
    },
    {
      question: '¿Por qué el descuento efectivo puede ser menor al 17 %?',
      answer:
        'Porque los aportes personales dejan de crecer sobre el excedente cuando el sueldo supera la base imponible máxima.',
    },
    {
      question: '¿Qué es la base imponible máxima?',
      answer:
        'Es el monto máximo de remuneración sobre el que se calculan los aportes personales alcanzados por el tope.',
    },
    {
      question: '¿Por qué mi recibo puede dar distinto?',
      answer:
        'Puede incluir Ganancias, conceptos no remunerativos, convenio, sindicato, adicionales, ausencias u otras condiciones no contempladas.',
    },
    {
      question: '¿Cómo calculo qué bruto necesito para cobrar un neto determinado?',
      answer:
        'Elegí “Neto a bruto”, ingresá el objetivo y los otros descuentos. La herramienta invierte la misma fórmula respetando el tope.',
    },
  ];

  constructor() {
    this.seo.apply({
      title: 'Calculadora de sueldo bruto a neto en Argentina | Hacé Números',
      description:
        'Calculá tu sueldo neto estimado desde el bruto, o el bruto necesario para alcanzar un neto, con aportes y topes vigentes en Argentina.',
      canonicalPath: '/calculadora-sueldo-bruto-neto',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://hacenumeros.com/' },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Calculadora de sueldo bruto a neto',
              item: 'https://hacenumeros.com/calculadora-sueldo-bruto-neto',
            },
          ],
        },
      ],
    });
    afterNextRender(() => void this.loadParameters());
  }

  protected async calculate(value: SalaryFormSubmission): Promise<void> {
    this.copyFeedback.set('idle');
    this.calculationState.set({ status: 'loading' });
    const parameters = this.parameters() ?? (await this.loadParameters());
    if (!parameters) {
      this.calculationState.set({ status: 'load-error' });
      return;
    }
    try {
      const input = { amount: value.amount, otherDiscounts: value.otherDiscounts };
      const result =
        value.mode === 'gross-to-net'
          ? calculateNetSalary(input, parameters)
          : calculateGrossSalary(input, parameters);
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
  protected money(value: number): string {
    return this.currency.format(value);
  }
  protected effectiveDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
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
        await navigator.share({
          title: 'Sueldo bruto/neto estimado',
          text: this.shareText(result),
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    await this.copyResult();
  }

  private successfulResult(): SalaryCalculationResult | null {
    const state = this.calculationState();
    return state.status === 'success' ? state.result : null;
  }
  private async loadParameters(): Promise<SalaryParameters | null> {
    try {
      const value = await this.repository.getParameters();
      this.parameters.set(value);
      this.parameterState.set('loaded');
      return value;
    } catch {
      this.parameterState.set('error');
      return null;
    }
  }
  private shareText(result: SalaryCalculationResult): string {
    return [
      'Hacé Números · Sueldo bruto/neto estimado',
      `Bruto: ${this.money(result.gross)}`,
      `Neto: ${this.money(result.net)}`,
      `Aportes obligatorios: ${this.money(result.mandatoryContributions)}`,
      `Otros descuentos: ${this.money(result.otherDiscounts)}`,
    ].join('\n');
  }
}
