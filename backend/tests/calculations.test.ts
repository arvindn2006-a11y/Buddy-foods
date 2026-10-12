import { describe, it, expect } from 'vitest';
import {
  calculateOrderTotals,
  calculateNetProfitSummary,
  roundTo2Decimals
} from '../src/utils/calculations.js';

describe('Suvai Billing & Financial Calculations', () => {
  describe('roundTo2Decimals', () => {
    it('accurately rounds floating point numbers without drift', () => {
      expect(roundTo2Decimals(0.1 + 0.2)).toBe(0.3);
      expect(roundTo2Decimals(10.555)).toBe(10.56);
      expect(roundTo2Decimals(10.554)).toBe(10.55);
      expect(roundTo2Decimals(0)).toBe(0);
    });
  });

  describe('calculateOrderTotals', () => {
    it('calculates simple subtotal correctly', () => {
      const items = [
        { product_name: 'Idli (2 Pcs)', quantity: 2, unit_price: 30.00, unit_cost: 12.00 },
        { product_name: 'Medu Vada (1 Pc)', quantity: 1, unit_price: 15.00, unit_cost: 6.00 }
      ];

      const res = calculateOrderTotals(items, {
        taxRatePercent: 0,
        isTaxInclusive: true,
        discountValue: 0
      });

      expect(res.subtotal).toBe(75.00);
      expect(res.grandTotal).toBe(75.00);
      expect(res.totalCostPrice).toBe(30.00); // (2*12) + (1*6)
      expect(res.estimatedGrossProfit).toBe(45.00); // 75 - 30
      expect(res.itemsCount).toBe(3);
    });

    it('handles inclusive GST correctly (e.g. 5% GST included in price)', () => {
      const items = [
        { product_name: 'Chicken Dum Biryani', quantity: 1, unit_price: 105.00, unit_cost: 50.00 }
      ];

      const res = calculateOrderTotals(items, {
        taxRatePercent: 5.0,
        isTaxInclusive: true
      });

      expect(res.subtotal).toBe(105.00);
      expect(res.grandTotal).toBe(105.00);
      expect(res.taxableAmount).toBe(100.00);
      expect(res.taxAmount).toBe(5.00);
    });

    it('handles exclusive GST correctly (e.g. 5% GST added on top)', () => {
      const items = [
        { product_name: 'Special Combo', quantity: 1, unit_price: 100.00, unit_cost: 40.00 }
      ];

      const res = calculateOrderTotals(items, {
        taxRatePercent: 5.0,
        isTaxInclusive: false
      });

      expect(res.subtotal).toBe(100.00);
      expect(res.taxableAmount).toBe(100.00);
      expect(res.taxAmount).toBe(5.00);
      expect(res.grandTotal).toBe(105.00);
    });

    it('applies flat discount accurately', () => {
      const items = [
        { product_name: 'Dosa', quantity: 2, unit_price: 50.00, unit_cost: 20.00 }
      ];

      const res = calculateOrderTotals(items, {
        taxRatePercent: 0,
        discountType: 'flat',
        discountValue: 15.00
      });

      expect(res.subtotal).toBe(100.00);
      expect(res.discountAmount).toBe(15.00);
      expect(res.grandTotal).toBe(85.00);
    });

    it('applies percentage discount accurately', () => {
      const items = [
        { product_name: 'Meals', quantity: 2, unit_price: 100.00, unit_cost: 40.00 }
      ];

      const res = calculateOrderTotals(items, {
        taxRatePercent: 0,
        discountType: 'percent',
        discountValue: 10 // 10%
      });

      expect(res.subtotal).toBe(200.00);
      expect(res.discountAmount).toBe(20.00);
      expect(res.grandTotal).toBe(180.00);
    });
  });

  describe('calculateNetProfitSummary (Formula: Net Profit = Sales - Ingredient Cost - Operating Expenses)', () => {
    it('calculates estimated net profit and profit margin correctly', () => {
      const sales = 15000.00;
      const ingredientCost = 6200.00;
      const operatingExpenses = 2800.00;
      const refunds = 200.00;

      // Net Sales = 15000 - 200 = 14800
      // Gross Profit = 14800 - 6200 = 8600
      // Net Profit = 14800 - 6200 - 2800 = 5800
      // Margin = (5800 / 14800) * 100 = 39.19%

      const summary = calculateNetProfitSummary(sales, ingredientCost, operatingExpenses, refunds);

      expect(summary.netSales).toBe(14800.00);
      expect(summary.cogs).toBe(6200.00);
      expect(summary.operatingExpenses).toBe(2800.00);
      expect(summary.grossProfit).toBe(8600.00);
      expect(summary.netProfit).toBe(5800.00);
      expect(summary.profitMarginPercentage).toBe(39.19);
    });

    it('handles zero sales gracefully without division by zero', () => {
      const summary = calculateNetProfitSummary(0, 0, 500, 0);
      expect(summary.netSales).toBe(0);
      expect(summary.netProfit).toBe(-500.00);
      expect(summary.profitMarginPercentage).toBe(0);
    });
  });
});
