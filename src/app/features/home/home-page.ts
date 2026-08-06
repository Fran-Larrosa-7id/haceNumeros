import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CalculatorCard, CalculatorSummary } from '../../shared/ui/calculator-card/calculator-card';
import { Icon, IconName } from '../../shared/ui/icon/icon';

interface Category {
  readonly name: string;
  readonly icon: IconName;
  readonly tools: readonly string[];
}

interface Benefit {
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
}

interface Step {
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
}

interface Faq {
  readonly question: string;
  readonly answer: string;
}

@Component({
  selector: 'app-home-page',
  imports: [CalculatorCard, Icon],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly heroBenefits: readonly string[] = [
    'Gratis y sin registro',
    'Resultados inmediatos',
    'Fuentes oficiales',
    'Datos actualizados',
  ];

  protected readonly calculators: readonly CalculatorSummary[] = [
    {
      title: 'Aumento de alquiler',
      description: 'Estimá el nuevo monto según el índice pactado y el período de actualización.',
      category: 'Hogar y movilidad',
      icon: 'home',
      featured: true,
      available: true,
    },
    {
      title: 'Sueldo bruto a neto',
      description:
        'Conocé cuánto dinero te quedaría en mano después de las deducciones habituales.',
      category: 'Dinero y trabajo',
      icon: 'money',
    },
    {
      title: 'Monotributo',
      description: 'Orientate sobre tu categoría y el importe mensual según tu facturación.',
      category: 'Impuestos y emprendimientos',
      icon: 'receipt',
    },
    {
      title: 'Aguinaldo',
      description: 'Estimá cuánto te correspondería cobrar de Sueldo Anual Complementario.',
      category: 'Dinero y trabajo',
      icon: 'calendar',
    },
    {
      title: 'Comisiones de Mercado Libre',
      description:
        'Calculá cargos de venta y el importe estimado que recibirías por una operación.',
      category: 'Impuestos y emprendimientos',
      icon: 'shop',
    },
    {
      title: 'Contado versus cuotas',
      description:
        'Compará el pago al contado con opciones en cuotas para decidir con más contexto.',
      category: 'Finanzas personales',
      icon: 'calculator',
    },
  ];

  protected readonly categories: readonly Category[] = [
    {
      name: 'Dinero y trabajo',
      icon: 'briefcase',
      tools: ['Sueldo bruto a neto', 'Aguinaldo', 'Indemnización por despido', 'Vacaciones'],
    },
    {
      name: 'Impuestos y emprendimientos',
      icon: 'receipt',
      tools: ['Monotributo', 'Ganancias', 'Comisiones de Mercado Libre', 'Costos de importación'],
    },
    {
      name: 'Finanzas personales',
      icon: 'wallet',
      tools: ['Contado versus cuotas', 'Plazo fijo', 'Dólar tarjeta versus MEP'],
    },
    {
      name: 'Hogar y movilidad',
      icon: 'car',
      tools: ['Aumento de alquiler', 'Consumo eléctrico', 'Combustible y costo de viaje'],
    },
  ];

  protected readonly benefits: readonly Benefit[] = [
    {
      title: 'Resultado inmediato',
      description: 'Los cálculos se resuelven en tu navegador, sin esperas innecesarias.',
      icon: 'clock',
    },
    {
      title: 'Fórmula explicada',
      description: 'Vas a poder ver cómo se obtuvo cada resultado, paso a paso.',
      icon: 'info',
    },
    {
      title: 'Fuente oficial',
      description: 'Cada herramienta identificará la normativa o el organismo consultado.',
      icon: 'shield',
    },
    {
      title: 'Fecha visible',
      description: 'Siempre vas a saber cuándo se revisaron los parámetros utilizados.',
      icon: 'calendar',
    },
  ];

  protected readonly steps: readonly Step[] = [
    {
      title: 'Ingresás tus datos',
      description: 'Pedimos solamente la información necesaria para el cálculo, sin registro.',
      icon: 'document',
    },
    {
      title: 'Calculamos el resultado',
      description: 'Aplicamos en tu navegador la fórmula y los parámetros vigentes informados.',
      icon: 'calculator',
    },
    {
      title: 'Te explicamos cómo se obtuvo',
      description: 'Mostramos el desglose con palabras simples y sin jerga innecesaria.',
      icon: 'spark',
    },
  ];

  protected readonly faqs: readonly Faq[] = [
    {
      question: '¿Es gratis usar las calculadoras?',
      answer:
        'Sí. Hacé Números es un proyecto de acceso gratuito y no requiere pagos para usar sus herramientas.',
    },
    {
      question: '¿Tengo que registrarme?',
      answer:
        'No. No necesitás crear una cuenta ni entregar datos personales para hacer un cálculo.',
    },
    {
      question: '¿De dónde salen los datos?',
      answer:
        'De fuentes oficiales consultadas, como ARCA, ANSES, BCRA, INDEC y normativa publicada. Cada calculadora indicará las fuentes que le correspondan.',
    },
    {
      question: '¿Los resultados son oficiales?',
      answer:
        'No. Son estimaciones orientativas basadas en fórmulas y parámetros vigentes al momento de la última revisión. Tu situación particular puede modificar el resultado.',
    },
    {
      question: '¿Con qué frecuencia se actualizan?',
      answer:
        'Cada herramienta tendrá su propia fecha de revisión, porque los índices y normativas no cambian con la misma frecuencia.',
    },
    {
      question: '¿Qué hago si encuentro un error?',
      answer:
        'La sección de contacto estará disponible próximamente. Cuando lo esté, vas a poder enviarnos el caso y la fuente para que lo revisemos.',
    },
  ];

  constructor() {
    const pageTitle = 'Hacé Números | Calculadoras para Argentina';
    const description =
      'Calculadoras gratuitas y actualizadas para calcular alquileres, sueldos, aguinaldo, Monotributo, cuotas y otros números de la economía argentina.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }
}
