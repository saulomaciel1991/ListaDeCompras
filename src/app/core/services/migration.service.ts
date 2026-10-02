import { Injectable } from '@angular/core';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { ListService } from './list.service';
import { ListItemService } from './list-item.service';

const MIGRATION_FLAG_KEY = 'legacy_migrated_v1';
const LEGACY_STORAGE_KEY = 'itens';

interface LegacyItem {
  id?: string;
  qtd?: number;
  valor?: number;
  descricao?: string;
  noCarrinho?: boolean;
  categoria?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MigrationService {
  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
    private listService: ListService,
    private listItemService: ListItemService
  ) {}

  /**
   * Executa a migração automática do localStorage antigo para o SQLite relacional
   */
  async checkAndMigrate(): Promise<boolean> {
    const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
    if (isMigrated) {
      return false;
    }

    const rawData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!rawData) {
      // Nenhum dado legado para migrar
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return false;
    }

    try {
      const items: LegacyItem[] = JSON.parse(rawData);
      if (!Array.isArray(items) || items.length === 0) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return false;
      }

      console.log(`[MigrationService] Iniciando migração de ${items.length} itens do legado...`);

      // 1. Cria a lista inicial ativa que receberá os itens
      const migrationList = await this.listService.create('Lista Migrada');
      // Promove a lista inicial a lista de referência
      await this.listService.setAsReference(migrationList.id);

      // Cache em memória para evitar buscas repetidas
      const categoryMap = new Map<string, string>(); // nome -> id
      const productMap = new Map<string, string>();  // nome -> id

      for (const item of items) {
        if (!item.descricao || item.descricao.trim() === '') {
          continue;
        }

        const categoryName = (item.categoria || 'OUTROS').trim().toUpperCase();
        const productName = item.descricao.trim();

        // 2. Mapeia ou cria categoria
        let categoryId = categoryMap.get(categoryName);
        if (!categoryId) {
          const category = await this.categoryService.getOrCreate(categoryName);
          categoryId = category.id;
          categoryMap.set(categoryName, categoryId);
        }

        // 3. Mapeia ou cria produto no catálogo geral
        let productId = productMap.get(productName.toLowerCase());
        if (!productId) {
          const product = await this.productService.getOrCreateFastTrack(
            productName,
            categoryId
          );
          productId = product.id;
          productMap.set(productName.toLowerCase(), productId);
        }

        // 4. Cria o item na lista de compras
        const quantity = item.qtd && item.qtd > 0 ? Number(item.qtd) : 1;
        const totalPrice = item.valor && item.valor > 0 ? Number(item.valor) : 0;
        const unitPrice = totalPrice > 0 ? Math.round((totalPrice / quantity + Number.EPSILON) * 100) / 100 : 0;

        await this.listItemService.create({
          list_id: migrationList.id,
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
      }

      // 5. Marca flag de migração concluída
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      console.log('[MigrationService] Migração concluída com sucesso!');
      return true;
    } catch (error) {
      console.error('[MigrationService] Erro ao migrar dados legados:', error);
      return false;
    }
  }
}
