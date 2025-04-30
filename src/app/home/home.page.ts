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
  // Armazena todos os itens (sem filtro)
  originalItens: Item[] = [];

  // Armazena os itens que serão exibidos (com ou sem filtro)
  itens: Item[] = [];

  // Rastreia se há filtragem ativa
  filtragemAtiva: boolean = false;
  termoBusca: string = '';

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
    this.originalItens = this.itemService.getTodos();

    // Se houver um filtro ativo, aplica-o aos novos dados
    if (this.filtragemAtiva && this.termoBusca) {
      this.aplicarFiltro(this.termoBusca);
    } else {
      this.itens = [...this.originalItens];
    }
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
    // Adiciona o item à lista original
    this.originalItens.push(item);

    // Salva no service (isso reordena os itens)
    this.itemService.salvarLista(this.originalItens);

    // Recarrega a lista (mantendo filtros se houver)
    this.listar();
  }

  // Método auxiliar que aplica filtro na lista
  private aplicarFiltro(query: string) {
    this.itens = this.originalItens.filter((item) =>
      item.descricao.toLowerCase().includes(query.toLowerCase()) ||
      item.categoria.toLowerCase().includes(query.toLowerCase())
    );
  }

  filtrar(event: any) {
    this.termoBusca = event.target.value.trim().toLowerCase();

    if (!this.termoBusca) {
      // Se a busca estiver vazia, desativa o filtro
      this.filtragemAtiva = false;
      this.itens = [...this.originalItens];
      return;
    }

    // Marca que há um filtro ativo
    this.filtragemAtiva = true;

    // Aplica o filtro
    this.aplicarFiltro(this.termoBusca);
  }

  limpar(event: any) {
    this.filtragemAtiva = false;
    this.termoBusca = '';
    this.listar();
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
            // 1. Remove o item da lista original
            this.originalItens = this.originalItens.filter((it) => it.id !== item.id);

            // 2. Salva a lista atualizada no serviço
            this.itemService.salvarLista(this.originalItens);

            // 3. Se houver filtro ativo, atualiza a lista filtrada
            if (this.filtragemAtiva) {
              this.itens = this.itens.filter((it) => it.id !== item.id);
            } else {
              // Caso contrário, simplesmente atualiza com os itens originais
              this.itens = [...this.originalItens];
            }
          },
        },
        {
          text: item.noCarrinho ? 'Retirar do Carrinho' : 'Colocar no Carrinho',
          icon: 'cart',
          handler: () => {
            // 1. Atualiza o status de carrinho
            item.noCarrinho = !item.noCarrinho;

            // 2. Atualiza no serviço
            this.itemService.editar(item);

            // 3. Recarrega todos os dados (pois o serviço reordena)
            // Isso manterá o filtro se houver
            this.listar();
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
