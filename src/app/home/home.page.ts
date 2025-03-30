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

    this.setlista(this.itens); // Atualiza a lista original

    this.listar(); // Atualiza a exibição na tela
  }

  filtrar(event: any) {
    const query = event.target.value.trim().toLowerCase(); // Remove espaços extras e usa letras minúsculas

    if (!query) {
      // Se a busca estiver vazia, exibir a lista completa
      this.listar();
      return;
    }

    this.setlista(this.itens); // Garante que a lista original está armazenada

    this.itens = this.lista.filter((item) =>
      item.descricao.toLowerCase().includes(query) || // Verifica na descrição
      item.categoria.toLowerCase().includes(query)   // Verifica na categoria
    );

    // Adicionar feedback se nenhum item for encontrado
    if (this.itens.length === 0) {
      console.log("Nenhum item encontrado para a busca:", query);
    }
  }

  limpar(event: any) {
    this.listar();
  }

  setlista(itens: Item[]) {
    this.lista = [...itens]; // Clona a lista atual para evitar alterações inesperadas
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
            this.navCrtl.navigateForward('home/editar/' + item.id);
          },
        },
        {
          text: 'Excluir',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            // Remove o item da lista original
            this.lista = this.lista.filter((it) => it.id !== item.id);

            // Atualiza a lista visível (itens filtrados ou não filtrados)
            this.itens = this.lista;

            // Salva a lista atualizada no serviço
            this.itemService.salvarLista(this.lista);
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
