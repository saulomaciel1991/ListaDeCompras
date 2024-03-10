import { Injectable } from '@angular/core';
import { Item } from './item.model';

@Injectable({
  providedIn: 'root',
})
export class ItemService {
  constructor() {}

  editar(item: Item) {
    let value = localStorage.getItem('itens');

    if (value == null || value == undefined) {
      return;
    } else {
      let lista: any[] = JSON.parse(value);
      lista.find((it) => {
        if (it.id == item.id) {
          it.descricao = item.descricao;
          it.qtd = item.qtd;
          it.noCarrinho = item.noCarrinho;
        }
      });
      localStorage.setItem('itens', JSON.stringify(lista));
    }
  }

  salvarLista(itens: Item[]): void {
    itens.forEach( el =>{
      el.descricao = el.descricao.toUpperCase()
    })
    localStorage.setItem('itens', JSON.stringify(itens));
  }

  orderByDescricao() {
    let value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      let lista: any[] = JSON.parse(value);

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
      this.salvarLista(lista);
    }
  }

  orderByQtd() {
    let value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      let lista: any[] = JSON.parse(value);
      lista.sort((a, b) => a.noCarrinho - b.noCarrinho || a.qtd - b.qtd);
      this.salvarLista(lista);
    }
  }

  getTodos(): Item[] {
    let value = localStorage.getItem('itens');

    if (value == null || value == undefined) {
      return [];
    } else {
      let lista: any[] = JSON.parse(value);
      return lista;
    }
  }

  getbyId(id: string): Item {
    let value: any = localStorage.getItem('itens');

    let lista: any[] = JSON.parse(value);
    let item: Item = lista.find((e) => {
      return e.id == id;
    });

    return item;
  }
}
