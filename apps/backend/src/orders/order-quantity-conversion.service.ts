import { Injectable } from '@nestjs/common';

export type OrderQuantityConversion = {
  caseQuantity: number;
  remainingQuantity: number;
  orderedQuantity: number;
};

@Injectable()
export class OrderQuantityConversionService {
  convert(
    requestedQuantity: number,
    caseSize: number | null,
  ): OrderQuantityConversion | null {
    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 0 ||
      !Number.isInteger(caseSize) ||
      !caseSize ||
      caseSize < 1 ||
      requestedQuantity < caseSize
    ) {
      return null;
    }

    const caseQuantity = Math.floor(requestedQuantity / caseSize);

    return {
      caseQuantity,
      remainingQuantity: requestedQuantity % caseSize,
      orderedQuantity: requestedQuantity,
    };
  }

  resolveOrderedQuantity(
    requestedQuantity: number,
    caseSize: number | null,
  ): number {
    return this.convert(requestedQuantity, caseSize)?.orderedQuantity ??
      requestedQuantity;
  }
}
