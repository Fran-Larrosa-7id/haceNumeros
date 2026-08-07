import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RentIndexDataset } from '../domain/rent-calculation.models';
import { RentIndexRepository } from './rent-index-repository';

describe('RentIndexRepository', () => {
  let repository: RentIndexRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(RentIndexRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads ICL once, maps its metadata and caches it in memory', async () => {
    const first = repository.getDataset('icl');
    const second = repository.getDataset('icl');
    expect(first).toBe(second);

    http.expectOne('data/rent-indexes/icl.json').flush({
      schemaVersion: 1,
      type: 'icl',
      frequency: 'daily',
      source: {
        organization: 'Organismo de prueba',
        shortName: 'TEST',
        datasetName: 'ICL de prueba',
        sourceFile: 'icl-fixture.xls',
        sourceSha256: 'fixture-hash',
      },
      generatedAt: '2026-01-02T00:00:00.000Z',
      coverage: { from: '2025-01-01', to: '2026-01-01' },
      rowCount: 2,
      values: [
        { date: '2025-01-01', value: 10 },
        { date: '2026-01-01', value: 15 },
      ],
    });

    const dataset = await first;
    expect(dataset?.sourceName).toBe('Organismo de prueba');
    expect(repository.findPoint(dataset as RentIndexDataset, '2026-01-01')?.value).toBe(15);
  });

  it('maps IPC monthly periods to domain lookup keys', async () => {
    const request = repository.getDataset('ipc');
    http.expectOne('data/rent-indexes/ipc.json').flush({
      schemaVersion: 1,
      type: 'ipc',
      frequency: 'monthly',
      source: {
        organization: 'Organismo de prueba',
        shortName: 'TEST',
        datasetName: 'IPC de prueba',
        sourceFile: 'ipc-fixture.csv',
        sourceSha256: 'fixture-hash',
      },
      generatedAt: '2026-01-02T00:00:00.000Z',
      coverage: { from: '2025-01', to: '2026-01' },
      rowCount: 2,
      values: [
        { period: '2025-01', value: 100 },
        { period: '2026-01', value: 125 },
      ],
    });

    const dataset = await request;
    expect(repository.findPoint(dataset as RentIndexDataset, '2026-01')?.value).toBe(125);
  });

  it('loads, maps and caches Casa Propia monthly coefficients', async () => {
    const first = repository.getDataset('casa-propia');
    const second = repository.getDataset('casa-propia');
    expect(first).toBe(second);

    http.expectOne('data/rent-indexes/casa-propia.json').flush({
      schemaVersion: 1,
      type: 'casa-propia',
      frequency: 'monthly',
      calculationMode: 'compound-monthly-coefficients',
      source: {
        organization: 'Ministerio de Economía',
        shortName: 'Secretaría de Obras Públicas',
        datasetName: 'Coeficiente de actualización de los Créditos Casa Propia',
        sourceFile: 'casa-propia.pdf',
        sourceSha256: 'fixture-hash',
      },
      generatedAt: '2026-08-07T00:00:00.000Z',
      coverage: { from: '2026-01', to: '2026-02' },
      rowCount: 2,
      values: [
        { period: '2026-01', value: 1.02, index: 'CVS' },
        { period: '2026-02', value: 1.03, index: 'CER' },
      ],
    });

    const dataset = await first;
    expect(dataset.calculationMode).toBe('compound-monthly-coefficients');
    expect(repository.findPoint(dataset, '2026-02')).toEqual({
      date: '2026-02',
      value: 1.03,
      basis: 'CER',
    });
  });

  it('distinguishes a loaded dataset from a missing point', async () => {
    const fixture: RentIndexDataset = {
      type: 'ipc',
      frequency: 'monthly',
      sourceName: 'Fixture exclusiva de test',
      sourceShortName: 'TEST',
      sourceFile: 'fixture.json',
      effectiveFrom: '2025-01',
      updatedAt: '2025-02',
      coverage: { from: '2025-01', to: '2025-02' },
      values: [{ date: '2025-01', value: 100 }],
    };

    expect(repository.findPoint(fixture, '2025-02')).toBeNull();
  });
});
