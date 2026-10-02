import { ConversionType } from './product.model';

export interface ListItem {
  id: string;
  list_id: string;
  product_id: string;
  brand: string;                         // Marca (ex: 'Parmalat', 'Nestlé')
  purchase_quantity: number;             // Quantidade na unidade primária (ex: 2 caixas)
  unit_primary: string;                  // Snapshot da unidade primária
  conversion_type: ConversionType;       // 'MULTIPLY' ou 'DIVIDE'
  conversion_factor: number;             // Fator > 0
  unit_secondary: string;                // Snapshot da unidade secundária
  unit_price_primary: number;            // Preço unitário primário (2 decimais)
  price_per_secondary_unit: number;      // Preço unitário secundário (até 4 decimais)
  total_price: number;                   // Preço total pago pelo lote (soberano, 2 decimais)
  is_checked: number;                    // 0 = pendente, 1 = no carrinho
  created_at: string;

  // Campos auxiliares obtidos por joins
  product_name?: string;
  category_id?: string | null;
  category_name?: string;
  category_order_index?: number;

  // Comparativo com a lista de referência
  reference_price_per_secondary_unit?: number;
  reference_brand?: string;
  price_difference_percent?: number;     // Ex: +12 (%) ou -8 (%)
  price_status?: 'cheaper' | 'expensive' | 'equal' | 'no_reference';
}
