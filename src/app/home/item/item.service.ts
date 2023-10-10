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
        if (it.id == item.id) {
          it.descricao = item.descricao
          it.qtd = item.qtd
          it.noCarrinho = item.noCarrinho
        }
      })
      localStorage.setItem('itens', JSON.stringify(lista))
    }
  }

  orderByDescricao() {
    let value = localStorage.getItem('itens')
    if (value == null || value == undefined) {
      return
    } else {
      let lista: any[] = JSON.parse(value)

      lista.sort((a, b) => {
        const nameA = a.descricao.toUpperCase(); // ignore upper and lowercase
        const nameB = b.descricao.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB || a.noCarrinho - b.noCarrinho) {
          return -1;
        }
        if (nameA > nameB || b.noCarrinho - a.noCarrinho) {
          return 1;
        }

        // names must be equal
        return 0;
      });

      localStorage.setItem('itens', JSON.stringify(lista))
    }
  }

  orderByQtd() {
    let value = localStorage.getItem('itens')
    if (value == null || value == undefined) {
      return
    } else {
      let lista: any[] = JSON.parse(value)
      lista.sort((a, b) => a.noCarrinho - b.noCarrinho || a.qtd - b.qtd);
      localStorage.setItem('itens', JSON.stringify(lista))
    }
  }
}
