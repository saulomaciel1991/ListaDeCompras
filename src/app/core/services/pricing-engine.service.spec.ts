import { PricingEngineService, PricingState } from './pricing-engine.service';

describe('PricingEngineService', () => {
  let service: PricingEngineService;

  beforeEach(() => {
    service = new PricingEngineService();
  });

  it('deve converter quantidade de primária para secundária corretamente', () => {
    // 2 caixas com 12 unidades cada
    expect(service.calculateQuantitySecondary(2, 12, 'MULTIPLY')).toBe(24);
    // 500 gramas em kg (fator 1000, DIVIDE)
    expect(service.calculateQuantitySecondary(500, 1000, 'DIVIDE')).toBe(0.5);
  });

  it('deve recalcular quando Up é a origem do evento', () => {
    // Produto: 1 caixa com 6 unidades. Usuário digitou Up = R$ 18,00, Qp = 2 caixas
    const state: PricingState = {
      purchase_quantity: 2,
      conversion_type: 'MULTIPLY',
      conversion_factor: 6,
      unit_price_primary: 18.0,
      price_per_secondary_unit: 0,
      total_price: 0,
    };

    const result = service.recalculate(state, 'unit_price_primary');
    expect(result.unit_price_primary).toBe(18.0);
    expect(result.price_per_secondary_unit).toBe(3.0); // 18 / 6 = 3.0
    expect(result.total_price).toBe(36.0); // 18 * 2 = 36.0
  });

  it('deve manter até 4 casas decimais para Us em fracionamento pequeno', () => {
    // 500g de café por R$ 16,50 -> Us (preço por grama) = 16.50 / 500 = 0.033
    const state: PricingState = {
      purchase_quantity: 1,
      conversion_type: 'MULTIPLY',
      conversion_factor: 500,
      unit_price_primary: 16.5,
      price_per_secondary_unit: 0,
      total_price: 0,
    };

    const result = service.recalculate(state, 'unit_price_primary');
    expect(result.price_per_secondary_unit).toBe(0.033);
    expect(result.total_price).toBe(16.5);
  });

  it('deve recalcular quando Pt (preço total pago) é a origem do evento', () => {
    // Usuário pegou 4 unidades e o total na balança/caixa deu R$ 20,00 (fator 1 un)
    const state: PricingState = {
      purchase_quantity: 4,
      conversion_type: 'MULTIPLY',
      conversion_factor: 1,
      unit_price_primary: 0,
      price_per_secondary_unit: 0,
      total_price: 20.0,
    };

    const result = service.recalculate(state, 'total_price');
    expect(result.total_price).toBe(20.0);
    expect(result.unit_price_primary).toBe(5.0); // 20 / 4
    expect(result.price_per_secondary_unit).toBe(5.0);
  });

  it('deve comparar preços com a referência corretamente', () => {
    // Referência: R$ 5,00. Atual: R$ 4,50 (10% mais barato)
    const compCheaper = service.comparePrices(4.5, 5.0);
    expect(compCheaper.status).toBe('cheaper');
    expect(compCheaper.percentDifference).toBe(-10);

    // Referência: R$ 5,00. Atual: R$ 6,00 (20% mais caro)
    const compExpensive = service.comparePrices(6.0, 5.0);
    expect(compExpensive.status).toBe('expensive');
    expect(compExpensive.percentDifference).toBe(20);
  });
});
