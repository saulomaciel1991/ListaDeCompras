import { Component } from '@angular/core';
import { ItemService } from './home/item/item.service';
import { Item } from './home/item/item.model';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor( private itemService : ItemService) {}
  itens : Item[] = []

  retirarTodos(){
    this.itens = this.itemService.getTodos()
    this.itens.forEach( el =>{
      el.noCarrinho = false
    })

    this.itemService.salvarLista(this.itens)
    if(this.itens.length > 0){
      window.location.reload();
    }
  }
}
