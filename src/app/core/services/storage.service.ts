import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Subject, Observable } from 'rxjs';

export const STORAGE_KEYS = {
  CATEGORIES: 'shopping_categories',
  PRODUCTS: 'shopping_products',
  LISTS: 'shopping_lists',
  LIST_ITEMS: 'shopping_list_items',
  USER_DEFAULTS: 'shopping_user_defaults',
};

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private _storage: Storage | null = null;
  private initPromise: Promise<Storage> | null = null;
  private _dataChanged$ = new Subject<string>();

  /**
   * Stream de eventos disparada quando qualquer chave do storage é alterada
   */
  readonly dataChanged$: Observable<string> = this._dataChanged$.asObservable();

  constructor(private storage: Storage) {}

  /**
   * Garante a inicialização única e thread-safe do driver de armazenamento
   */
  async init(): Promise<Storage> {
    if (this._storage) {
      return this._storage;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const store = await this.storage.create();
        this._storage = store;
        console.log('[StorageService] Ionic Storage inicializado com sucesso.');
        return store;
      } catch (error) {
        console.error('[StorageService] Erro ao inicializar Ionic Storage:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Recupera um item tipado pela chave
   */
  async get<T>(key: string): Promise<T | null> {
    const store = await this.init();
    const value = await store.get(key);
    return value !== undefined && value !== null ? (value as T) : null;
  }

  /**
   * Persiste qualquer objeto ou valor primitivo pela chave
   */
  async set(key: string, value: any): Promise<void> {
    const store = await this.init();
    await store.set(key, value);
    this._dataChanged$.next(key);
  }

  /**
   * Remove uma chave específica
   */
  async remove(key: string): Promise<void> {
    const store = await this.init();
    await store.remove(key);
    this._dataChanged$.next(key);
  }

  /**
   * Limpa todas as chaves
   */
  async clear(): Promise<void> {
    const store = await this.init();
    await store.clear();
    this._dataChanged$.next('*');
  }

  /**
   * Retorna a lista de todas as chaves armazenadas
   */
  async keys(): Promise<string[]> {
    const store = await this.init();
    return (await store.keys()) || [];
  }
}
