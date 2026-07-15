import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Item } from './item.model';

@Injectable({
  providedIn: 'root',
})
export class ItemService {
  dataChanged = new Subject<void>();

  constructor() {}

  get ordenarAutomaticamente(): boolean {
    return localStorage.getItem('ordenarAutomaticamente') === 'true';
  }

  set ordenarAutomaticamente(value: boolean) {
    localStorage.setItem('ordenarAutomaticamente', value.toString());
  }

  editar(item: Item) {
    const value = localStorage.getItem('itens');

    if (value == null || value == undefined) {
      return;
    } else {
      const lista: any[] = JSON.parse(value);
      lista.find((it) => {
        if (it.id == item.id) {
          it.descricao = item.descricao;
          it.qtd = item.qtd;
          it.noCarrinho = item.noCarrinho;
        }
      });
      this.salvarLista(lista);
    }
  }

  salvarLista(itens: Item[], ignorarOrdenacaoAuto = false): void {
    const itensNoCarrinho: Item[] = [];
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

    if (this.ordenarAutomaticamente && !ignorarOrdenacaoAuto) {
      itens.sort((a, b) => a.descricao < b.descricao ? -1 : (a.descricao > b.descricao ? 1 : 0));
      itensNoCarrinho.sort((a, b) => a.descricao < b.descricao ? -1 : (a.descricao > b.descricao ? 1 : 0));
    }

    itensNoCarrinho.forEach((el) => {
      itens.push(el);
    });

    localStorage.setItem('itens', JSON.stringify(itens));
    this.dataChanged.next();
  }

  orderByDescricao() {
    const value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      const lista: any[] = JSON.parse(value);
      lista.sort((a, b) => {
        let ret = 0;

        if (a.descricao < b.descricao) {
          ret = -1;
        }
        return ret;
      });
      this.salvarLista(lista, true);
    }
  }

  orderByNoCarrinho() {
    const value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      const lista: any[] = JSON.parse(value);
      lista.sort((a, b) => {
        let ret = 0;

        if (a.noCarrinho < b.noCarrinho) {
          ret = 1;
        }
        return ret;
      });
      this.salvarLista(lista, true);
    }
  }

  orderByQtd() {
    const value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      const lista: any[] = JSON.parse(value);
      lista.sort((a, b) => a.noCarrinho - b.noCarrinho || a.qtd - b.qtd);
      this.salvarLista(lista, true);
    }
  }

  orderByCategoria(){
    const value = localStorage.getItem('itens');
    if (value == null || value == undefined) {
      return;
    } else {
      const lista: any[] = JSON.parse(value);
      lista.sort((a, b) => {
        let ret = 0;

        if (a.categoria < b.categoria) {
          ret = -1;
        }
        return ret;
      });
      this.salvarLista(lista, true);
    }
  }

  getTodos(): Item[] {
    const value = localStorage.getItem('itens');

    if (value == null || value == undefined) {
      return [];
    } else {
      const lista: any[] = JSON.parse(value);
      return lista;
    }
  }

  getbyId(id: string): Item {
    const value: any = localStorage.getItem('itens');

    const lista: any[] = JSON.parse(value);
    const item: Item = lista.find((e) => {
      return e.id == id;
    });

    return item;
  }
}
