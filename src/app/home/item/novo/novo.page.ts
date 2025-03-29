import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import * as uuid from 'uuid';
import { Item } from '../item.model';
import { ItemService } from '../item.service';

@Component({
  selector: 'app-novo',
  templateUrl: './novo.page.html',
  styleUrls: ['./novo.page.scss'],
})
export class NovoPage implements OnInit {
  item!: Item
  itens!: Item[]
  qtd!: number
  valor!: number
  descricao!: string
  categoria!: string
  noCarrinho!: boolean
  @ViewChild('qtdInput') myInput!: any
  @ViewChild('descInput') descInput!: any

  constructor(private itemService: ItemService, private navCrtl: NavController, private toastCrtl : ToastController) { }

  ngOnInit() {
  }


  ionViewDidEnter() {
    this.itens = this.itemService.getTodos()
    this.descInput.setFocus();
    this.noCarrinho = false
  }

  onEnter(event: any) {
    if (event == 13) {
      this.salvar()
    }
  }

  selecionaCategoria(event: any) {
    const categoriaSelecionada = event.detail.value;
    this.categoria = categoriaSelecionada;
  }

  salvar() {

    if (this.descricao != null && this.qtd > 0) {
      this.item = {
        id: uuid.v4(),
        descricao: this.primeiraMaiuscula(this.descricao),
        noCarrinho: this.noCarrinho == undefined ? false : this.noCarrinho,
        categoria: this.categoria,
        qtd: this.qtd,
        valor: this.valor == null ? 0 : this.valor
      }
      this.itens.push(this.item)
      this.itemService.salvarLista(this.itens)
      this.navCrtl.navigateBack("/home")
    }else{
      this.showToast("Pelo menos a descrição e quantidade deveriam ser informadas!")
    }
  }

  primeiraMaiuscula(texto: string) : string{
    texto = texto.toLowerCase()
    return texto.replace(/^\w/, (c) => c.toUpperCase());
  }

  async showToast(msg: string) {
    const toast = await this.toastCrtl.create({
      message: msg,
      duration: 2500,
      position: 'bottom',
      color:'danger'
    })

    await toast.present();
  }
}
