import { Injectable } from '@angular/core';
import { Item } from './item.model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {

  constructor() { }

  editar(item: Item) {
    let value = localStorage.getItem('itens')

    if (value == null || value == undefined) {
      return
    } else {
      let lista: any[] = JSON.parse(value)
      lista.find(it => {
        if(it.id == item.id){
          it.descricao = item.descricao
          it.qtd = item.qtd
          it.noCarrinho = item.noCarrinho
        }
      })
      localStorage.setItem('itens', JSON.stringify(lista))
    }
  }
}
