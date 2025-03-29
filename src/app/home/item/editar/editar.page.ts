import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { Item } from '../item.model';
import { ItemService } from '../item.service';

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
  categoria!: string
  noCarrinho!: boolean

  @ViewChild('descrInput') myInput!: any

  constructor(
    private itemService: ItemService,
    private navCrtl: NavController,
    private route: ActivatedRoute,
    private toastCrtl : ToastController
    ) { }

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
      this.noCarrinho = this.item.noCarrinho
      this.categoria = this.item.categoria
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

  selecionaCategoria(event: any) {
    const categoriaSelecionada = event.detail.value;
    this.categoria = categoriaSelecionada;
  }

  salvar() {

    if (this.descricao != null && this.qtd > 0) {

      this.itens.find(el => {
        if (el.id == this.item.id) {
          el.descricao = this.primeiraMaiuscula(this.descricao)
          el.qtd = this.qtd
          el.valor = this.valor == null ? 0 : this.valor
          el.noCarrinho = this.noCarrinho
          el.categoria = this.categoria
        }
      })

      this.itemService.salvarLista(this.itens)
      this.navCrtl.navigateBack("/home")
    } else{
      this.showToast("Pelo menos a descrição e quantidade deveriam ser informadas!")
    }
  }

  primeiraMaiuscula(texto: string): string {
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
