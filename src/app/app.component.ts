import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Item } from './home/item/item.model';
import { ItemService } from './home/item/item.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private itemService: ItemService, private http: HttpClient, private alertController: AlertController) {}
  itens: Item[] = [];

  retirarTodos() {
    this.itens = this.itemService.getTodos();
    this.itens.forEach((el : Item) => {
      el.noCarrinho = false;
    });

    this.itemService.salvarLista(this.itens);
    if (this.itens.length > 0) {
      window.location.reload();
    }
  }

  fazerBackup = async (fileNameUser?: string) => {
    let dados = localStorage.getItem('itens');

    if (dados == null || dados == undefined) {
      return;
    } else {
      // Nome do arquivo: usa o fornecido pelo usuário ou um nome padrão
      const fileName = fileNameUser ? fileNameUser : 'itens.json';

      await Filesystem.writeFile({
        path: fileName,
        data: dados,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      console.log('Backup criado com sucesso em ' + fileName);
    }
  };

  async solicitarNomeBackup() {
    const alert = await this.alertController.create({
      header: 'Nome do Backup',
      inputs: [
        {
          name: 'fileName',
          type: 'text',
          placeholder: 'Digite o nome do arquivo de backup'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Operação cancelada');
          }
        }, {
          text: 'Salvar',
          handler: (data) => {
            const fileName = data.fileName ? `${data.fileName}.json` : undefined;
            this.fazerBackupComNome(fileName);
          }
        }
      ]
    });

    await alert.present();
  }

  async fazerBackupComNome(fileName?: string) {
    try {
      await this.fazerBackup(fileName);
    } catch (error) {
      console.error('Erro ao fazer backup', error);
    }
  }

  log = async (dados: string) => {
    await Filesystem.writeFile({
      path: 'log.txt',
      data: dados,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  };

  restaurarBackup(event: any) {
    const file = event.target.files[0];
    if (!file) {
      console.error("Nenhum arquivo selecionado.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data != undefined && data != null) {
          localStorage.setItem('itens', JSON.stringify(data));
          window.location.reload();
        }
      } catch (error) {
        console.error("Erro ao ler o arquivo de backup: ", error);
      }
    };
    reader.readAsText(file);
  }
}
