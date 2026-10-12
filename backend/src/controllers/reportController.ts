import { Request, Response } from 'express';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { calculateNetProfitSummary, roundTo2Decimals } from '../utils/calculations.js';

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const todayStr = new Date().toISOString().slice(0, 10);

    if (pool && !isFallbackActive()) {
      // 1. Today's completed orders metrics
      const [orderMetrics]: any = await pool.query(`
        SELECT 
          COUNT(CASE WHEN order_status = 'completed' THEN 1 END) as completed_orders_count,
          COALESCE(SUM(CASE WHEN order_status = 'completed' THEN grand_total ELSE 0 END), 0) as gross_sales,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method = 'cash' THEN grand_total ELSE 0 END), 0) as cash_collections,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method = 'upi' THEN grand_total ELSE 0 END), 0) as upi_collections,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method NOT IN ('cash', 'upi') THEN grand_total ELSE 0 END), 0) as other_collections,
          COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) as cancelled_orders_count,
          COALESCE(SUM(CASE WHEN order_status = 'cancelled' THEN grand_total ELSE 0 END), 0) as cancelled_orders_amount,
          COALESCE(SUM(CASE WHEN payment_status = 'refunded' THEN grand_total ELSE 0 END), 0) as refunds_amount
        FROM orders
        WHERE DATE(order_date) = CURDATE()
      `);

      // 2. Ingredient cost (COGS) for today's completed orders
      const [cogsRows]: any = await pool.query(`
        SELECT COALESCE(SUM(oi.quantity * oi.unit_cost), 0) as total_cogs
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE DATE(o.order_date) = CURDATE() AND o.order_status = 'completed'
      `);

      // 3. Operating expenses for today
      const [expenseRows]: any = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE expense_date = CURDATE()
      `);

      // 4. Hourly sales trend for today (peak hours breakdown)
      const [hourlyRows]: any = await pool.query(`
        SELECT 
          HOUR(order_date) as order_hour,
          COUNT(*) as order_count,
          SUM(grand_total) as hourly_sales
        FROM orders
        WHERE DATE(order_date) = CURDATE() AND order_status = 'completed'
        GROUP BY HOUR(order_date)
        ORDER BY order_hour ASC
      `);

      // 5. Recent 8 orders
      const [recentOrders]: any = await pool.query(`
        SELECT id, bill_number, order_date, customer_name, grand_total, payment_method, order_status, token_number
        FROM orders
        ORDER BY order_date DESC
        LIMIT 8
      `);

      const m = orderMetrics[0] || {};
      const grossSales = Number(m.gross_sales || 0);
      const ingredientCost = Number(cogsRows[0]?.total_cogs || 0);
      const operatingExpenses = Number(expenseRows[0]?.total_expenses || 0);
      const refunds = Number(m.refunds_amount || 0);

      const profitMetrics = calculateNetProfitSummary(grossSales, ingredientCost, operatingExpenses, refunds);

      res.json({
        success: true,
        data: {
          today: todayStr,
          gross_sales: grossSales,
          completed_orders_count: Number(m.completed_orders_count || 0),
          cash_collections: Number(m.cash_collections || 0),
          upi_collections: Number(m.upi_collections || 0),
          other_collections: Number(m.other_collections || 0),
          cancelled_orders_count: Number(m.cancelled_orders_count || 0),
          cancelled_orders_amount: Number(m.cancelled_orders_amount || 0),
          refunds_amount: refunds,
          operating_expenses: operatingExpenses,
          ingredient_cost: ingredientCost,
          gross_profit: profitMetrics.grossProfit,
          estimated_net_profit: profitMetrics.netProfit,
          profit_margin_percentage: profitMetrics.profitMarginPercentage,
          hourly_trend: hourlyRows,
          recent_orders: recentOrders
        }
      });
    } else {
      // In-memory fallback
      const todayOrders = fallbackStore.orders.filter(
        o => new Date(o.order_date).toISOString().slice(0, 10) === todayStr
      );

      const completedOrders = todayOrders.filter(o => o.order_status === 'completed');
      const cancelledOrders = todayOrders.filter(o => o.order_status === 'cancelled');

      const grossSales = roundTo2Decimals(completedOrders.reduce((sum, o) => sum + Number(o.grand_total), 0));
      const cashCol = roundTo2Decimals(completedOrders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + Number(o.grand_total), 0));
      const upiCol = roundTo2Decimals(completedOrders.filter(o => o.payment_method === 'upi').reduce((sum, o) => sum + Number(o.grand_total), 0));
      const otherCol = roundTo2Decimals(completedOrders.filter(o => !['cash', 'upi'].includes(o.payment_method)).reduce((sum, o) => sum + Number(o.grand_total), 0));

      const refunds = roundTo2Decimals(todayOrders.filter(o => o.payment_status === 'refunded').reduce((sum, o) => sum + Number(o.grand_total), 0));
      const cancelledAmount = roundTo2Decimals(cancelledOrders.reduce((sum, o) => sum + Number(o.grand_total), 0));

      // Calculate COGS
      const completedIds = new Set(completedOrders.map(o => o.id));
      const todayItems = fallbackStore.order_items.filter(i => completedIds.has(i.order_id));
      const ingredientCost = roundTo2Decimals(todayItems.reduce((sum, i) => sum + (Number(i.unit_cost || 0) * i.quantity), 0));

      // Expenses
      const todayExpenses = fallbackStore.expenses.filter(e => e.expense_date === todayStr);
      const operatingExpenses = roundTo2Decimals(todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0));

      const profitMetrics = calculateNetProfitSummary(grossSales, ingredientCost, operatingExpenses, refunds);

      res.json({
        success: true,
        data: {
          today: todayStr,
          gross_sales: grossSales,
          completed_orders_count: completedOrders.length,
          cash_collections: cashCol,
          upi_collections: upiCol,
          other_collections: otherCol,
          cancelled_orders_count: cancelledOrders.length,
          cancelled_orders_amount: cancelledAmount,
          refunds_amount: refunds,
          operating_expenses: operatingExpenses,
          ingredient_cost: ingredientCost,
          gross_profit: profitMetrics.grossProfit,
          estimated_net_profit: profitMetrics.netProfit,
          profit_margin_percentage: profitMetrics.profitMarginPercentage,
          hourly_trend: [],
          recent_orders: fallbackStore.orders.slice(-8).reverse()
        }
      });
    }
  } catch (error: any) {
    console.error('[Dashboard Report Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to generate dashboard metrics.' });
  }
}

export async function getDailyEarnings(req: Request, res: Response): Promise<void> {
  const { date } = req.query;
  const targetDate = (date as string) || new Date().toISOString().slice(0, 10);

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      const [orderStats]: any = await pool.query(`
        SELECT 
          COUNT(CASE WHEN order_status = 'completed' THEN 1 END) as total_orders,
          COALESCE(SUM(CASE WHEN order_status = 'completed' THEN grand_total ELSE 0 END), 0) as gross_sales,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method = 'cash' THEN grand_total ELSE 0 END), 0) as cash_sales,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method = 'upi' THEN grand_total ELSE 0 END), 0) as upi_sales,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method NOT IN ('cash', 'upi') THEN grand_total ELSE 0 END), 0) as other_sales,
          COALESCE(SUM(CASE WHEN payment_status = 'refunded' THEN grand_total ELSE 0 END), 0) as total_refunds
        FROM orders
        WHERE DATE(order_date) = ?
      `, [targetDate]);

      // Cash expenses paid out from drawer
      const [cashExpenses]: any = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as cash_expenses_paid
        FROM expenses
        WHERE expense_date = ? AND payment_method = 'cash'
      `, [targetDate]);

      // All expenses for the day
      const [allExpenses]: any = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE expense_date = ?
      `, [targetDate]);

      const stat = orderStats[0] || {};
      const grossSales = Number(stat.gross_sales || 0);
      const cashSales = Number(stat.cash_sales || 0);
      const upiSales = Number(stat.upi_sales || 0);
      const otherSales = Number(stat.other_sales || 0);
      const totalRefunds = Number(stat.total_refunds || 0);
      const cashPaidOut = Number(cashExpenses[0]?.cash_expenses_paid || 0);
      const totalExpenses = Number(allExpenses[0]?.total_expenses || 0);

      // Expected Cash In Drawer = Cash Sales - Cash Refunds - Cash Expenses
      const expectedCashInDrawer = roundTo2Decimals(Math.max(0, cashSales - totalRefunds - cashPaidOut));

      res.json({
        success: true,
        data: {
          date: targetDate,
          total_orders: Number(stat.total_orders || 0),
          gross_sales: grossSales,
          cash_sales: cashSales,
          upi_sales: upiSales,
          other_sales: otherSales,
          total_refunds: totalRefunds,
          cash_expenses_paid: cashPaidOut,
          total_expenses: totalExpenses,
          expected_cash_in_drawer: expectedCashInDrawer
        }
      });
    } else {
      const dayOrders = fallbackStore.orders.filter(
        o => new Date(o.order_date).toISOString().slice(0, 10) === targetDate
      );
      const completed = dayOrders.filter(o => o.order_status === 'completed');
      const grossSales = roundTo2Decimals(completed.reduce((s, o) => s + Number(o.grand_total), 0));
      const cashSales = roundTo2Decimals(completed.filter(o => o.payment_method === 'cash').reduce((s, o) => s + Number(o.grand_total), 0));
      const upiSales = roundTo2Decimals(completed.filter(o => o.payment_method === 'upi').reduce((s, o) => s + Number(o.grand_total), 0));
      const refunds = roundTo2Decimals(dayOrders.filter(o => o.payment_status === 'refunded').reduce((s, o) => s + Number(o.grand_total), 0));

      const dayExpenses = fallbackStore.expenses.filter(e => e.expense_date === targetDate);
      const cashExpenses = roundTo2Decimals(dayExpenses.filter(e => e.payment_method === 'cash').reduce((s, e) => s + Number(e.amount), 0));
      const totalExpenses = roundTo2Decimals(dayExpenses.reduce((s, e) => s + Number(e.amount), 0));

      const expectedCashInDrawer = roundTo2Decimals(Math.max(0, cashSales - refunds - cashExpenses));

      res.json({
        success: true,
        data: {
          date: targetDate,
          total_orders: completed.length,
          gross_sales: grossSales,
          cash_sales: cashSales,
          upi_sales: upiSales,
          other_sales: 0,
          total_refunds: refunds,
          cash_expenses_paid: cashExpenses,
          total_expenses: totalExpenses,
          expected_cash_in_drawer: expectedCashInDrawer
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to calculate daily earnings.' });
  }
}

export async function getAnalyticsReport(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  const start = (startDate as string) || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const end = (endDate as string) || new Date().toISOString().slice(0, 10);

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      // 1. Overall sales & refunds in range
      const [summaryRows]: any = await pool.query(`
        SELECT 
          COUNT(CASE WHEN order_status = 'completed' THEN 1 END) as order_count,
          COALESCE(SUM(CASE WHEN order_status = 'completed' THEN grand_total ELSE 0 END), 0) as total_sales,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method = 'cash' THEN grand_total ELSE 0 END), 0) as cash_total,
          COALESCE(SUM(CASE WHEN order_status = 'completed' AND payment_method = 'upi' THEN grand_total ELSE 0 END), 0) as upi_total,
          COALESCE(SUM(CASE WHEN payment_status = 'refunded' THEN grand_total ELSE 0 END), 0) as total_refunds
        FROM orders
        WHERE DATE(order_date) BETWEEN ? AND ?
      `, [start, end]);

      // 2. Total COGS (ingredient costs) in range
      const [cogsRows]: any = await pool.query(`
        SELECT COALESCE(SUM(oi.quantity * oi.unit_cost), 0) as total_cogs
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE DATE(o.order_date) BETWEEN ? AND ? AND o.order_status = 'completed'
      `, [start, end]);

      // 3. Operating expenses in range
      const [expenseRows]: any = await pool.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses,
          category,
          COUNT(*) as expense_count
        FROM expenses
        WHERE expense_date BETWEEN ? AND ?
        GROUP BY category
      `, [start, end]);

      // 4. Daily trend series
      const [trendRows]: any = await pool.query(`
        SELECT 
          DATE(order_date) as date,
          COUNT(*) as orders,
          SUM(grand_total) as sales
        FROM orders
        WHERE DATE(order_date) BETWEEN ? AND ? AND order_status = 'completed'
        GROUP BY DATE(order_date)
        ORDER BY date ASC
      `, [start, end]);

      // 5. Top selling items
      const [topItems]: any = await pool.query(`
        SELECT 
          oi.product_name,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE DATE(o.order_date) BETWEEN ? AND ? AND o.order_status = 'completed'
        GROUP BY oi.product_name
        ORDER BY total_quantity DESC
        LIMIT 10
      `, [start, end]);

      const sum = summaryRows[0] || {};
      const grossSales = Number(sum.total_sales || 0);
      const ingredientCost = Number(cogsRows[0]?.total_cogs || 0);
      const totalOperatingExpenses = (expenseRows as any[]).reduce((s, e) => s + Number(e.total_expenses), 0);
      const refunds = Number(sum.total_refunds || 0);

      const netSummary = calculateNetProfitSummary(grossSales, ingredientCost, totalOperatingExpenses, refunds);

      res.json({
        success: true,
        data: {
          period: { startDate: start, endDate: end },
          metrics: {
            order_count: Number(sum.order_count || 0),
            gross_sales: grossSales,
            cash_total: Number(sum.cash_total || 0),
            upi_total: Number(sum.upi_total || 0),
            refunds_total: refunds,
            ingredient_cost: ingredientCost,
            operating_expenses: totalOperatingExpenses,
            gross_profit: netSummary.grossProfit,
            net_profit: netSummary.netProfit,
            profit_margin: netSummary.profitMarginPercentage
          },
          daily_trend: trendRows,
          top_items: topItems,
          expenses_by_category: expenseRows
        }
      });
    } else {
      // In-memory analytics
      const rangeOrders = fallbackStore.orders.filter(o => {
        const d = new Date(o.order_date).toISOString().slice(0, 10);
        return d >= start && d <= end && o.order_status === 'completed';
      });

      const grossSales = roundTo2Decimals(rangeOrders.reduce((s, o) => s + Number(o.grand_total), 0));
      const cashTotal = roundTo2Decimals(rangeOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + Number(o.grand_total), 0));
      const upiTotal = roundTo2Decimals(rangeOrders.filter(o => o.payment_method === 'upi').reduce((s, o) => s + Number(o.grand_total), 0));

      const rangeExpenses = fallbackStore.expenses.filter(e => e.expense_date >= start && e.expense_date <= end);
      const totalExpenses = roundTo2Decimals(rangeExpenses.reduce((s, e) => s + Number(e.amount), 0));

      const rangeOrderIds = new Set(rangeOrders.map(o => o.id));
      const rangeItems = fallbackStore.order_items.filter(i => rangeOrderIds.has(i.order_id));
      const ingredientCost = roundTo2Decimals(rangeItems.reduce((s, i) => s + (Number(i.unit_cost || 0) * i.quantity), 0));

      // Aggregate top items
      const itemMap: Record<string, { total_quantity: number; total_revenue: number }> = {};
      rangeItems.forEach(i => {
        if (!itemMap[i.product_name]) itemMap[i.product_name] = { total_quantity: 0, total_revenue: 0 };
        itemMap[i.product_name].total_quantity += i.quantity;
        itemMap[i.product_name].total_revenue += Number(i.subtotal);
      });

      const topItems = Object.entries(itemMap)
        .map(([name, stat]) => ({ product_name: name, total_quantity: stat.total_quantity, total_revenue: roundTo2Decimals(stat.total_revenue) }))
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10);

      const netSummary = calculateNetProfitSummary(grossSales, ingredientCost, totalExpenses, 0);

      res.json({
        success: true,
        data: {
          period: { startDate: start, endDate: end },
          metrics: {
            order_count: rangeOrders.length,
            gross_sales: grossSales,
            cash_total: cashTotal,
            upi_total: upiTotal,
            refunds_total: 0,
            ingredient_cost: ingredientCost,
            operating_expenses: totalExpenses,
            gross_profit: netSummary.grossProfit,
            net_profit: netSummary.netProfit,
            profit_margin: netSummary.profitMarginPercentage
          },
          daily_trend: [],
          top_items: topItems,
          expenses_by_category: []
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate analytics report.' });
  }
}

export async function exportReportCsv(req: Request, res: Response): Promise<void> {
  const { type = 'sales', startDate, endDate } = req.query;
  const start = (startDate as string) || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const end = (endDate as string) || new Date().toISOString().slice(0, 10);

  try {
    const pool = getPool();
    let csvData = '';

    if (type === 'sales') {
      let orders: any[] = [];
      if (pool && !isFallbackActive()) {
        const [rows]: any = await pool.query(
          `SELECT bill_number, order_date, customer_name, subtotal, discount_amount, tax_amount, grand_total, payment_method, order_status
           FROM orders
           WHERE DATE(order_date) BETWEEN ? AND ?
           ORDER BY order_date DESC`,
          [start, end]
        );
        orders = rows;
      } else {
        orders = fallbackStore.orders.filter(o => {
          const d = new Date(o.order_date).toISOString().slice(0, 10);
          return d >= start && d <= end;
        });
      }

      csvData = 'Bill Number,Order Date,Customer,Subtotal,Discount,Tax,Grand Total,Payment Method,Status\n';
      orders.forEach(o => {
        csvData += `"${o.bill_number}","${new Date(o.order_date).toISOString()}","${o.customer_name || ''}",${o.subtotal},${o.discount_amount},${o.tax_amount},${o.grand_total},"${o.payment_method}","${o.order_status}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="suvai-sales-${start}-to-${end}.csv"`);
      res.send(csvData);
      return;
    }

    if (type === 'expenses') {
      let expenses: any[] = [];
      if (pool && !isFallbackActive()) {
        const [rows]: any = await pool.query(
          `SELECT category, title, amount, expense_date, paid_to, payment_method, receipt_number, notes
           FROM expenses
           WHERE expense_date BETWEEN ? AND ?
           ORDER BY expense_date DESC`,
          [start, end]
        );
        expenses = rows;
      } else {
        expenses = fallbackStore.expenses.filter(e => e.expense_date >= start && e.expense_date <= end);
      }

      csvData = 'Date,Category,Title,Amount,Paid To,Payment Method,Receipt No,Notes\n';
      expenses.forEach(e => {
        csvData += `"${e.expense_date}","${e.category}","${e.title}",${e.amount},"${e.paid_to || ''}","${e.payment_method}","${e.receipt_number || ''}","${(e.notes || '').replace(/"/g, '""')}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="suvai-expenses-${start}-to-${end}.csv"`);
      res.send(csvData);
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid CSV export type.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
}
