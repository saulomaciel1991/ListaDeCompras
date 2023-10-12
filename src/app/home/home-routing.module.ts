import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';

const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'novo',
    loadChildren: () => import('./item/novo/novo.module').then( m => m.NovoPageModule)
  },
  {
    path: 'editar/:produtoId',
    loadChildren: () => import('./item/editar/editar.module').then( m => m.EditarPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
