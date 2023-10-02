import { Component, OnInit } from '@angular/core';
import { ActionSheetController, AlertController } from '@ionic/angular';
import { Item } from './item/item.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  itens: Item[] = []
  constructor(private alertCrtl: AlertController, private actionSheetCrtl: ActionSheetController) { }

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

  async adicionarItem() {
    const alert = await this.alertCrtl.create({
      header: 'Novo Item',
      inputs: [
        {
          name: 'qtd',
          type: 'number',
          placeholder: 'Informe a quantidade',
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
                qtd: form.qtd,
                descricao: form.descricao,
                noCarrinho: false
              })
            } else {
              let id = this.itens[pos].id + 1
              this.salvar({
                id: id,
                qtd: form.qtd,
                descricao: form.descricao,
                noCarrinho: false
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
      inputs: [
        {
          name: 'qtd',
          type: 'number',
          placeholder: 'Informe a quantidade',
          value: item.qtd,
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
            this.itens.find(it => {
              if (it.id == item.id) {
                it.descricao = form.descricao
                it.qtd = form.qtd
                it.noCarrinho = false
              }
              return
            })
            localStorage.setItem('itens', JSON.stringify(this.itens))
          },
        },
      ],
    });

    alert.present();
  }

  async abrirOpcoes(item: Item) {
    const actionSheet = await this.actionSheetCrtl.create({
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
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          handler: () => {
            console.log("Chamou a funcao cancelar")
          }
        }
      ]
    })

    await actionSheet.present()
  }

}
