import { SacSemester } from './sac.models';

export const SAC_DEFAULT_YEAR = 2026;
export const SAC_YEAR_OPTIONS = Array.from({ length: 16 }, (_, index) => 2020 + index);
export const SAC_RATE = 0.5;

export const SAC_MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export const SAC_PAYMENT_DATES: Readonly<Record<SacSemester, string>> = {
  first: '30 de junio',
  second: '18 de diciembre',
};

export const SAC_SOURCES = [
  {
    name: 'Ley 23.041',
    url: 'https://www.argentina.gob.ar/normativa/nacional/ley-23041-1983-28165/texto',
  },
  {
    name: 'Decreto 1.078/1984',
    url: 'https://www.argentina.gob.ar/normativa/nacional/decreto-1078-1984-105143/texto',
  },
  {
    name: 'Ley de Contrato de Trabajo 20.744 — arts. 121, 122 y 123',
    url: 'https://www.argentina.gob.ar/normativa/nacional/ley-20744-25552/actualizacion',
  },
  {
    name: 'Ley 27.073',
    url: 'https://www.argentina.gob.ar/normativa/nacional/ley-27073-2014-241014/texto',
  },
] as const;
