import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  cubeOutline,
  pricetagOutline,
  settingsOutline,
} from 'ionicons/icons';
import { StorageService } from './core/services/storage.service';
import { MigrationService } from './core/services/migration.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class AppComponent implements OnInit {
  constructor(
    private storageService: StorageService,
    private migrationService: MigrationService
  ) {
    addIcons({
      cartOutline,
      cubeOutline,
      pricetagOutline,
      settingsOutline,
    });
  }

  async ngOnInit() {
    try {
      await this.storageService.init();
      await this.migrationService.checkAndMigrate();
    } catch (err) {
      console.warn('[AppComponent] Inicialização do storage ou migração:', err);
    }
  }
}
