import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonicModule,
  ItemReorderEventDetail,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  createOutline,
  trashOutline,
  reorderThreeOutline,
  pricetagOutline,
  menuOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { CategoryService } from '../../core/services/category.service';
import { StorageService, STORAGE_KEYS } from '../../core/services/storage.service';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class CategoriesPage implements OnInit, OnDestroy {
  categories: Category[] = [];
  isLoading = false;
  private sub = new Subscription();

  constructor(
    private categoryService: CategoryService,
    private storageService: StorageService,
    private alertController: AlertController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    addIcons({
      add,
      createOutline,
      trashOutline,
      reorderThreeOutline,
      pricetagOutline,
      menuOutline,
    });
  }

  ngOnInit() {
    this.carregarCategorias();

    this.sub.add(
      this.storageService.dataChanged$.subscribe((key) => {
        if (key === STORAGE_KEYS.CATEGORIES || key === '*') {
          this.ngZone.run(() => this.carregarCategorias());
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  ionViewWillEnter() {
    this.carregarCategorias();
  }

  async carregarCategorias() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      this.categories = await this.categoryService.getAll();
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      this.mostrarToast('Erro ao carregar categorias.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const itemMoved = this.categories.splice(event.detail.from, 1)[0];
    this.categories.splice(event.detail.to, 0, itemMoved);
    event.detail.complete();

    try {
      await this.categoryService.updateOrder(this.categories);
      this.mostrarToast('Ordem das categorias atualizada!');
    } catch (error) {
      console.error('Erro ao salvar reordenação:', error);
      this.mostrarToast('Erro ao atualizar ordem.');
      this.carregarCategorias();
    }
  }

  async abrirModalNovaCategoria() {
    const alert = await this.alertController.create({
      header: 'Nova Categoria',
      message: 'Defina o nome da categoria para organizar seus corredores:',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Ex: HORTIFRUTI, BEBIDAS, LIMPEZA',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (data) => {
            if (!data.name || data.name.trim() === '') {
              this.mostrarToast('O nome da categoria é obrigatório.');
              return false;
            }
            this.ngZone.run(async () => {
              try {
                await this.categoryService.create(data.name);
                this.mostrarToast('Categoria criada com sucesso!');
                await this.carregarCategorias();
              } catch (error) {
                console.error('Erro ao criar categoria:', error);
                this.mostrarToast('Erro ao criar categoria (nome já existe?).');
              }
            });
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async editarCategoria(cat: Category) {
    const alert = await this.alertController.create({
      header: 'Editar Categoria',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: cat.name,
          placeholder: 'Nome da categoria',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Atualizar',
          handler: (data) => {
            if (!data.name || data.name.trim() === '') {
              return false;
            }
            this.ngZone.run(async () => {
              try {
                await this.categoryService.update({
                  ...cat,
                  name: data.name,
                });
                this.mostrarToast('Categoria atualizada!');
                await this.carregarCategorias();
              } catch (error) {
                console.error('Erro ao editar categoria:', error);
                this.mostrarToast('Erro ao editar categoria.');
              }
            });
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async confirmarExclusao(cat: Category) {
    const alert = await this.alertController.create({
      header: 'Excluir Categoria',
      message: `Tem certeza que deseja excluir '${cat.name}'? Os produtos vinculados serão preservados na categoria 'OUTROS'.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.ngZone.run(async () => {
              try {
                await this.categoryService.delete(cat.id);
                this.mostrarToast('Categoria excluída com sucesso.');
                await this.carregarCategorias();
              } catch (error) {
                console.error('Erro ao excluir categoria:', error);
                this.mostrarToast('Erro ao excluir categoria.');
              }
            });
          },
        },
      ],
    });

    await alert.present();
  }

  private async mostrarToast(mensagem: string) {
    const toast = await this.toastController.create({
      message: mensagem,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
