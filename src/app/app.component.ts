import { Component } from '@angular/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Item } from './home/item/item.model';
import { ItemService } from './home/item/item.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private itemService: ItemService) {}
  itens: Item[] = [];

  retirarTodos() {
    this.itens = this.itemService.getTodos();
    this.itens.forEach((el) => {
      el.noCarrinho = false;
    });

    this.itemService.salvarLista(this.itens);
    if (this.itens.length > 0) {
      window.location.reload();
    }
  }

  fazerBackup = async () => {
    let dados = localStorage.getItem('itens');

    if (dados == null || dados == undefined) {
      return;
    } else {
      await Filesystem.writeFile({
        path: 'itens.json',
        data: dados,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
    }
  };

  log = async (dados: string) => {
    await Filesystem.writeFile({
      path: 'log.txt',
      data: dados,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  };

  restaurarBackup = async () => {
    const contents = await Filesystem.readFile({
      path: 'itens.json',
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    let itens = JSON.stringify(contents);
    let it = JSON.parse(itens);
    it = JSON.parse(it.data);
    localStorage.setItem('itens', JSON.stringify(it));
    this.log(itens)
    window.location.reload();
  };
}
