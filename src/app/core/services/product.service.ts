import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, STORAGE_KEYS } from './storage.service';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { ListItem } from '../models/list-item.model';
import { UserDefaults } from '../models/user-defaults.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(private storage: StorageService) {}

  /**
   * Retorna todos os produtos com nome da categoria
   */
  async getAll(): Promise<Product[]> {
    const [products, categories] = await Promise.all([
      this.getRawProducts(),
      (this.storage.get<Category[]>(STORAGE_KEYS.CATEGORIES)) || [],
    ]);

    const catMap = new Map<string, string>();
    (categories || []).forEach((c) => catMap.set(c.id, c.name));

    return products
      .map((p) => ({
        ...p,
        category_name: p.category_id ? catMap.get(p.category_id) || 'OUTROS' : undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Busca um produto por ID
   */
  async getById(id: string): Promise<Product | null> {
    const products = await this.getAll();
    return products.find((p) => p.id === id) || null;
  }

  /**
   * Busca produtos por termo no nome e opcionalmente por categoria
   */
  async search(term: string, categoryId?: string): Promise<Product[]> {
    const cleanTerm = term.trim().toLowerCase();
    const products = await this.getAll();

    return products
      .filter((p) => {
        const matchesTerm = p.name.toLowerCase().includes(cleanTerm);
        const matchesCategory = !categoryId || p.category_id === categoryId;
        return matchesTerm && matchesCategory;
      })
      .slice(0, 50);
  }

  /**
   * Cadastro rápido inline (Fast-Track) utilizado no modal de compras
   */
  async getOrCreateFastTrack(
    name: string,
    categoryId: string | null = null,
    defaults?: UserDefaults
  ): Promise<Product> {
    const cleanName = name.trim();
    const products = await this.getRawProducts();

    const existing = products.find(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    return this.create({
      name: cleanName,
      category_id: categoryId,
      unit_primary: defaults?.default_unit_primary || 'un',
      conversion_type: defaults?.default_conversion_type || 'MULTIPLY',
      conversion_factor: defaults?.default_conversion_factor || 1.0,
      unit_secondary: defaults?.default_unit_secondary || 'un',
    });
  }

  /**
   * Cria um novo produto no catálogo
   */
  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const products = await this.getRawProducts();
    const cleanName = product.name.trim();

    const newProduct: Product = {
      ...product,
      id: uuidv4(),
      name: cleanName,
      conversion_factor: product.conversion_factor > 0 ? product.conversion_factor : 1.0,
      created_at: new Date().toISOString(),
    };

    products.push(newProduct);
    await this.storage.set(STORAGE_KEYS.PRODUCTS, products);

    return newProduct;
  }

  /**
   * Atualiza dados de um produto existente
   */
  async update(product: Product): Promise<void> {
    const products = await this.getRawProducts();
    const index = products.findIndex((p) => p.id === product.id);

    if (index !== -1) {
      products[index] = {
        ...product,
        name: product.name.trim(),
        conversion_factor: product.conversion_factor > 0 ? product.conversion_factor : 1.0,
      };
      await this.storage.set(STORAGE_KEYS.PRODUCTS, products);
    }
  }

  /**
   * Checa se o produto pode ser excluído (se não está em uso em listas)
   */
  async canDelete(id: string): Promise<boolean> {
    const listItems = (await this.storage.get<ListItem[]>(STORAGE_KEYS.LIST_ITEMS)) || [];
    return !listItems.some((item) => item.product_id === id);
  }

  /**
   * Exclui um produto (com verificação de integridade referencial)
   */
  async delete(id: string): Promise<void> {
    const can = await this.canDelete(id);
    if (!can) {
      throw new Error(
        'Este produto não pode ser excluído pois já foi utilizado em listas de compras anteriores.'
      );
    }

    const products = await this.getRawProducts();
    const filtered = products.filter((p) => p.id !== id);
    await this.storage.set(STORAGE_KEYS.PRODUCTS, filtered);
  }

  private async getRawProducts(): Promise<Product[]> {
    return (await this.storage.get<Product[]>(STORAGE_KEYS.PRODUCTS)) || [];
  }
}
