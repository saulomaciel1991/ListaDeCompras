import { Component, OnInit, ViewChild } from '@angular/core';
import { Item } from '../item.model';
import * as uuid from 'uuid';
import { ItemService } from '../item.service';
import { NavController } from '@ionic/angular';

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
  @ViewChild('qtdInput') myInput!: any

  constructor(private itemService: ItemService, private navCrtl: NavController) { }

  ngOnInit() {
  }


  ionViewDidEnter() {
    this.itens = this.itemService.getTodos()
    this.myInput.setFocus();
  }

  onEnter(event: any) {
    if (event == 13) {
      this.salvar()
    }
  }

  salvar() {

    if (this.descricao != null && this.qtd > 0) {
      this.item = {
        id: uuid.v4(),
        descricao: this.primeiraMaiuscula(this.descricao),
        noCarrinho: false,
        qtd: this.qtd,
        valor: this.valor == null ? 0 : this.valor
      }

      this.itens.push(this.item)
      this.itemService.salvarLista(this.itens)
      this.navCrtl.navigateBack("/home")
    }
  }

  primeiraMaiuscula(texto: string) : string{
    texto = texto.toLowerCase()
    return texto.replace(/^\w/, (c) => c.toUpperCase());
  }
}
