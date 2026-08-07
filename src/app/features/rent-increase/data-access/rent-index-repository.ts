import { Injectable } from '@angular/core';
import { RENT_INDEX_DATASETS } from '../data/rent-index-data';
import {
  IndexedRentType,
  RentIndexDataset,
  RentIndexPoint,
} from '../domain/rent-calculation.models';

@Injectable({ providedIn: 'root' })
export class RentIndexRepository {
  getDataset(type: IndexedRentType): RentIndexDataset | null {
    return RENT_INDEX_DATASETS.find((dataset) => dataset.type === type) ?? null;
  }

  findPoint(dataset: RentIndexDataset, date: string): RentIndexPoint | null {
    return dataset.values.find((point) => point.date === date) ?? null;
  }
}
