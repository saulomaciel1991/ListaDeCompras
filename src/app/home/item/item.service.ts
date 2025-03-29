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

    this.orderByDescricao()
  }

  salvarLista(itens: Item[]): void {
    let itensNoCarrinho: Item[] = [];
    itens.forEach((el) => {
      el.descricao = el.descricao.toUpperCase();
      if (el.noCarrinho === true) {
        itensNoCarrinho.push(el);
      }
      if (el.categoria === undefined || el.categoria === null || el.categoria === ''){
        el.categoria = 'OUTROS'
      }
      el.categoria = el.categoria.toUpperCase()
    });

    itens = itens.filter((el) => {
      return el.noCarrinho === false;
    });

    itensNoCarrinho.forEach((el) => {
      itens.push(el);
    });

    localStorage.setItem('itens', JSON.stringify(itens));
  }

  orderByDescricao() {
    let value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      let lista: any[] = JSON.parse(value);
      lista.sort((a, b) => {
        let ret = 0;

        if (a.descricao < b.descricao) {
          ret = -1;
        }
        return ret;
      });
      this.salvarLista(lista);
    }
  }

  orderByNoCarrinho() {
    let value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      let lista: any[] = JSON.parse(value);
      lista.sort((a, b) => {
        let ret = 0;

        if (a.noCarrinho < b.noCarrinho) {
          ret = 1;
        }
        return ret;
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

  orderByCategoria(){
    let value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      let lista: any[] = JSON.parse(value);
      lista.sort((a, b) => {
        let ret = 0;

        if (a.categoria < b.categoria) {
          ret = -1;
        }
        return ret;
      });
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
