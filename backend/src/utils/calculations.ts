/**
 * Financial and Billing Calculations for Suvai Canteen POS
 * Strict 2-decimal precision rules to prevent floating-point discrepancies.
 */

export interface CartItemInput {
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  notes?: string;
}

export interface CalculationOptions {
  taxRatePercent?: number;
  isTaxInclusive?: boolean;
  discountType?: 'flat' | 'percent';
  discountValue?: number;
}

export interface BillingSummary {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  totalCostPrice: number;
  estimatedGrossProfit: number;
  itemsCount: number;
}

export function roundTo2Decimals(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0.00;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates complete billing totals with taxes and discounts
 */
export function calculateOrderTotals(
  items: CartItemInput[],
  options: CalculationOptions = {}
): BillingSummary {
  const taxRate = options.taxRatePercent !== undefined ? options.taxRatePercent : 5.0; // 5% default GST
  const isTaxInclusive = options.isTaxInclusive !== undefined ? options.isTaxInclusive : true;
  const discountType = options.discountType || 'flat';
  const discountVal = options.discountValue || 0;

  let rawSubtotal = 0;
  let totalCostPrice = 0;
  let itemsCount = 0;

  for (const item of items) {
    const qty = Math.max(1, parseInt(String(item.quantity || 1), 10));
    const price = roundTo2Decimals(Number(item.unit_price || 0));
    const cost = roundTo2Decimals(Number(item.unit_cost || 0));

    rawSubtotal += price * qty;
    totalCostPrice += cost * qty;
    itemsCount += qty;
  }

  const subtotal = roundTo2Decimals(rawSubtotal);
  totalCostPrice = roundTo2Decimals(totalCostPrice);

  // Discount computation
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = roundTo2Decimals((subtotal * Math.min(100, Math.max(0, discountVal))) / 100);
  } else {
    discountAmount = roundTo2Decimals(Math.min(subtotal, Math.max(0, discountVal)));
  }

  const afterDiscount = roundTo2Decimals(Math.max(0, subtotal - discountAmount));

  let taxAmount = 0;
  let taxableAmount = 0;
  let grandTotal = 0;

  if (isTaxInclusive) {
    if (taxRate > 0) {
      taxableAmount = roundTo2Decimals(afterDiscount / (1 + taxRate / 100));
      taxAmount = roundTo2Decimals(afterDiscount - taxableAmount);
    } else {
      taxableAmount = afterDiscount;
      taxAmount = 0;
    }
    grandTotal = afterDiscount;
  } else {
    taxableAmount = afterDiscount;
    taxAmount = roundTo2Decimals((taxableAmount * taxRate) / 100);
    grandTotal = roundTo2Decimals(taxableAmount + taxAmount);
  }

  const estimatedGrossProfit = roundTo2Decimals(grandTotal - totalCostPrice);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    totalCostPrice,
    estimatedGrossProfit,
    itemsCount
  };
}

/**
 * Calculates Net Profit report metrics
 * Formula: Estimated Net Profit = Sales - Ingredient Cost - Operating Expenses
 */
export function calculateNetProfitSummary(
  grossSales: number,
  ingredientCost: number,
  operatingExpenses: number,
  refunds: number = 0
): {
  netSales: number;
  cogs: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMarginPercentage: number;
} {
  const safeSales = roundTo2Decimals(grossSales);
  const safeRefunds = roundTo2Decimals(refunds);
  const netSales = roundTo2Decimals(Math.max(0, safeSales - safeRefunds));
  const cogs = roundTo2Decimals(ingredientCost);
  const expenses = roundTo2Decimals(operatingExpenses);

  const grossProfit = roundTo2Decimals(netSales - cogs);
  const netProfit = roundTo2Decimals(netSales - cogs - expenses);

  let profitMarginPercentage = 0;
  if (netSales > 0) {
    profitMarginPercentage = roundTo2Decimals((netProfit / netSales) * 100);
  }

  return {
    netSales,
    cogs,
    operatingExpenses: expenses,
    grossProfit,
    netProfit,
    profitMarginPercentage
  };
}
