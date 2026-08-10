import { OrderQuantityConversionService } from './order-quantity-conversion.service';

describe('OrderQuantityConversionService', () => {
  const service = new OrderQuantityConversionService();

  it('separates whole cases from the remaining individual units', () => {
    expect(service.convert(5, 3)).toEqual({
      caseQuantity: 1,
      remainingQuantity: 2,
      orderedQuantity: 5,
    });
  });

  it('keeps one individual can after a complete six-can case', () => {
    expect(service.convert(7, 6)).toEqual({
      caseQuantity: 1,
      remainingQuantity: 1,
      orderedQuantity: 7,
    });
  });

  it('keeps quantities below one case as individual units', () => {
    expect(service.resolveOrderedQuantity(2, 3)).toBe(2);
  });
});
