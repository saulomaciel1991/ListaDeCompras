import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, STORAGE_KEYS } from './storage.service';
import { ListItem } from '../models/list-item.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { PricingEngineService } from './pricing-engine.service';
import { ListService } from './list.service';

@Injectable({
  providedIn: 'root',
})
export class ListItemService {
  private _itemsCache: ListItem[] | null = null;

  constructor(
    private storage: StorageService,
    private pricingEngine: PricingEngineService,
    private listService: ListService
  ) {}

  /**
   * Retorna os itens de uma lista específica, agrupados e enriquecidos com comparação de referência
   */
  async getByListId(listId: string): Promise<ListItem[]> {
    const [rawItems, products, categories] = await Promise.all([
      this.getRawItems(),
      (this.storage.get<Product[]>(STORAGE_KEYS.PRODUCTS)) || [],
      (this.storage.get<Category[]>(STORAGE_KEYS.CATEGORIES)) || [],
    ]);

    const productMap = new Map<string, Product>();
    (products || []).forEach((p) => productMap.set(p.id, p));

    const categoryMap = new Map<string, Category>();
    (categories || []).forEach((c) => categoryMap.set(c.id, c));

    const listItems = rawItems.filter((i) => i.list_id === listId);

    // Enriquecer com dados do produto e comparativo de preço da referência
    const enrichedItems: ListItem[] = [];
    for (const item of listItems) {
      const prod = productMap.get(item.product_id);
      const cat = prod?.category_id ? categoryMap.get(prod.category_id) : undefined;

      const refPrice = await this.listService.getHistoricalReferencePrice(
        item.product_id,
        item.brand
      );

      let priceStatus: ListItem['price_status'] = 'no_reference';
      let diffPercent: number | undefined;

      if (refPrice && item.price_per_secondary_unit > 0) {
        const comp = this.pricingEngine.comparePrices(
          item.price_per_secondary_unit,
          refPrice.price_per_secondary_unit
        );
        priceStatus = comp.status;
        diffPercent = comp.percentDifference;
      }

      enrichedItems.push({
        ...item,
        product_name: prod?.name || 'Produto Desconhecido',
        category_id: prod?.category_id,
        category_name: cat?.name || 'OUTROS',
        category_order_index: cat ? cat.order_index : 999,
        reference_price_per_secondary_unit: refPrice?.price_per_secondary_unit,
        reference_brand: refPrice?.brand,
        price_difference_percent: diffPercent,
        price_status: priceStatus,
      });
    }

    // Ordenação canônica: Corredor (order_index) ASC -> Categoria ASC -> Pendentes primeiro (is_checked ASC) -> Nome ASC -> Marca ASC
    return enrichedItems.sort((a, b) => {
      const orderA = a.category_order_index ?? 999;
      const orderB = b.category_order_index ?? 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      const catComp = (a.category_name || '').localeCompare(b.category_name || '');
      if (catComp !== 0) {
        return catComp;
      }

      if (a.is_checked !== b.is_checked) {
        return a.is_checked - b.is_checked;
      }

      const nameComp = (a.product_name || '').localeCompare(b.product_name || '');
      if (nameComp !== 0) {
        return nameComp;
      }

      return (a.brand || '').localeCompare(b.brand || '');
    });
  }

  /**
   * Adiciona um item a uma lista
   */
  async create(item: Omit<ListItem, 'id' | 'created_at'>): Promise<ListItem> {
    const rawItems = await this.getRawItems();

    const newItem: ListItem = {
      ...item,
      id: uuidv4(),
      brand: (item.brand || '').trim(),
      created_at: new Date().toISOString(),
    };

    rawItems.push(newItem);
    await this.storage.set(STORAGE_KEYS.LIST_ITEMS, rawItems);

    return newItem;
  }

  /**
   * Atualiza dados de um item
   */
  async update(item: ListItem): Promise<void> {
    const rawItems = await this.getRawItems();
    const index = rawItems.findIndex((i) => i.id === item.id);

    if (index !== -1) {
      rawItems[index] = {
        ...rawItems[index],
        brand: (item.brand || '').trim(),
        purchase_quantity: item.purchase_quantity,
        unit_primary: item.unit_primary,
        conversion_type: item.conversion_type,
        conversion_factor: item.conversion_factor,
        unit_secondary: item.unit_secondary,
        unit_price_primary: item.unit_price_primary,
        price_per_secondary_unit: item.price_per_secondary_unit,
        total_price: item.total_price,
        is_checked: item.is_checked,
      };
      await this.storage.set(STORAGE_KEYS.LIST_ITEMS, rawItems);
    }
  }

  /**
   * Alterna estado de comprado no carrinho de forma atômica e síncrona em memória
   */
  async toggleChecked(id: string, isChecked: boolean): Promise<void> {
    const rawItems = await this.getRawItems();
    const item = rawItems.find((i) => i.id === id);

    if (item) {
      item.is_checked = isChecked ? 1 : 0;
      await this.storage.set(STORAGE_KEYS.LIST_ITEMS, rawItems);
    }
  }

  /**
   * Exclui um item da lista
   */
  async delete(id: string): Promise<void> {
    const rawItems = await this.getRawItems();
    this._itemsCache = rawItems.filter((i) => i.id !== id);
    await this.storage.set(STORAGE_KEYS.LIST_ITEMS, this._itemsCache);
  }

  /**
   * Desmarca todos os itens do carrinho de uma lista
   */
  async clearCart(listId: string): Promise<void> {
    const rawItems = await this.getRawItems();
    for (const item of rawItems) {
      if (item.list_id === listId) {
        item.is_checked = 0;
      }
    }
    await this.storage.set(STORAGE_KEYS.LIST_ITEMS, rawItems);
  }

  /**
   * Retorna os totais computados de uma lista
   */
  async getListTotals(
    listId: string
  ): Promise<{ cart: number; pending: number; total: number }> {
    const rawItems = await this.getRawItems();
    const items = rawItems.filter((i) => i.list_id === listId);

    const totalCart = items
      .filter((i) => i.is_checked === 1)
      .reduce((sum, i) => sum + (i.total_price || 0), 0);
    const totalPending = items
      .filter((i) => i.is_checked === 0)
      .reduce((sum, i) => sum + (i.total_price || 0), 0);
    const total = items.reduce((sum, i) => sum + (i.total_price || 0), 0);

    return {
      cart: Math.round((totalCart + Number.EPSILON) * 100) / 100,
      pending: Math.round((totalPending + Number.EPSILON) * 100) / 100,
      total: Math.round((total + Number.EPSILON) * 100) / 100,
    };
  }

  private async getRawItems(): Promise<ListItem[]> {
    if (!this._itemsCache) {
      this._itemsCache = (await this.storage.get<ListItem[]>(STORAGE_KEYS.LIST_ITEMS)) || [];
    }
    return this._itemsCache;
  }

  /**
   * Invalida o cache local para forçar recarga fresca do storage quando necessário
   */
  invalidateCache(): void {
    this._itemsCache = null;
  }
}
