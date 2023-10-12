import { Component, OnInit } from '@angular/core';
import { ActionSheetController, AlertController } from '@ionic/angular';
import { Item } from './item/item.model';
import { ItemService } from './item/item.service';
import * as uuid from 'uuid';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  itens: Item[] = []
  constructor(private alertCrtl: AlertController, private actionSheetCrtl: ActionSheetController, private itemService: ItemService) { }

  formatter = new Intl.NumberFormat('default', {
    style: 'currency',
    currency: 'BRL',
  });

  ngOnInit(): void {
  }

  ionViewWillEnter() {
    this.listar()
  }

  listar() {
    this.itens = this.itemService.getTodos()
  }

  getTotal() {
    let soma: number = 0

    this.itens.forEach(e => {
      soma += (e.valor * e.qtd)
    })

    return this.formatter.format(soma)
  }

  ordenaPorDescricao() {
    this.itemService.orderByDescricao()
    this.listar()
  }

  ordenaPorQuantidade() {
    this.itemService.orderByQtd()
    this.listar()
  }

  salvar(item: Item) {
    this.itens.push(item)
    this.itemService.salvarLista(this.itens)
    this.listar()
  }

  retirarTodosDoCarrinho(){
    this.itens.forEach( e=>{
      e.noCarrinho = false
    })

    this.itemService.salvarLista(this.itens)
  }

  async menu (){
    const actionSheet = await this.actionSheetCrtl.create({
      mode: 'ios',
      header: 'Configurações',
      buttons: [
        {
          text: 'Retirar Todos do Carrinho',
          icon: 'trash',
          handler: () => {
            this.retirarTodosDoCarrinho()
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          handler: () => {
          }
        }
      ]
    })

    await actionSheet.present()
  }

  async adicionarItem() {
    const alert = await this.alertCrtl.create({
      header: 'Novo Item',
      mode: 'ios',
      inputs: [
        {
          name: 'qtd',
          type: 'number',
          placeholder: 'Informe a quantidade',
        },
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Informe o valor',
        },
        {
          name: 'descricao',
          type: 'text',
          placeholder: 'Informe a descrição do item',
        },
      ],

      buttons: [
        {
          text: 'Cancela',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {

          },
        },
        {
          text: 'Ok',
          handler: (form) => {
            this.salvar({
              id: uuid.v4(),
              qtd: parseInt(form.qtd),
              descricao: form.descricao,
              noCarrinho: false,
              valor: parseFloat(form.valor)
            })
          },
        },
      ],
    });

    alert.present();
  }

  async editarItem(item: Item) {
    const alert = await this.alertCrtl.create({
      header: 'Editar ' + item.descricao,
      mode: 'ios',
      inputs: [
        {
          name: 'qtd',
          type: 'number',
          placeholder: 'Informe a quantidade',
          value: item.qtd,
        },
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Informe o valor',
          value: item.valor
        },
        {
          name: 'descricao',
          type: 'text',
          placeholder: 'Informe a descrição do item',
          value: item.descricao,
        },
      ],

      buttons: [
        {
          text: 'Cancela',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {

          },
        },
        {
          text: 'Ok',
          handler: (form: Item) => {
            item.descricao = form.descricao
            item.qtd = form.qtd
            item.valor = form.valor
            this.itemService.editar(item)
          },
        },
      ],
    });

    alert.present();
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
            this.editarItem(item)
          }
        },
        {
          text: 'Excluir',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.itens = this.itens.filter(it => {
              return it.id != item.id
            })
            this.itemService.salvarLista(this.itens)
          }
        },
        {
          text: item.noCarrinho ? 'Retirar do Carrinho' : 'Colocar no Carrinho',
          icon: 'cart',
          handler: () => {
            item.noCarrinho = !item.noCarrinho
            this.itemService.editar(item)
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          handler: () => {
          }
        }
      ]
    })

    await actionSheet.present()
  }
}
