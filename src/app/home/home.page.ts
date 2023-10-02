import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Item } from './item/item.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  itens: Item[] = []
  constructor(private alertController: AlertController) { }

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
    const alert = await this.alertController.create({
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
                descricao: form.descricao
              })
            }else{
              let id = this.itens[pos].id + 1
              this.salvar({
                id: id,
                qtd: form.qtd,
                descricao: form.descricao
              })
            }
          },
        },
      ],
    });

    alert.present();
  }

  excluir() {

  }

}
