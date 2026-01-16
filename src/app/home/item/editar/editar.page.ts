import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonicModule,
  NavController,
  ToastController,
  IonInput
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Item } from '../item.model';
import { ItemService } from '../item.service';

@Component({
  selector: 'app-editar',
  templateUrl: './editar.page.html',
  styleUrls: ['./editar.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class EditarPage implements OnInit {

  public item!: Item;
  public itens: Item[] = [];

  public qtd!: number;
  public valor!: number;
  public descricao!: string;
  public categoria!: string;
  public noCarrinho!: boolean;

  @ViewChild('descrInput', { static: false })
  public descrInput!: IonInput;

  constructor(
    private itemService: ItemService,
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private toastCtrl: ToastController
  ) {}

  ngOnInit(): void {}

  ionViewDidEnter(): void {
    this.itens = this.itemService.getTodos();
    this.carregarItem();
    this.descrInput?.setFocus();
  }

  private carregarItem(): void {
    this.route.paramMap.subscribe(paramMap => {
      if (!paramMap.has('produtoId')) {
        this.navCtrl.navigateBack('/home');
        return;
      }

      const paramId = paramMap.get('produtoId')!;
      const itemEncontrado = this.itemService.getbyId(paramId);

      if (!itemEncontrado) {
        this.navCtrl.navigateBack('/home');
        return;
      }

      this.item = itemEncontrado;
      this.descricao = this.item.descricao;
      this.qtd = this.item.qtd;
      this.valor = this.item.valor;
      this.noCarrinho = this.item.noCarrinho;
      this.categoria = this.item.categoria;
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.salvar();
    }
  }

  selecionaCategoria(event: any): void {
    this.categoria = event.detail.value;
  }

  salvar(): void {
    if (!this.descricao || this.qtd <= 0) {
      this.showToast(
        'Pelo menos a descrição e a quantidade devem ser informadas!'
      );
      return;
    }

    const itemEditado = this.itens.find(el => el.id === this.item.id);

    if (!itemEditado) {
      this.showToast('Item não encontrado.');
      return;
    }

    itemEditado.descricao = this.primeiraMaiuscula(this.descricao);
    itemEditado.qtd = this.qtd;
    itemEditado.valor = this.valor ?? 0;
    itemEditado.noCarrinho = this.noCarrinho;
    itemEditado.categoria = this.categoria;

    this.itemService.salvarLista(this.itens);
    this.navCtrl.navigateBack('/home');
  }

  private primeiraMaiuscula(texto: string): string {
    const normalizado = texto.trim().toLowerCase();
    return normalizado.replace(/^\w/, c => c.toUpperCase());
  }

  private async showToast(msg: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      position: 'bottom',
      color: 'danger'
    });

    await toast.present();
  }
}
