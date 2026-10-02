import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, STORAGE_KEYS } from './storage.service';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private storage: StorageService) {}

  /**
   * Retorna todas as categorias ordenadas por order_index e depois por nome
   */
  async getAll(): Promise<Category[]> {
    const categories = (await this.storage.get<Category[]>(STORAGE_KEYS.CATEGORIES)) || [];
    return categories.sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Busca uma categoria por ID
   */
  async getById(id: string): Promise<Category | null> {
    const categories = await this.getAll();
    return categories.find((c) => c.id === id) || null;
  }

  /**
   * Busca ou cria uma categoria pelo nome (case-insensitive)
   */
  async getOrCreate(name: string): Promise<Category> {
    const trimmed = name.trim().toUpperCase();
    const categories = await this.getAll();
    const existing = categories.find((c) => c.name.toUpperCase() === trimmed);

    if (existing) {
      return existing;
    }

    return this.create(trimmed);
  }

  /**
   * Cria uma nova categoria com order_index no final da lista
   */
  async create(name: string): Promise<Category> {
    const trimmed = name.trim().toUpperCase();
    const categories = await this.getAll();

    const maxOrder = categories.reduce((max, c) => Math.max(max, c.order_index), -1);
    const newCategory: Category = {
      id: uuidv4(),
      name: trimmed,
      order_index: maxOrder + 1,
    };

    categories.push(newCategory);
    await this.storage.set(STORAGE_KEYS.CATEGORIES, categories);

    return newCategory;
  }

  /**
   * Atualiza o nome de uma categoria
   */
  async update(category: Category): Promise<void> {
    const categories = await this.getAll();
    const index = categories.findIndex((c) => c.id === category.id);
    if (index !== -1) {
      categories[index] = {
        ...categories[index],
        name: category.name.trim().toUpperCase(),
        order_index: category.order_index,
      };
      await this.storage.set(STORAGE_KEYS.CATEGORIES, categories);
    }
  }

  /**
   * Atualiza a ordem de exibição das categorias em lote (ex: via ion-reorder-group)
   */
  async updateOrder(categories: Category[]): Promise<void> {
    const updated = categories.map((cat, index) => ({
      ...cat,
      order_index: index,
    }));
    await this.storage.set(STORAGE_KEYS.CATEGORIES, updated);
  }

  /**
   * Exclui uma categoria
   */
  async delete(id: string): Promise<void> {
    const categories = await this.getAll();
    const filtered = categories.filter((c) => c.id !== id);
    await this.storage.set(STORAGE_KEYS.CATEGORIES, filtered);
  }
}
