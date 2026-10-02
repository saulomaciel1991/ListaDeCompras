import { Injectable } from '@angular/core';
import { StorageService, STORAGE_KEYS } from './storage.service';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { ListService } from './list.service';
import { ListItemService } from './list-item.service';
import { UserDefaultsService } from './user-defaults.service';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { ShoppingList } from '../models/list.model';
import { ListItem } from '../models/list-item.model';
import { UserDefaults } from '../models/user-defaults.model';

export interface FullBackupData {
  app: 'ListaDeCompras';
  version: 1;
  exported_at: string;
  categories: Category[];
  products: Product[];
  lists: ShoppingList[];
  list_items: ListItem[];
  user_defaults: UserDefaults;
}

export interface ImportResult {
  success: boolean;
  type: 'full_backup' | 'legacy_array';
  categoriesCount: number;
  productsCount: number;
  listsCount: number;
  itemsCount: number;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class JsonBackupService {
  constructor(
    private storage: StorageService,
    private categoryService: CategoryService,
    private productService: ProductService,
    private listService: ListService,
    private listItemService: ListItemService,
    private userDefaultsService: UserDefaultsService
  ) {}

  /**
   * Exporta um snapshot completo de todas as tabelas em formato JSON
   */
  async exportSnapshot(): Promise<string> {
    const [categories, products, lists, listItems, userDefaults] =
      await Promise.all([
        this.categoryService.getAll(),
        this.productService.getAll(),
        this.listService.getAll(),
        (this.storage.get<ListItem[]>(STORAGE_KEYS.LIST_ITEMS)) || [],
        this.userDefaultsService.get(),
      ]);

    const backupData: FullBackupData = {
      app: 'ListaDeCompras',
      version: 1,
      exported_at: new Date().toISOString(),
      categories,
      products,
      lists,
      list_items: listItems || [],
      user_defaults: userDefaults,
    };

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Importa dados de um arquivo JSON (aceita tanto backup completo quanto arquivos legados)
   */
  async importData(
    jsonString: string,
    customListName?: string
  ): Promise<ImportResult> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('O arquivo fornecido não é um JSON válido.');
    }

    // 1. Caso seja um array legado de itens: [{ descricao, valor, qtd, noCarrinho, categoria }]
    if (Array.isArray(parsed)) {
      return this.importLegacyArray(parsed, customListName);
    }

    // 2. Caso seja um backup completo estruturado
    if (parsed.app === 'ListaDeCompras' && parsed.version === 1) {
      return this.importFullBackup(parsed);
    }

    throw new Error('Formato de arquivo não reconhecido.');
  }

  /**
   * Importa um array de itens legados consolidando produtos e categorias
   */
  private async importLegacyArray(
    items: any[],
    listName?: string
  ): Promise<ImportResult> {
    const effectiveListName =
      listName || `Lista Importada (${new Date().toLocaleDateString('pt-BR')})`;
    const createdList = await this.listService.create(effectiveListName);

    const categoryMap = new Map<string, string>();
    const productMap = new Map<string, string>();

    let itemsCreated = 0;
    let productsCreated = 0;
    let categoriesCreated = 0;

    for (const item of items) {
      if (!item.descricao || item.descricao.trim() === '') {
        continue;
      }

      const catName = (item.categoria || 'OUTROS').trim().toUpperCase();
      const prodName = item.descricao.trim();

      // Categoria
      let categoryId = categoryMap.get(catName);
      if (!categoryId) {
        const cat = await this.categoryService.getOrCreate(catName);
        categoryId = cat.id;
        categoryMap.set(catName, categoryId);
        categoriesCreated++;
      }

      // Produto conceitual (sem marca no catálogo global)
      let productId = productMap.get(prodName.toLowerCase());
      if (!productId) {
        const prod = await this.productService.getOrCreateFastTrack(
          prodName,
          categoryId
        );
        productId = prod.id;
        productMap.set(prodName.toLowerCase(), productId);
        productsCreated++;
      }

      const quantity = item.qtd && item.qtd > 0 ? Number(item.qtd) : 1;
      const totalPrice = item.valor && item.valor > 0 ? Number(item.valor) : 0;
      const unitPrice =
        totalPrice > 0
          ? Math.round((totalPrice / quantity + Number.EPSILON) * 100) / 100
          : 0;

      // Item na lista de compras (onde a marca reside)
      await this.listItemService.create({
        list_id: createdList.id,
        product_id: productId,
        brand: '',
        purchase_quantity: quantity,
        unit_primary: 'un',
        conversion_type: 'MULTIPLY',
        conversion_factor: 1.0,
        unit_secondary: 'un',
        unit_price_primary: unitPrice,
        price_per_secondary_unit: unitPrice,
        total_price: totalPrice,
        is_checked: item.noCarrinho ? 1 : 0,
      });

      itemsCreated++;
    }

    return {
      success: true,
      type: 'legacy_array',
      categoriesCount: categoriesCreated,
      productsCount: productsCreated,
      listsCount: 1,
      itemsCount: itemsCreated,
      message: `Lista '${effectiveListName}' importada com sucesso com ${itemsCreated} itens.`,
    };
  }

  /**
   * Importa um backup completo mesclando de forma idempotente
   */
  private async importFullBackup(data: FullBackupData): Promise<ImportResult> {
    // Categorias
    if (data.categories && data.categories.length > 0) {
      const existing =
        (await this.storage.get<Category[]>(STORAGE_KEYS.CATEGORIES)) || [];
      const map = new Map(existing.map((c) => [c.id, c]));
      for (const cat of data.categories) {
        if (!map.has(cat.id)) {
          map.set(cat.id, cat);
        }
      }
      await this.storage.set(STORAGE_KEYS.CATEGORIES, Array.from(map.values()));
    }

    // Produtos globais
    if (data.products && data.products.length > 0) {
      const existing =
        (await this.storage.get<Product[]>(STORAGE_KEYS.PRODUCTS)) || [];
      const map = new Map(existing.map((p) => [p.id, p]));
      for (const prod of data.products) {
        if (!map.has(prod.id)) {
          map.set(prod.id, prod);
        }
      }
      await this.storage.set(STORAGE_KEYS.PRODUCTS, Array.from(map.values()));
    }

    // Listas
    if (data.lists && data.lists.length > 0) {
      const existing =
        (await this.storage.get<ShoppingList[]>(STORAGE_KEYS.LISTS)) || [];
      const map = new Map(existing.map((l) => [l.id, l]));
      for (const l of data.lists) {
        if (!map.has(l.id)) {
          map.set(l.id, l);
        }
      }
      await this.storage.set(STORAGE_KEYS.LISTS, Array.from(map.values()));
    }

    // Itens vinculados (com marca)
    if (data.list_items && data.list_items.length > 0) {
      const existing =
        (await this.storage.get<ListItem[]>(STORAGE_KEYS.LIST_ITEMS)) || [];
      const map = new Map(existing.map((i) => [i.id, i]));
      for (const item of data.list_items) {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      }
      await this.storage.set(STORAGE_KEYS.LIST_ITEMS, Array.from(map.values()));
    }

    // Preferências
    if (data.user_defaults) {
      await this.userDefaultsService.update(data.user_defaults);
    }

    return {
      success: true,
      type: 'full_backup',
      categoriesCount: data.categories?.length || 0,
      productsCount: data.products?.length || 0,
      listsCount: data.lists?.length || 0,
      itemsCount: data.list_items?.length || 0,
      message: 'Backup completo restaurado com sucesso!',
    };
  }
}
