import { Component } from '@angular/core';
import { ActionSheetController, IonicModule, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Item } from './item/item.model';
import { ItemService } from './item/item.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ]
})
export class HomePage {

  /** Lista completa (fonte da verdade) */
  originalItens: Item[] = [];

  /** Lista exibida (com ou sem filtro) */
  itens: Item[] = [];

  /** Controle de filtro */
  filtragemAtiva = false;
  termoBusca = '';

  /** Formatter de moeda */
  public formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  constructor(
    private actionSheetCtrl: ActionSheetController,
    private itemService: ItemService,
    private navCtrl: NavController
  ) { }

  /**
   * Ciclo de vida correto para Ionic
   * Sempre recarrega quando a tela entra em foco
   */
  ionViewWillEnter(): void {
    this.listar();
  }

  /**
   * Carrega os itens e reaplica filtro se necessário
   */
  listar() {
    const dados = this.itemService.getTodos();

    // força nova referência
    this.originalItens = [...dados];

    if (this.filtragemAtiva && this.termoBusca) {
      this.aplicarFiltro(this.termoBusca);
    } else {
      this.itens = [...this.originalItens];
    }
  }


  /**
   * Total dos itens marcados no carrinho
   */
  getTotal(): string {
    const soma = this.itens.reduce((total, item) => {
      return item.noCarrinho ? total + item.valor * item.qtd : total;
    }, 0);

    return this.formatter.format(soma);
  }

  /** Ordenações */
  ordenaPorDescricao(): void {
    this.itemService.orderByDescricao();
    this.listar();
  }

  ordenaPorQuantidade(): void {
    this.itemService.orderByQtd();
    this.listar();
  }

  ordenaPorCategoria(): void {
    this.itemService.orderByCategoria();
    this.listar();
  }

  /**
   * Aplica filtro na lista original
   */
  private aplicarFiltro(query: string): void {
    const termo = query.toLowerCase();

    this.itens = this.originalItens.filter(item =>
      item.descricao.toLowerCase().includes(termo) ||
      item.categoria.toLowerCase().includes(termo)
    );
  }

  /**
   * Evento de busca
   */
  filtrar(event: any): void {
    this.termoBusca = event.target.value?.trim().toLowerCase() ?? '';

    if (!this.termoBusca) {
      this.filtragemAtiva = false;
      this.itens = [...this.originalItens];
      return;
    }

    this.filtragemAtiva = true;
    this.aplicarFiltro(this.termoBusca);
  }

  /**
   * Limpa busca
   */
  limpar(): void {
    this.filtragemAtiva = false;
    this.termoBusca = '';
    this.itens = [...this.originalItens];
  }

  /**
   * ActionSheet de opções do item
   */
  async abrirOpcoes(item: Item): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'ios',
      header: 'Opções',
      buttons: [
        {
          text: 'Editar',
          icon: 'pencil',
          handler: () => {
            this.navCtrl.navigateForward(`/home/editar/${item.id}`);
          }
        },
        {
          text: 'Excluir',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.excluirItem(item.id);
          }
        },
        {
          text: item.noCarrinho ? 'Retirar do Carrinho' : 'Colocar no Carrinho',
          icon: 'cart',
          handler: () => {
            this.toggleCarrinho(item);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Remove item
   */
  private excluirItem(id: string): void {
    this.originalItens = this.originalItens.filter(item => item.id !== id);
    this.itemService.salvarLista(this.originalItens);

    if (this.filtragemAtiva) {
      this.itens = this.itens.filter(item => item.id !== id);
    } else {
      this.itens = [...this.originalItens];
    }
  }

  /**
   * Marca/desmarca carrinho
   */
  private toggleCarrinho(item: Item): void {
    item.noCarrinho = !item.noCarrinho;
    this.itemService.editar(item);
    this.listar();
  }
}
