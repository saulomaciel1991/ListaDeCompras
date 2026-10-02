import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  AlertController,
  IonicModule,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  star,
  starOutline,
  cartOutline,
  checkmarkCircleOutline,
  copyOutline,
  trashOutline,
  ellipsisVertical,
  timeOutline,
  bagCheckOutline,
  createOutline,
  archiveOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ListService } from '../../core/services/list.service';
import { StorageService, STORAGE_KEYS } from '../../core/services/storage.service';
import { ShoppingList } from '../../core/models/list.model';

@Component({
  selector: 'app-lists',
  templateUrl: './lists.page.html',
  styleUrls: ['./lists.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class ListsPage implements OnInit, OnDestroy {
  lists: ShoppingList[] = [];
  isLoading = false;
  private sub = new Subscription();

  public currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  constructor(
    private listService: ListService,
    private storageService: StorageService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    addIcons({
      add,
      star,
      starOutline,
      cartOutline,
      checkmarkCircleOutline,
      copyOutline,
      trashOutline,
      ellipsisVertical,
      timeOutline,
      bagCheckOutline,
      createOutline,
      archiveOutline,
    });
  }

  ngOnInit() {
    this.carregarListas();

    this.sub.add(
      this.storageService.dataChanged$.subscribe((key) => {
        if (
          key === STORAGE_KEYS.LISTS ||
          key === STORAGE_KEYS.LIST_ITEMS ||
          key === '*'
        ) {
          this.ngZone.run(() => this.carregarListas());
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  ionViewWillEnter() {
    this.carregarListas();
  }

  async carregarListas() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      this.lists = await this.listService.getAll();
    } catch (error) {
      console.error('Erro ao carregar listas de compras:', error);
      this.mostrarToast('Erro ao carregar listas.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  abrirLista(list: ShoppingList) {
    this.router.navigate(['/lists', list.id]);
  }

  async criarNovaLista() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const alert = await this.alertController.create({
      header: 'Nova Lista de Compras',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Ex: Feira Semanal, Supermercado',
          value: `Compras ${hoje}`,
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Criar',
          handler: (data) => {
            if (!data.name || data.name.trim() === '') {
              this.mostrarToast('O nome da lista é obrigatório.');
              return false;
            }
            this.ngZone.run(async () => {
              try {
                const nova = await this.listService.create(data.name);
                this.mostrarToast('Lista criada!');
                await this.carregarListas();
                this.router.navigate(['/lists', nova.id]);
              } catch (err) {
                console.error('Erro ao criar lista:', err);
                this.mostrarToast('Erro ao criar lista.');
              }
            });
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async renomearLista(list: ShoppingList) {
    const alert = await this.alertController.create({
      header: 'Renomear Lista',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: list.name,
          placeholder: 'Nome da lista',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (data) => {
            if (!data.name || data.name.trim() === '') {
              this.mostrarToast('O nome da lista não pode ser vazio.');
              return false;
            }
            this.ngZone.run(async () => {
              try {
                await this.listService.rename(list.id, data.name);
                this.mostrarToast('Lista renomeada com sucesso!');
                await this.carregarListas();
              } catch (err) {
                console.error('Erro ao renomear lista:', err);
                this.mostrarToast('Erro ao renomear lista.');
              }
            });
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async concluirLista(list: ShoppingList) {
    const alert = await this.alertController.create({
      header: 'Concluir Lista',
      message: `Deseja marcar '${list.name}' como concluída? Ela se tornará automaticamente a sua Lista de Referência para comparação de preços nos próximos mercados.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Concluir & Promover',
          handler: () => {
            this.ngZone.run(async () => {
              try {
                await this.listService.complete(list.id);
                this.mostrarToast('Lista concluída e promovida a referência de preços! ⭐');
                await this.carregarListas();
              } catch (err) {
                console.error('Erro ao concluir lista:', err);
                this.mostrarToast('Erro ao concluir lista.');
              }
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async definirComoReferencia(list: ShoppingList) {
    try {
      await this.listService.setAsReference(list.id);
      this.mostrarToast(`'${list.name}' definida como Lista de Referência! ⭐`);
      await this.carregarListas();
    } catch (err) {
      console.error('Erro ao definir referência:', err);
      this.mostrarToast('Erro ao atualizar referência.');
    }
  }

  async duplicarLista(list: ShoppingList) {
    try {
      const duplicada = await this.listService.duplicate(list.id);
      this.mostrarToast(`Lista duplicada: '${duplicada.name}'`);
      await this.carregarListas();
    } catch (err) {
      console.error('Erro ao duplicar lista:', err);
      this.mostrarToast('Erro ao duplicar lista.');
    }
  }

  async confirmarExclusao(list: ShoppingList) {
    const alert = await this.alertController.create({
      header: 'Excluir Lista',
      message: `Tem certeza que deseja excluir '${list.name}' e todos os seus itens?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.ngZone.run(async () => {
              try {
                await this.listService.delete(list.id);
                this.mostrarToast('Lista excluída.');
                await this.carregarListas();
              } catch (err) {
                console.error('Erro ao excluir lista:', err);
                this.mostrarToast('Erro ao excluir lista.');
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
