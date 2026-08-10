export type CaseOrderConversion = {
  caseQuantity: number;
  remainingQuantity: number;
  orderedQuantity: number;
};

export function convertOrderQuantityToCases(
  quantity: number,
  caseSize: number | null | undefined,
): CaseOrderConversion | null {
  if (
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    !Number.isInteger(caseSize) ||
    !caseSize ||
    caseSize < 1 ||
    quantity < caseSize
  ) {
    return null;
  }

  const caseQuantity = Math.floor(quantity / caseSize);

  return {
    caseQuantity,
    remainingQuantity: quantity % caseSize,
    orderedQuantity: quantity,
  };
}
