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
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((component) => component.NotFoundPage),
  },
];
