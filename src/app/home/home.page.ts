import { Component, OnInit } from '@angular/core';
import { ActionSheetController, AlertController } from '@ionic/angular';
import { Item } from './item/item.model';
import { ItemService } from './item/item.service';

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
    this.listar()
  }

  listar() {
    let value = localStorage.getItem('itens')
    if (value == null || value == undefined) {
      return
    } else {
      let lista: any[] = JSON.parse(value)
      this.itens = lista
    }
  }

  salvar(item: Item) {
    let value = localStorage.getItem('itens')

    if (value == null || value == undefined) {
      this.itens.push(item)
      localStorage.setItem('itens', JSON.stringify(this.itens))
    } else {
      let lista: any[] = JSON.parse(value)
      lista.push(item)
      localStorage.setItem('itens', JSON.stringify(lista))
    }

    this.listar()
  }

  getTotal(){
    let soma: number = 0

    this.itens.forEach( e =>{
      soma += (e.valor * e.qtd)
    })
    
    return this.formatter.format(soma)
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
            let pos = this.itens.length - 1
            if (pos == -1) {
              this.salvar({
                id: 1,
                qtd: parseInt(form.qtd),
                descricao: form.descricao,
                noCarrinho: false,
                valor: parseInt(form.valor)
              })
            } else {
              let id = this.itens[pos].id + 1
              this.salvar({
                id: id,
                qtd: parseInt(form.qtd),
                descricao: form.descricao,
                noCarrinho: false,
                valor: parseInt(form.valor)
              })
            }
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
            localStorage.setItem('itens', JSON.stringify(this.itens))
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

  ordenaPorDescricao() {
    this.itemService.orderByDescricao()
    this.listar()
  }

  ordenaPorQuantidade() {
    this.itemService.orderByQtd()
    this.listar()
  }

}
