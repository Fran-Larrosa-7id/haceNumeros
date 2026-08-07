import { describe, expect, it } from 'vitest';
import { RentIndexDataset } from '../domain/rent-calculation.models';
import { RentIndexRepository } from './rent-index-repository';

describe('RentIndexRepository', () => {
  const repository = new RentIndexRepository();

  it('reports that production datasets are not available yet', () => {
    expect(repository.getDataset('icl')).toBeNull();
    expect(repository.getDataset('ipc')).toBeNull();
    expect(repository.getDataset('casa-propia')).toBeNull();
  });

  it('returns null when a test dataset has no point for a date', () => {
    const fixture: RentIndexDataset = {
      type: 'ipc',
      sourceName: 'Fixture exclusiva de test',
      effectiveFrom: '2025-01-01',
      updatedAt: '2025-02-01',
      values: [{ date: '2025-01-01', value: 100 }],
    };

    expect(repository.findPoint(fixture, '2025-02-01')).toBeNull();
  });
});
