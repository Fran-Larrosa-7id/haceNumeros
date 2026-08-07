import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IndexedRentType,
  RentIndexDataset,
  RentIndexFrequency,
  RentIndexManifest,
  RentIndexPoint,
} from '../domain/rent-calculation.models';

interface StaticDatasetSource {
  readonly organization: string;
  readonly shortName: string;
  readonly datasetName: string;
  readonly sourceFile: string;
  readonly sourceSha256: string;
}

interface StaticDatasetBase {
  readonly schemaVersion: 1;
  readonly frequency: RentIndexFrequency;
  readonly source: StaticDatasetSource;
  readonly generatedAt: string;
  readonly coverage: { readonly from: string; readonly to: string };
  readonly rowCount: number;
}

interface StaticIclDataset extends StaticDatasetBase {
  readonly type: 'icl';
  readonly values: readonly { readonly date: string; readonly value: number }[];
}

interface StaticIpcDataset extends StaticDatasetBase {
  readonly type: 'ipc';
  readonly values: readonly { readonly period: string; readonly value: number }[];
}

interface StaticCasaPropiaDataset extends StaticDatasetBase {
  readonly type: 'casa-propia';
  readonly calculationMode: 'compound-monthly-coefficients';
  readonly values: readonly {
    readonly period: string;
    readonly value: number;
    readonly index: 'CVS' | 'CER';
  }[];
}

const RENT_INDEX_DATA_PATH = 'data/rent-indexes';

@Injectable({ providedIn: 'root' })
export class RentIndexRepository {
  private readonly http = inject(HttpClient);
  private readonly datasetCache = new Map<IndexedRentType, Promise<RentIndexDataset>>();
  private manifestRequest: Promise<RentIndexManifest> | null = null;

  getDataset(type: IndexedRentType): Promise<RentIndexDataset> {
    const cached = this.datasetCache.get(type);
    if (cached) {
      return cached;
    }

    const request = this.fetchDataset(type).catch((error: unknown) => {
      this.datasetCache.delete(type);
      throw error;
    });
    this.datasetCache.set(type, request);
    return request;
  }

  getManifest(): Promise<RentIndexManifest> {
    if (!this.manifestRequest) {
      this.manifestRequest = firstValueFrom(
        this.http.get<RentIndexManifest>(`${RENT_INDEX_DATA_PATH}/manifest.json`),
      ).catch((error: unknown) => {
        this.manifestRequest = null;
        throw error;
      });
    }
    return this.manifestRequest;
  }

  findPoint(dataset: RentIndexDataset, date: string): RentIndexPoint | null {
    return dataset.values.find((point) => point.date === date) ?? null;
  }

  private async fetchDataset(type: IndexedRentType): Promise<RentIndexDataset> {
    if (type === 'icl') {
      const dataset = await firstValueFrom(
        this.http.get<StaticIclDataset>(`${RENT_INDEX_DATA_PATH}/icl.json`),
      );
      this.assertStaticDataset(dataset, 'icl');
      return this.toDomainDataset(
        dataset,
        dataset.values.map((point) => ({ date: point.date, value: point.value })),
      );
    }

    if (type === 'ipc') {
      const dataset = await firstValueFrom(
        this.http.get<StaticIpcDataset>(`${RENT_INDEX_DATA_PATH}/ipc.json`),
      );
      this.assertStaticDataset(dataset, 'ipc');
      return this.toDomainDataset(
        dataset,
        dataset.values.map((point) => ({ date: point.period, value: point.value })),
      );
    }

    const dataset = await firstValueFrom(
      this.http.get<StaticCasaPropiaDataset>(`${RENT_INDEX_DATA_PATH}/casa-propia.json`),
    );
    this.assertStaticDataset(dataset, 'casa-propia');
    if (dataset.calculationMode !== 'compound-monthly-coefficients') {
      throw new Error('El dataset CASA PROPIA no declara el cálculo acumulativo esperado.');
    }
    return this.toDomainDataset(
      dataset,
      dataset.values.map((point) => ({
        date: point.period,
        value: point.value,
        basis: point.index,
      })),
    );
  }

  private toDomainDataset(
    dataset: StaticIclDataset | StaticIpcDataset | StaticCasaPropiaDataset,
    values: readonly RentIndexPoint[],
  ): RentIndexDataset {
    return {
      type: dataset.type,
      frequency: dataset.frequency,
      calculationMode:
        dataset.type === 'casa-propia' ? dataset.calculationMode : undefined,
      sourceName: dataset.source.organization,
      sourceShortName: dataset.source.shortName,
      sourceFile: dataset.source.sourceFile,
      effectiveFrom: dataset.coverage.from,
      updatedAt: dataset.coverage.to,
      coverage: dataset.coverage,
      values,
    };
  }

  private assertStaticDataset(
    dataset: StaticIclDataset | StaticIpcDataset | StaticCasaPropiaDataset,
    expectedType: IndexedRentType,
  ): void {
    if (
      dataset.schemaVersion !== 1 ||
      dataset.type !== expectedType ||
      dataset.values.length === 0 ||
      dataset.rowCount !== dataset.values.length ||
      !dataset.source?.organization
    ) {
      throw new Error(`El dataset ${expectedType.toUpperCase()} no cumple el contrato esperado.`);
    }
  }
}
