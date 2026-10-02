import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, STORAGE_KEYS } from './storage.service';
import { ShoppingList } from '../models/list.model';
import { ListItem } from '../models/list-item.model';

export interface HistoricalPriceResult {
  price_per_secondary_unit: number;
  unit_price_primary: number;
  total_price: number;
  purchase_quantity: number;
  unit_primary: string;
  unit_secondary: string;
  brand: string;
}

@Injectable({
  providedIn: 'root',
})
export class ListService {
  constructor(private storage: StorageService) {}

  /**
   * Retorna todas as listas com totais computados
   */
  async getAll(): Promise<ShoppingList[]> {
    const [lists, items] = await Promise.all([
      this.getRawLists(),
      this.getRawItems(),
    ]);

    const itemsByList = new Map<string, ListItem[]>();
    for (const item of items) {
      const arr = itemsByList.get(item.list_id) || [];
      arr.push(item);
      itemsByList.set(item.list_id, arr);
    }

    return lists
      .map((l) => {
        const listItems = itemsByList.get(l.id) || [];
        const totalCart = listItems
          .filter((i) => i.is_checked === 1)
          .reduce((sum, i) => sum + (i.total_price || 0), 0);
        const totalPending = listItems
          .filter((i) => i.is_checked === 0)
          .reduce((sum, i) => sum + (i.total_price || 0), 0);
        const totalEstimated = listItems.reduce(
          (sum, i) => sum + (i.total_price || 0),
          0
        );

        return {
          ...l,
          items_count: listItems.length,
          total_cart: Math.round((totalCart + Number.EPSILON) * 100) / 100,
          total_pending: Math.round((totalPending + Number.EPSILON) * 100) / 100,
          total_estimated: Math.round((totalEstimated + Number.EPSILON) * 100) / 100,
        };
      })
      .sort((a, b) => {
        const aActive = a.status === 'active' ? 0 : 1;
        const bActive = b.status === 'active' ? 0 : 1;
        if (aActive !== bActive) {
          return aActive - bActive;
        }
        return b.created_at.localeCompare(a.created_at);
      });
  }

  /**
   * Busca uma lista por ID
   */
  async getById(id: string): Promise<ShoppingList | null> {
    const lists = await this.getAll();
    const list = lists.find((l) => l.id === id);

    if (list) {
      // Atualiza last_accessed_at silenciosamente
      const rawLists = await this.getRawLists();
      const idx = rawLists.findIndex((l) => l.id === id);
      if (idx !== -1) {
        rawLists[idx].last_accessed_at = new Date().toISOString();
        await this.storage.set(STORAGE_KEYS.LISTS, rawLists);
      }
      return list;
    }

    return null;
  }

  /**
   * Cria uma nova lista
   */
  async create(name: string): Promise<ShoppingList> {
    const rawLists = await this.getRawLists();
    const now = new Date().toISOString();

    const newList: ShoppingList = {
      id: uuidv4(),
      name: name.trim(),
      status: 'active',
      is_reference_price: 0,
      completed_at: null,
      last_accessed_at: now,
      created_at: now,
      items_count: 0,
      total_cart: 0,
      total_pending: 0,
      total_estimated: 0,
    };

    rawLists.push(newList);
    await this.storage.set(STORAGE_KEYS.LISTS, rawLists);

    return newList;
  }

  /**
   * Atualiza dados básicos de uma lista (ex: renomear ou arquivar)
   */
  async update(list: ShoppingList): Promise<void> {
    const rawLists = await this.getRawLists();
    const idx = rawLists.findIndex((l) => l.id === list.id);

    if (idx !== -1) {
      rawLists[idx] = {
        ...rawLists[idx],
        name: list.name.trim(),
        status: list.status,
        is_reference_price: list.is_reference_price,
      };
      await this.storage.set(STORAGE_KEYS.LISTS, rawLists);
    }
  }

  /**
   * Altera o nome de uma lista existente
   */
  async rename(id: string, newName: string): Promise<void> {
    const rawLists = await this.getRawLists();
    const idx = rawLists.findIndex((l) => l.id === id);

    if (idx !== -1) {
      rawLists[idx].name = newName.trim();
      await this.storage.set(STORAGE_KEYS.LISTS, rawLists);
    }
  }

  /**
   * Exclui uma lista e seus itens em cascata
   */
  async delete(id: string): Promise<void> {
    const [rawLists, rawItems] = await Promise.all([
      this.getRawLists(),
      this.getRawItems(),
    ]);

    const filteredLists = rawLists.filter((l) => l.id !== id);
    const filteredItems = rawItems.filter((i) => i.list_id !== id);

    await Promise.all([
      this.storage.set(STORAGE_KEYS.LISTS, filteredLists),
      this.storage.set(STORAGE_KEYS.LIST_ITEMS, filteredItems),
    ]);
  }

  /**
   * Duplica uma lista com todos os seus itens, desmarcando o carrinho
   */
  async duplicate(id: string, newName?: string): Promise<ShoppingList> {
    const original = await this.getById(id);
    if (!original) {
      throw new Error('Lista original não encontrada');
    }

    const createdList = await this.create(newName || `${original.name} (Cópia)`);
    const rawItems = await this.getRawItems();
    const itemsToCopy = rawItems.filter((i) => i.list_id === id);
    const now = new Date().toISOString();

    const copiedItems: ListItem[] = itemsToCopy.map((item) => ({
      ...item,
      id: uuidv4(),
      list_id: createdList.id,
      is_checked: 0,
      created_at: now,
    }));

    rawItems.push(...copiedItems);
    await this.storage.set(STORAGE_KEYS.LIST_ITEMS, rawItems);

    return createdList;
  }

  /**
   * Conclui a lista e promove-a automaticamente a lista de referência
   */
  async complete(id: string): Promise<void> {
    const rawLists = await this.getRawLists();
    const now = new Date().toISOString();

    for (const l of rawLists) {
      if (l.id === id) {
        l.status = 'completed';
        l.is_reference_price = 1;
        l.completed_at = now;
      } else {
        l.is_reference_price = 0;
      }
    }

    await this.storage.set(STORAGE_KEYS.LISTS, rawLists);
  }

  /**
   * Define manualmente uma lista como a referência de preços
   */
  async setAsReference(id: string): Promise<void> {
    const rawLists = await this.getRawLists();

    for (const l of rawLists) {
      l.is_reference_price = l.id === id ? 1 : 0;
    }

    await this.storage.set(STORAGE_KEYS.LISTS, rawLists);
  }

  /**
   * Consulta o histórico de preço da lista de referência para um produto e marca
   */
  async getHistoricalReferencePrice(
    productId: string,
    brand = ''
  ): Promise<HistoricalPriceResult | null> {
    const [rawLists, rawItems] = await Promise.all([
      this.getRawLists(),
      this.getRawItems(),
    ]);

    const refList = rawLists.find((l) => l.is_reference_price === 1);
    if (!refList) {
      return null;
    }

    const cleanBrand = brand.trim().toLowerCase();
    const matchingItems = rawItems
      .filter(
        (i) =>
          i.list_id === refList.id &&
          i.product_id === productId &&
          i.total_price > 0
      )
      .sort((a, b) => {
        const aBrandMatch = (a.brand || '').trim().toLowerCase() === cleanBrand ? 0 : 1;
        const bBrandMatch = (b.brand || '').trim().toLowerCase() === cleanBrand ? 0 : 1;
        if (aBrandMatch !== bBrandMatch) {
          return aBrandMatch - bBrandMatch;
        }
        return b.created_at.localeCompare(a.created_at);
      });

    if (matchingItems.length === 0) {
      return null;
    }

    const best = matchingItems[0];
    return {
      price_per_secondary_unit: best.price_per_secondary_unit,
      unit_price_primary: best.unit_price_primary,
      total_price: best.total_price,
      purchase_quantity: best.purchase_quantity,
      unit_primary: best.unit_primary,
      unit_secondary: best.unit_secondary,
      brand: best.brand || '',
    };
  }

  private async getRawLists(): Promise<ShoppingList[]> {
    return (await this.storage.get<ShoppingList[]>(STORAGE_KEYS.LISTS)) || [];
  }

  private async getRawItems(): Promise<ListItem[]> {
    return (await this.storage.get<ListItem[]>(STORAGE_KEYS.LIST_ITEMS)) || [];
  }
}
