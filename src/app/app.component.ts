import { Component } from '@angular/core';
import { App } from '@capacitor/app';
import { AlertController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CapacitorShareTarget } from '@capgo/capacitor-share-target';
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
  ) {
    if (Capacitor.getPlatform() !== 'web') {
      this.initShareTarget();
    }
  }

  async initShareTarget() {
    // Listener para o Share Target (quando usuário seleciona "Compartilhar")
    CapacitorShareTarget.addListener('shareReceived', async (event) => {
      if (event.files && event.files.length > 0) {
        try {
          const result = await Filesystem.readFile({ 
            path: event.files[0].uri,
            encoding: Encoding.UTF8
          });
          this.processarConteudoBackup(result.data);
        } catch (error) {
          console.error('Erro ao ler ou processar arquivo compartilhado:', error);
          this.mostrarToast('Erro ao processar o arquivo recebido via compartilhamento.');
        }
      }
    });

    // Listener para Intents do tipo VIEW (quando usuário seleciona "Abrir com")
    App.addListener('appUrlOpen', async (event) => {
      if (event.url) {
        try {
          const result = await Filesystem.readFile({ 
            path: event.url,
            encoding: Encoding.UTF8
          });
          this.processarConteudoBackup(result.data);
        } catch (error) {
          console.error('Erro ao ler ou processar arquivo aberto:', error);
          this.mostrarToast('Erro ao abrir o arquivo. Pode ser que o aplicativo não tenha permissão de leitura.');
        }
      }
    });
  }

  async processarConteudoBackup(dados: any) {
    if (typeof dados !== 'string') {
      const alert = await this.alertController.create({
        header: 'Debug Tipo de Dado',
        message: `O dado não é string. Tipo: ${typeof dados}. Valor: ${JSON.stringify(dados).substring(0, 100)}`,
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    try {
      const parsedData = JSON.parse(dados);

      if (!Array.isArray(parsedData)) {
        this.mostrarToast('O arquivo não parece ser um backup válido.');
        return;
      }

      // Pergunta antes de sobrescrever
      const alert = await this.alertController.create({
        header: 'Importar Backup',
        message: 'Atenção: A lista atual será substituída pelo conteúdo do backup selecionado. Deseja continuar?',
        buttons: [
          {
            text: 'Não',
            role: 'cancel'
          },
          {
            text: 'Sim',
            handler: () => {
              localStorage.setItem('itens', dados);
              this.mostrarToast('Lista atualizada com sucesso!');
              window.location.reload();
            }
          }
        ]
      });

      await alert.present();

    } catch (error: any) {
      console.error('Erro de JSON parse:', error);
      const strPreview = dados ? String(dados).substring(0, 200) : 'vazio';
      const alert = await this.alertController.create({
        header: 'Debug de Erro JSON',
        message: `Erro: ${error?.message}\n\nConteúdo lido (início):\n${strPreview}`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  get ordenarAutomaticamente(): boolean {
    return this.itemService.ordenarAutomaticamente;
  }

  toggleOrdenar(event: any) {
    this.itemService.ordenarAutomaticamente = event.detail.checked;
    if (this.itemService.ordenarAutomaticamente) {
      this.itemService.orderByDescricao();
    }
  }

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

  // Apaga todos os itens da lista completamente
  async limparLista() {
    const alert = await this.alertController.create({
      header: 'Limpar Lista',
      message: 'Tem certeza que deseja apagar todos os itens da sua lista? Esta ação não pode ser desfeita.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sim, Apagar',
          handler: () => {
            // Salva uma lista vazia
            this.itemService.salvarLista([]);
            this.mostrarToast('Lista apagada com sucesso');
          }
        }
      ]
    });

    await alert.present();
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
            // No navegador, faz o download do arquivo
            if (Capacitor.getPlatform() === 'web') {
              this.exportarBackupParaSistema(fileName);
            } else {
              // Em dispositivos móveis, apenas salva no diretório Documents
              this.fazerBackup(fileName);
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

      const result = await Filesystem.writeFile({
        path: fileName,
        data: dados,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      this.mostrarToast(`Backup criado com sucesso: ${fileName}`);

      // Pergunta se o usuário deseja compartilhar o arquivo
      const alert = await this.alertController.create({
        header: 'Compartilhar',
        message: 'Deseja compartilhar o arquivo de backup gerado?',
        buttons: [
          {
            text: 'Não',
            role: 'cancel'
          },
          {
            text: 'Sim',
            handler: async () => {
              try {
                await Share.share({
                  title: 'Backup Lista de Compras',
                  text: 'Aqui está o backup da minha lista de compras.',
                  url: result.uri,
                  dialogTitle: 'Compartilhar com'
                });
              } catch (e) {
                console.error('Erro ao compartilhar:', e);
              }
            }
          }
        ]
      });

      await alert.present();

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
