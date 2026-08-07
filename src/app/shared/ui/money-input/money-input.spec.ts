import { describe, expect, it } from 'vitest';
import { formatArgentineMoney, parseArgentineMoney } from './money-input';

describe('Argentine money normalization', () => {
  it.each([
    ['1.000', 1_000],
    ['10.000', 10_000],
    ['100.000', 100_000],
    ['1.000.000', 1_000_000],
    ['2.000.000', 2_000_000],
    ['4.509.567,41', 4_509_567.41],
    ['500.000', 500_000],
    ['123456.78', 123_456.78],
    ['123.456,78', 123_456.78],
  ])('normalizes %s as pesos without changing its magnitude', (rawValue, expected) => {
    expect(parseArgentineMoney(rawValue)).toBe(expected);
  });

  it.each([
    [1_000, '1.000'],
    [10_000, '10.000'],
    [100_000, '100.000'],
    [1_000_000, '1.000.000'],
    [123_456.78, '123.456,78'],
  ])('formats %s only for presentation', (value, expected) => {
    expect(formatArgentineMoney(value)).toBe(expected);
  });

  it.each(['', 'abc', '123,456,78', '123.45.67', '123,4567'])(
    'rejects an invalid monetary value: %s',
    (value) => {
      expect(parseArgentineMoney(value)).toBeNull();
    },
  );
});
