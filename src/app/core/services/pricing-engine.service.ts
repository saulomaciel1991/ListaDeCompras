import { Injectable } from '@angular/core';
import { ConversionType } from '../models/product.model';

export type PricingSource =
  | 'unit_price_primary'
  | 'unit_price_secondary'
  | 'total_price'
  | 'purchase_quantity'
  | 'conversion';

export interface PricingState {
  purchase_quantity: number;
  conversion_type: ConversionType;
  conversion_factor: number;
  unit_price_primary: number;
  price_per_secondary_unit: number;
  total_price: number;
}

export interface PriceComparisonResult {
  status: 'cheaper' | 'expensive' | 'equal' | 'no_reference';
  percentDifference: number; // Ex: -12.5 ou +8.3
}

@Injectable({
  providedIn: 'root',
})
export class PricingEngineService {
  /**
   * Arredonda para 2 casas decimais (valores monetários standard)
   */
  round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Arredonda para até 4 casas decimais (preço unitário secundário)
   */
  round4(value: number): number {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  /**
   * Converte a quantidade primária para secundária
   */
  calculateQuantitySecondary(
    quantityPrimary: number,
    factor: number,
    type: ConversionType
  ): number {
    const validFactor = factor > 0 ? factor : 1.0;
    if (type === 'MULTIPLY') {
      return this.round4(quantityPrimary * validFactor);
    } else {
      return this.round4(quantityPrimary / validFactor);
    }
  }

  /**
   * Converte a quantidade secundária para primária
   */
  calculateQuantityPrimary(
    quantitySecondary: number,
    factor: number,
    type: ConversionType
  ): number {
    const validFactor = factor > 0 ? factor : 1.0;
    if (type === 'MULTIPLY') {
      return this.round4(quantitySecondary / validFactor);
    } else {
      return this.round4(quantitySecondary * validFactor);
    }
  }

  /**
   * Motor reativo baseado no Source of Truth para evitar loops e inconsistências
   */
  recalculate(state: PricingState, source: PricingSource): PricingState {
    const factor = state.conversion_factor > 0 ? state.conversion_factor : 1.0;
    const type = state.conversion_type || 'MULTIPLY';
    const quantity = state.purchase_quantity > 0 ? state.purchase_quantity : 1.0;

    let up = state.unit_price_primary || 0;
    let us = state.price_per_secondary_unit || 0;
    let pt = state.total_price || 0;

    switch (source) {
      case 'unit_price_primary': {
        // Up é a verdade absoluta
        up = state.unit_price_primary;
        us = type === 'MULTIPLY' ? this.round4(up / factor) : this.round4(up * factor);
        pt = this.round2(up * quantity);
        break;
      }

      case 'unit_price_secondary': {
        // Us é a verdade absoluta
        us = state.price_per_secondary_unit;
        up = type === 'MULTIPLY' ? this.round2(us * factor) : this.round2(us / factor);
        pt = this.round2(up * quantity);
        break;
      }

      case 'total_price': {
        // Pt é a verdade absoluta
        pt = state.total_price;
        up = quantity > 0 ? this.round2(pt / quantity) : 0;
        us = type === 'MULTIPLY' ? this.round4(up / factor) : this.round4(up * factor);
        break;
      }

      case 'purchase_quantity': {
        // Quantidade mudou; Up é âncora fixa
        pt = this.round2(up * quantity);
        break;
      }

      case 'conversion': {
        // Fator ou Tipo mudou; Up é âncora fixa
        us = type === 'MULTIPLY' ? this.round4(up / factor) : this.round4(up * factor);
        break;
      }
    }

    return {
      ...state,
      conversion_factor: factor,
      conversion_type: type,
      unit_price_primary: up,
      price_per_secondary_unit: us,
      total_price: pt,
    };
  }

  /**
   * Compara o preço unitário secundário atual com o preço de referência
   */
  comparePrices(
    currentSecondaryPrice: number,
    referenceSecondaryPrice: number
  ): PriceComparisonResult {
    if (
      !referenceSecondaryPrice ||
      referenceSecondaryPrice <= 0 ||
      !currentSecondaryPrice ||
      currentSecondaryPrice <= 0
    ) {
      return { status: 'no_reference', percentDifference: 0 };
    }

    const diff = currentSecondaryPrice - referenceSecondaryPrice;
    const percent = this.round2((diff / referenceSecondaryPrice) * 100);

    if (Math.abs(percent) < 0.5) {
      return { status: 'equal', percentDifference: 0 };
    }

    return {
      status: diff < 0 ? 'cheaper' : 'expensive',
      percentDifference: percent,
    };
  }
}
