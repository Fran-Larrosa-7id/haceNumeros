import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page').then((component) => component.HomePage),
  },
  {
    path: 'calculadora-aumento-alquiler',
    loadComponent: () =>
      import('./features/rent-increase/pages/rent-increase-page/rent-increase-page').then(
        (component) => component.RentIncreasePage,
      ),
  },
  {
    path: 'calculadora-sueldo-bruto-neto',
    loadComponent: () =>
      import('./features/salary-calculator/pages/salary-calculator-page/salary-calculator-page').then(
        (component) => component.SalaryCalculatorPage,
      ),
  },
  {
    path: 'calculadora-aguinaldo',
    loadComponent: () =>
      import('./features/aguinaldo/pages/sac-calculator-page/sac-calculator-page').then(
        (component) => component.SacCalculatorPage,
      ),
  },
  {
    path: 'calculadora-indemnizacion-despido',
    loadComponent: () =>
      import('./features/dismissal-compensation/pages/dismissal-calculator-page/dismissal-calculator-page').then(
        (component) => component.DismissalCalculatorPage,
      ),
  },
  {
    path: 'calculadora-monotributo',
    loadComponent: () =>
      import('./features/monotributo/pages/monotributo-calculator-page/monotributo-calculator-page').then(
        (component) => component.MonotributoCalculatorPage,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((component) => component.NotFoundPage),
  },
];
