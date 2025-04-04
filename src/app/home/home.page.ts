import { Component, OnInit } from '@angular/core';
import { ActionSheetController, NavController } from '@ionic/angular';
import { Item } from './item/item.model';
import { ItemService } from './item/item.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  itens: Item[] = [];
  lista: Item[] = [];

  constructor(
    private actionSheetCrtl: ActionSheetController,
    private itemService: ItemService,
    private navCrtl: NavController
  ) {}

  formatter = new Intl.NumberFormat('default', {
    style: 'currency',
    currency: 'BRL',
  });

  ngOnInit(): void {}

  ionViewWillEnter() {
    this.listar();
  }

  listar() {
    this.itens = this.itemService.getTodos();
  }

  getTotal() {
    let soma: number = 0;

    this.itens.forEach((e) => {
      if (e.noCarrinho === true) {
        soma += e.valor * e.qtd;
      }
    });

    return this.formatter.format(soma);
  }

  ordenaPorDescricao() {
    this.itemService.orderByDescricao();
    this.listar();
  }

  ordenaPorQuantidade() {
    this.itemService.orderByQtd();
    this.listar();
  }

  ordenaPorCategoria() {
    this.itemService.orderByCategoria();
    this.listar();
  }

  salvar(item: Item) {
    this.itens.push(item);
    this.itemService.salvarLista(this.itens);
    this.listar();
  }

  filtrar(event: any) {
    const query = event.target.value.toLowerCase();

    this.setlista(this.itens)

    this.itens = this.lista.filter(
      (d) =>
        d.descricao.toLowerCase().indexOf(query) > -1 ||
        d.categoria.toLowerCase().indexOf(query) > -1
    );
  }

  limpar(event: any) {
    this.listar();
  }

  setlista(itens: Item[]) {
    if (this.lista.length === 0){
      this.lista = itens
    }
  }

  async abrirOpcoes(item: Item) {
    const actionSheet = await this.actionSheetCrtl.create({
      mode: 'ios',
      header: 'Opções',
      buttons: [
        {
          text: 'Editar',
          icon: 'pencil',
          handler: () => {
            // this.editarItem(item)
            this.navCrtl.navigateForward('home/editar/' + item.id);
          },
        },
        {
          text: 'Excluir',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.itens = this.itens.filter((it) => {
              return it.id != item.id;
            });
            this.itemService.salvarLista(this.itens);
          },
        },
        {
          text: item.noCarrinho ? 'Retirar do Carrinho' : 'Colocar no Carrinho',
          icon: 'cart',
          handler: () => {
            item.noCarrinho = !item.noCarrinho;
            this.itemService.editar(item);
          },
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          handler: () => {},
        },
      ],
    });

    await actionSheet.present();
  }
}
