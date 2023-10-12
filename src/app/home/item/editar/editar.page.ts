import { Component, OnInit, ViewChild } from '@angular/core';
import { Item } from '../item.model';
import * as uuid from 'uuid';
import { ItemService } from '../item.service';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-editar',
  templateUrl: './editar.page.html',
  styleUrls: ['./editar.page.scss'],
})
export class EditarPage implements OnInit {

  item!: Item
  itens!: Item[]
  qtd!: number
  valor!: number
  descricao!: string
  @ViewChild('qtdInput') myInput!: any

  constructor(private itemService: ItemService, private navCrtl: NavController, private route: ActivatedRoute) { }

  ngOnInit() {

  }

  carregando() {
    this.route.paramMap.subscribe(paramMap => {
      if (!paramMap.has('produtoId')) {
        this.navCrtl.navigateBack('/home/')
        return
      }
      let paramId: any = paramMap.get('produtoId')
      this.item = this.itemService.getbyId(paramId)
      this.descricao = this.item.descricao
      this.qtd = this.item.qtd
      this.valor = this.item.valor
    })
  }

  ionViewDidEnter() {
    this.itens = this.itemService.getTodos()
    this.myInput.setFocus();
    this.carregando()
  }

  onEnter(event: any) {
    if (event == 13) {
      this.salvar()
    }
  }

  salvar() {

    if (this.descricao != null && this.qtd > 0) {

      this.itens.find(el => {
        if (el.id == this.item.id) {
          el.descricao = this.primeiraMaiuscula(this.descricao)
          el.qtd = this.qtd
          el.valor = this.valor == null ? 0 : this.valor
        }
      })

      this.itemService.salvarLista(this.itens)
      this.navCrtl.navigateBack("/home")
    }
  }

  primeiraMaiuscula(texto: string): string {
    texto = texto.toLowerCase()
    return texto.replace(/^\w/, (c) => c.toUpperCase());
  }

}
