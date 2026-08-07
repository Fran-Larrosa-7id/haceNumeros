import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RentIncreasePage } from './rent-increase-page';

describe('RentIncreasePage', () => {
  let fixture: ComponentFixture<RentIncreasePage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RentIncreasePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(RentIncreasePage);
    element = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushManifestIfRequested();
  });

  afterEach(() => http.verify());

  it('renders the idle result without a fictitious amount', () => {
    const result = resultCard();

    expect(result.textContent).toContain('Completá los datos');
    expect(result.textContent).not.toContain('615.400');
  });

  it('publishes the calculator canonical metadata and matching breadcrumb data', () => {
    expect(document.title).toBe('Calculadora de aumento de alquiler | ICL, IPC y porcentaje');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://hacenumeros.com/calculadora-aumento-alquiler',
    );
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(
      'Calculá el aumento de tu alquiler en Argentina según ICL, IPC o el porcentaje indicado en tu contrato. Obtené el nuevo monto y el desglose del cálculo.',
    );
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content).toBe(
      'https://hacenumeros.com/calculadora-aumento-alquiler',
    );

    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[data-seo-structured-data]',
    );
    expect(scripts.length).toBe(1);
    const structuredData = JSON.parse(scripts[0].textContent ?? '') as {
      readonly '@type': string;
      readonly itemListElement: readonly { readonly name: string }[];
    };
    expect(structuredData['@type']).toBe('BreadcrumbList');
    expect(structuredData.itemListElement.map((item) => item.name)).toEqual([
      'Inicio',
      'Calculadora de aumento de alquiler',
    ]);
    expect(query<HTMLElement>('nav[aria-label="Migas de pan"]').textContent).not.toContain(
      'Hogar y movilidad',
    );
  });

  it('keeps the manual calculation independent from datasets', () => {
    selectIndex('manual');
    setControlValue('#current-rent', '450.000');
    setControlValue('#manual-percentage', '25');
    submit();

    expect(resultCard().textContent).toContain('562.500');
  });

  it('loads ICL, calculates exact dates and shows the dataset source', async () => {
    setControlValue('#current-rent', '100000');
    setControlValue('#last-adjustment', '2025-01-01');
    setControlValue('#next-adjustment', '2026-01-01');
    submit();
    http.expectOne('data/rent-indexes/icl.json').flush(
      datasetFixture('icl', [
        { date: '2025-01-01', value: 10 },
        { date: '2026-01-01', value: 15 },
      ]),
    );
    await detectAsyncChanges();

    expect(resultCard().textContent).toContain('150.000');
    expect(resultCard().textContent).toContain('Organismo oficial de prueba');
  });

  it('loads IPC using monthly periods and calculates their ratio', async () => {
    selectIndex('ipc');
    setControlValue('#current-rent', '100000');
    setControlValue('#last-adjustment', '2025-01');
    setControlValue('#next-adjustment', '2026-01');
    submit();
    http.expectOne('data/rent-indexes/ipc.json').flush(
      datasetFixture('ipc', [
        { period: '2025-01', value: 100 },
        { period: '2026-01', value: 125 },
      ]),
    );
    await detectAsyncChanges();

    expect(resultCard().textContent).toContain('125.000');
    expect(resultCard().textContent).toContain('Organismo oficial de prueba');
  });

  it('distinguishes a missing ICL date from a dataset load error', async () => {
    setControlValue('#current-rent', '100000');
    setControlValue('#last-adjustment', '2025-01-02');
    setControlValue('#next-adjustment', '2026-01-02');
    submit();
    http.expectOne('data/rent-indexes/icl.json').flush(
      datasetFixture('icl', [
        { date: '2025-01-01', value: 10 },
        { date: '2026-01-01', value: 15 },
      ]),
    );
    await detectAsyncChanges();

    expect(resultCard().textContent).toContain('Datos no disponibles');
    expect(resultCard().textContent).toContain('No encontramos las dos observaciones');
  });

  it('shows a technical error when the static dataset cannot load', async () => {
    selectIndex('ipc');
    setControlValue('#current-rent', '100000');
    setControlValue('#last-adjustment', '2025-01');
    setControlValue('#next-adjustment', '2026-01');
    submit();
    http.expectOne('data/rent-indexes/ipc.json').error(new ProgressEvent('network error'));
    await detectAsyncChanges();

    expect(resultCard().textContent).toContain('Error de carga');
  });

  it('compounds Casa Propia monthly coefficients and shows their breakdown', async () => {
    selectIndex('casa-propia');
    setControlValue('#current-rent', '100000');
    setControlValue('#last-adjustment', '2026-01');
    setControlValue('#next-adjustment', '2026-03');
    submit();
    http.expectOne('data/rent-indexes/casa-propia.json').flush(
      datasetFixture('casa-propia', [
        { period: '2026-01', value: 1.02, index: 'CVS' },
        { period: '2026-02', value: 1.03, index: 'CER' },
        { period: '2026-03', value: 1.01, index: 'CVS' },
      ]),
    );
    await detectAsyncChanges();

    expect(resultCard().textContent).toContain('106.110');
    expect(element.textContent).toContain('Ver coeficientes mensuales aplicados');
    expect(element.textContent).toContain('CVS');
  });

  it('lists a missing Casa Propia month instead of interpolating it', async () => {
    selectIndex('casa-propia');
    setControlValue('#current-rent', '100000');
    setControlValue('#last-adjustment', '2026-01');
    setControlValue('#next-adjustment', '2026-03');
    submit();
    http.expectOne('data/rent-indexes/casa-propia.json').flush(
      datasetFixture('casa-propia', [
        { period: '2026-01', value: 1.02, index: 'CVS' },
        { period: '2026-03', value: 1.01, index: 'CVS' },
      ]),
    );
    await detectAsyncChanges();
    expect(resultCard().textContent).toContain('Datos no disponibles');
    expect(resultCard().textContent).toContain('2026-02');

    query<HTMLButtonElement>('button[type="button"]').click();
    fixture.detectChanges();
    expect(resultCard().textContent).toContain('Completá los datos');
  });

  function resultCard(): HTMLElement {
    return query<HTMLElement>('aside[aria-labelledby="result-title"]');
  }

  function selectIndex(value: string): void {
    setControlValue('#index-type', value, 'change');
    fixture.detectChanges();
  }

  function submit(): void {
    query<HTMLButtonElement>('button[type="submit"]').click();
    fixture.detectChanges();
  }

  function query<T extends Element>(selector: string): T {
    const match = element.querySelector<T>(selector);
    if (!match) {
      throw new Error(`No se encontró el elemento ${selector}`);
    }
    return match;
  }

  function setControlValue(selector: string, value: string, eventName = 'input'): void {
    const control = query<HTMLInputElement | HTMLSelectElement>(selector);
    control.value = value;
    control.dispatchEvent(new Event(eventName));
  }

  function flushManifestIfRequested(): void {
    const requests = http.match('data/rent-indexes/manifest.json');
    for (const request of requests) {
      request.flush({
        schemaVersion: 1,
        generatedAt: '2026-08-07T00:00:00.000Z',
        datasets: {
          icl: {
            file: 'icl.json',
            frequency: 'daily',
            from: '2020-07-01',
            to: '2026-08-16',
            rowCount: 2238,
          },
          ipc: {
            file: 'ipc.json',
            frequency: 'monthly',
            from: '2016-12',
            to: '2026-06',
            rowCount: 115,
          },
          'casa-propia': {
            file: 'casa-propia.json',
            frequency: 'monthly',
            from: '2023-03',
            to: '2026-09',
            rowCount: 43,
          },
        },
      });
    }
  }

  async function detectAsyncChanges(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  function datasetFixture(
    type: 'icl' | 'ipc' | 'casa-propia',
    values: readonly (
      | { readonly date: string; readonly value: number }
      | {
          readonly period: string;
          readonly value: number;
          readonly index?: 'CVS' | 'CER';
        }
    )[],
  ): object {
    const first = values[0];
    const last = values.at(-1)!;
    const key = type === 'icl' ? 'date' : 'period';
    const from =
      key === 'date' && 'date' in first ? first.date : 'period' in first ? first.period : '';
    const to = key === 'date' && 'date' in last ? last.date : 'period' in last ? last.period : '';
    return {
      schemaVersion: 1,
      type,
      frequency: type === 'icl' ? 'daily' : 'monthly',
      ...(type === 'casa-propia'
        ? { calculationMode: 'compound-monthly-coefficients' }
        : {}),
      source: {
        organization: 'Organismo oficial de prueba',
        shortName: 'TEST',
        datasetName: `${type.toUpperCase()} de prueba`,
        sourceFile: `${type}-fixture`,
        sourceSha256: 'fixture-hash',
      },
      generatedAt: '2026-08-07T00:00:00.000Z',
      coverage: { from, to },
      rowCount: values.length,
      values,
    };
  }
});
