import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonicModule,
  ToastController,
} from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  cloudUploadOutline,
  cloudDownloadOutline,
  documentTextOutline,
  saveOutline,
  checkmarkCircleOutline,
  logoGoogle,
  informationCircleOutline,
} from 'ionicons/icons';
import { UserDefaultsService } from '../../core/services/user-defaults.service';
import { JsonBackupService } from '../../core/services/json-backup.service';
import { UserDefaults } from '../../core/models/user-defaults.model';
import { ConversionType } from '../../core/models/product.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class SettingsPage implements OnInit {
  defaults: UserDefaults = {
    id: 1,
    default_unit_primary: 'un',
    default_conversion_type: 'MULTIPLY',
    default_conversion_factor: 1.0,
    default_unit_secondary: 'un',
    default_quantity: 1.0,
    auto_focus_field: 'price',
    default_view_mode: 'basic',
  };

  isSaving = false;

  constructor(
    private userDefaultsService: UserDefaultsService,
    private jsonBackupService: JsonBackupService,
    private alertController: AlertController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    addIcons({
      settingsOutline,
      cloudUploadOutline,
      cloudDownloadOutline,
      documentTextOutline,
      saveOutline,
      checkmarkCircleOutline,
      logoGoogle,
      informationCircleOutline,
    });
  }

  async ngOnInit() {
    this.carregarPreferencias();
  }

  async carregarPreferencias() {
    try {
      this.defaults = await this.userDefaultsService.get();
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
    }
  }

  async salvarPreferencias() {
    this.isSaving = true;
    this.cdr.detectChanges();
    try {
      await this.userDefaultsService.update(this.defaults);
      this.mostrarToast('Preferências salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
      this.mostrarToast('Erro ao salvar preferências.');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async exportarBackupJson() {
    try {
      const jsonContent = await this.jsonBackupService.exportSnapshot();
      const fileName = `lista_compras_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Capacitor.getPlatform() === 'web') {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.mostrarToast(`Backup exportado: ${fileName}`);
      } else {
        await Filesystem.writeFile({
          path: fileName,
          data: jsonContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        this.mostrarToast(`Backup salvo na pasta Documentos: ${fileName}`);
      }
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      this.mostrarToast('Erro ao exportar backup.');
    }
  }

  async importarArquivo(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.ngZone.run(async () => {
          try {
            const content = e.target.result;
            const result = await this.jsonBackupService.importData(content);
            this.mostrarToast(result.message);
            event.target.value = '';
            this.cdr.detectChanges();
          } catch (err: any) {
            console.error('Erro ao importar:', err);
            this.mostrarToast(err?.message || 'Erro ao importar arquivo.');
            event.target.value = '';
            this.cdr.detectChanges();
          }
        });
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      this.mostrarToast('Erro ao ler arquivo selecionado.');
      event.target.value = '';
    }
  }

  private async mostrarToast(mensagem: string) {
    const toast = await this.toastController.create({
      message: mensagem,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }
}
