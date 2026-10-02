import { ConversionType } from './product.model';

export interface UserDefaults {
  id: number;
  default_unit_primary: string;
  default_conversion_type: ConversionType;
  default_conversion_factor: number;
  default_unit_secondary: string;
  default_quantity: number;
  auto_focus_field: 'price' | 'quantity' | 'name';
  default_view_mode: 'basic' | 'complete';
}
