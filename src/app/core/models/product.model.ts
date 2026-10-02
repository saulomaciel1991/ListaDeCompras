export type ConversionType = 'MULTIPLY' | 'DIVIDE';

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  unit_primary: string;                  // Ex: 'pct', 'cx', 'kg', 'l', 'un'
  conversion_type: ConversionType;       // 'MULTIPLY' ou 'DIVIDE'
  conversion_factor: number;             // > 0, default 1.0
  unit_secondary: string;                // Ex: 'un', 'g', 'ml'
  created_at: string;
  // Campos auxiliares de junção
  category_name?: string;
}
