export type ListStatus = 'active' | 'completed' | 'archived';

export interface ShoppingList {
  id: string;
  name: string;
  status: ListStatus;
  is_reference_price: number;            // 0 ou 1
  completed_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  // Métricas agregadas computadas para visualização
  total_cart?: number;
  total_pending?: number;
  total_estimated?: number;
  items_count?: number;
}
