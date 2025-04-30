import { Component } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { ItemService } from './home/item/item.service';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private itemService: ItemService
  ) {}

  // Remove todos os itens do carrinho
  retirarTodos() {
    // Obtém todos os itens
    const itens = this.itemService.getTodos();

    // Remove flag de carrinho de todos
    itens.forEach(item => {
      item.noCarrinho = false;
    });

    // Salva a lista atualizada
    this.itemService.salvarLista(itens);

    // Notifica o usuário
    this.mostrarToast('Todos os itens foram removidos do carrinho');
  }

  // Solicita o nome do arquivo para o backup
  async solicitarNomeBackup() {
    const alert = await this.alertController.create({
      header: 'Backup da Lista',
      message: 'Digite um nome para o arquivo de backup',
      inputs: [
        {
          name: 'fileName',
          type: 'text',
          placeholder: 'Nome do arquivo (opcional)',
          value: `lista_compras_${this.getDataFormatada()}.json`
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Salvar',
          handler: (data) => {
            const fileName = data.fileName || `lista_compras_${this.getDataFormatada()}.json`;
            // No navegador, vamos exportar diretamente
            if (Capacitor.getPlatform() === 'web') {
              this.exportarBackupParaSistema(fileName);
            } else {
              // Em dispositivos, primeiro salva internamente e pergunta se quer exportar
              this.fazerBackup(fileName).then(success => {
                if (success) {
                  this.confirmarExportacao(fileName);
                }
              });
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Cria nome de arquivo com data atual formatada
  private getDataFormatada(): string {
    const agora = new Date();
    return agora.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }

  // Faz o backup interno usando Capacitor Filesystem
  async fazerBackup(fileNameUser?: string): Promise<boolean> {
    let dados = localStorage.getItem('itens');

    if (!dados) {
      this.mostrarToast('Não há dados para fazer backup');
      return false;
    }

    try {
      const fileName = fileNameUser || `lista_compras_${this.getDataFormatada()}.json`;

      await Filesystem.writeFile({
        path: fileName,
        data: dados,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      this.mostrarToast(`Backup criado com sucesso: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      this.mostrarToast('Erro ao criar backup');
      return false;
    }
  }

  // Exporta o backup para um arquivo físico acessível ao usuário
  async exportarBackupParaSistema(fileNameUser?: string): Promise<boolean> {
    let dados = localStorage.getItem('itens');

    if (!dados) {
      this.mostrarToast('Não há dados para exportar');
      return false;
    }

    try {
      const fileName = fileNameUser || `lista_compras_${this.getDataFormatada()}.json`;

      // No navegador, cria um download de arquivo
      if (Capacitor.getPlatform() === 'web') {
        const blob = new Blob([dados], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;

        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.mostrarToast(`Backup exportado como ${fileName}`);
      } else {
        // Em dispositivos nativos, salva em Documents
        await Filesystem.writeFile({
          path: fileName,
          data: dados,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        const filePath = await this.getFilePath(Directory.Documents, fileName);
        this.mostrarToast(`Backup salvo em: ${fileName}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      this.mostrarToast('Erro ao exportar backup');
      return false;
    }
  }

  // Pergunta se quer exportar o backup para compartilhar
  async confirmarExportacao(fileName: string) {
    const alert = await this.alertController.create({
      header: 'Exportar Backup',
      message: 'Deseja exportar o backup para um arquivo que possa ser compartilhado?',
      buttons: [
        {
          text: 'Não',
          role: 'cancel'
        },
        {
          text: 'Sim',
          handler: () => {
            this.exportarBackupParaSistema(fileName);
          }
        }
      ]
    });

    await alert.present();
  }

  // Restaura o backup a partir de um arquivo selecionado
  async restaurarBackup(event: any) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      // Lê o arquivo usando a API File
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const conteudo = e.target.result;

          // Tenta parsear o JSON para verificar se é válido
          const dados = JSON.parse(conteudo);

          // Verifica se os dados têm a estrutura esperada
          if (!Array.isArray(dados)) {
            this.mostrarToast('Formato de arquivo inválido');
            return;
          }

          // Salva os dados no localStorage
          localStorage.setItem('itens', conteudo);

          // Confirma restauração
          this.mostrarToast('Backup restaurado com sucesso!');

          // Opcional: recarregar a página para refletir as mudanças
          window.location.reload();
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          this.mostrarToast('Erro ao processar o arquivo de backup');
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      this.mostrarToast('Erro ao ler arquivo de backup');
    }
  }

  // Método auxiliar para obter o caminho do arquivo
  private async getFilePath(directory: Directory, path: string): Promise<string> {
    try {
      const uriResult = await Filesystem.getUri({
        directory,
        path
      });
      return uriResult.uri;
    } catch (e) {
      console.error('Erro ao obter caminho do arquivo', e);
      return 'Caminho não disponível';
    }
  }

  // Método auxiliar para mostrar toast de notificação
  private async mostrarToast(mensagem: string) {
    const toast = await this.toastController.create({
      message: mensagem,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}
