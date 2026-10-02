import { Injectable } from '@angular/core';
import { StorageService, STORAGE_KEYS } from './storage.service';
import { UserDefaults } from '../models/user-defaults.model';

const DEFAULT_SETTINGS: UserDefaults = {
  id: 1,
  default_unit_primary: 'un',
  default_conversion_type: 'MULTIPLY',
  default_conversion_factor: 1.0,
  default_unit_secondary: 'un',
  default_quantity: 1.0,
  auto_focus_field: 'price',
  default_view_mode: 'basic',
};

@Injectable({
  providedIn: 'root',
})
export class UserDefaultsService {
  constructor(private storage: StorageService) {}

  /**
   * Retorna as preferências padrão do usuário
   */
  async get(): Promise<UserDefaults> {
    const saved = await this.storage.get<UserDefaults>(STORAGE_KEYS.USER_DEFAULTS);
    if (saved) {
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
      };
    }

    // Inicialização idempotente
    await this.storage.set(STORAGE_KEYS.USER_DEFAULTS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Atualiza as preferências do usuário
   */
  async update(defaults: Partial<UserDefaults>): Promise<void> {
    const current = await this.get();
    const updated: UserDefaults = {
      ...current,
      ...defaults,
    };

    await this.storage.set(STORAGE_KEYS.USER_DEFAULTS, updated);
  }
}
