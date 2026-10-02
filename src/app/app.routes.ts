import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'lists',
    loadComponent: () =>
      import('./pages/lists/lists.page').then((m) => m.ListsPage),
  },
  {
    path: 'lists/:id',
    loadComponent: () =>
      import('./pages/lists/detail/list-detail.page').then(
        (m) => m.ListDetailPage
      ),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/categories/categories.page').then(
        (m) => m.CategoriesPage
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'home',
    redirectTo: 'lists',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'lists',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'lists',
  },
];
