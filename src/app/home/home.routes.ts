import { Routes } from '@angular/router';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home.page').then(m => m.HomePage),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./item/novo/novo.page').then(m => m.NovoPage),
  },
  {
    path: 'editar/:produtoId',
    loadComponent: () =>
      import('./item/editar/editar.page').then(m => m.EditarPage),
  },
];
