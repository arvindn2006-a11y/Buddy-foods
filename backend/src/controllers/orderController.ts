import { Request, Response } from 'express';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { calculateOrderTotals, roundTo2Decimals } from '../utils/calculations.js';
import { logAuditEvent } from '../utils/audit.js';

/**
 * Generate sequential bill number: e.g. SUV-20261012-0001
 */
async function generateBillNumber(conn: any, prefix = 'SUV-'): Promise<{ billNumber: string; tokenNumber: number }> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // 20261012

  if (conn && !isFallbackActive()) {
    // Count orders created today
    const [rows]: any = await conn.query(
      `SELECT COUNT(*) as today_count FROM orders WHERE DATE(order_date) = CURDATE()`
    );
    const count = (rows[0]?.today_count || 0) + 1;
    const tokenNumber = count;
    const billNumber = `${prefix}${dateStr}-${String(count).padStart(4, '0')}`;
    return { billNumber, tokenNumber };
  } else {
    const todayOrders = fallbackStore.orders.filter(o => {
      const d = new Date(o.order_date).toISOString().slice(0, 10).replace(/-/g, '');
      return d === dateStr;
    });
    const count = todayOrders.length + 1;
    return {
      billNumber: `${prefix}${dateStr}-${String(count).padStart(4, '0')}`,
      tokenNumber: count
    };
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    items,
    customer_name,
    customer_type,
    discount_type,
    discount_value,
    tax_rate,
    is_tax_inclusive,
    payment_method,
    notes,
    offline_id
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    return;
  }

  // Idempotency check: if offline_id is already present, return the existing order
  if (offline_id) {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      const [existing]: any = await pool.query('SELECT * FROM orders WHERE offline_id = ?', [offline_id]);
      if (existing.length > 0) {
        res.json({
          success: true,
          message: 'Order already recorded (idempotent).',
          data: existing[0],
          is_duplicate: true
        });
        return;
      }
    } else {
      const existing = fallbackStore.orders.find(o => o.offline_id === offline_id);
      if (existing) {
        res.json({
          success: true,
          message: 'Order already recorded (idempotent).',
          data: existing,
          is_duplicate: true
        });
        return;
      }
    }
  }

  try {
    const pool = getPool();

    // Fetch tax and prefix settings
    let invoicePrefix = 'SUV-';
    let configuredTaxRate = 5.0;
    let configuredTaxInclusive = true;

    if (pool && !isFallbackActive()) {
      const [settingsRows]: any = await pool.query(
        "SELECT setting_key, setting_value FROM business_settings WHERE setting_key IN ('invoice_prefix', 'tax_percentage', 'tax_inclusive')"
      );
      for (const row of settingsRows) {
        if (row.setting_key === 'invoice_prefix') invoicePrefix = row.setting_value || 'SUV-';
        if (row.setting_key === 'tax_percentage') configuredTaxRate = parseFloat(row.setting_value) || 0;
        if (row.setting_key === 'tax_inclusive') configuredTaxInclusive = row.setting_value === 'true';
      }
    }

    const appliedTaxRate = tax_rate !== undefined ? Number(tax_rate) : configuredTaxRate;
    const appliedTaxInclusive = is_tax_inclusive !== undefined ? !!is_tax_inclusive : configuredTaxInclusive;

    // Validate and enrich items with product cost price & selling price from DB to prevent client price tampering
    let enrichedItems: any[] = [];
    if (pool && !isFallbackActive()) {
      for (const item of items) {
        let unitPrice = Number(item.unit_price);
        let unitCost = Number(item.unit_cost || 0);
        let prodName = item.product_name;

        if (item.product_id) {
          const [pRows]: any = await pool.query('SELECT name, selling_price, cost_price FROM products WHERE id = ?', [item.product_id]);
          if (pRows.length > 0) {
            prodName = pRows[0].name;
            unitPrice = Number(pRows[0].selling_price);
            unitCost = Number(pRows[0].cost_price);
          }
        }

        enrichedItems.push({
          product_id: item.product_id || null,
          product_name: prodName,
          quantity: Math.max(1, parseInt(item.quantity, 10)),
          unit_price: roundTo2Decimals(unitPrice),
          unit_cost: roundTo2Decimals(unitCost),
          notes: item.notes || null
        });
      }
    } else {
      enrichedItems = items.map(item => {
        const prod = fallbackStore.products.find(p => p.id === item.product_id);
        return {
          product_id: item.product_id || null,
          product_name: prod?.name || item.product_name,
          quantity: Math.max(1, parseInt(item.quantity, 10)),
          unit_price: roundTo2Decimals(Number(prod?.selling_price || item.unit_price)),
          unit_cost: roundTo2Decimals(Number(prod?.cost_price || item.unit_cost || 0)),
          notes: item.notes || null
        };
      });
    }

    // Backend-validated calculations
    const totals = calculateOrderTotals(enrichedItems, {
      taxRatePercent: appliedTaxRate,
      isTaxInclusive: appliedTaxInclusive,
      discountType: discount_type || 'flat',
      discountValue: Number(discount_value || 0)
    });

    const paymentMethod = ['cash', 'upi', 'card', 'other'].includes(payment_method) ? payment_method : 'cash';
    const custType = ['student', 'staff', 'visitor'].includes(customer_type) ? customer_type : 'student';
    const cashierId = req.user?.id || null;

    if (pool && !isFallbackActive()) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const { billNumber, tokenNumber } = await generateBillNumber(conn, invoicePrefix);

        const [orderResult]: any = await conn.query(
          `INSERT INTO orders 
           (bill_number, order_date, customer_name, customer_type, token_number,
            subtotal, discount_amount, tax_amount, grand_total, payment_method,
            payment_status, order_status, cashier_id, notes, offline_id, is_synced)
           VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'completed', ?, ?, ?, 1)`,
          [
            billNumber,
            customer_name || 'Walk-in Student/Staff',
            custType,
            tokenNumber,
            totals.subtotal,
            totals.discountAmount,
            totals.taxAmount,
            totals.grandTotal,
            paymentMethod,
            cashierId,
            notes || null,
            offline_id || null
          ]
        );

        const orderId = orderResult.insertId;

        // Insert Order Items
        for (const item of enrichedItems) {
          const itemSubtotal = roundTo2Decimals(item.quantity * item.unit_price);
          await conn.query(
            `INSERT INTO order_items 
             (order_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.product_id,
              item.product_name,
              item.quantity,
              item.unit_price,
              item.unit_cost,
              itemSubtotal,
              item.notes
            ]
          );
        }

        // Insert Payment record
        await conn.query(
          `INSERT INTO payments (order_id, payment_method, amount, status) VALUES (?, ?, ?, 'success')`,
          [orderId, paymentMethod, totals.grandTotal]
        );

        await conn.commit();

        await logAuditEvent(cashierId, 'CREATE_ORDER', 'order', String(orderId), {
          billNumber,
          grandTotal: totals.grandTotal,
          paymentMethod
        }, req.ip);

        // Fetch complete created order
        const [createdRows]: any = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const [itemRows]: any = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

        res.status(201).json({
          success: true,
          message: 'Order created successfully.',
          data: {
            ...createdRows[0],
            items: itemRows
          }
        });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      // Fallback in-memory processing
      const { billNumber, tokenNumber } = await generateBillNumber(null, invoicePrefix);
      const newOrderId = fallbackStore.orders.length + 1;

      const orderObj = {
        id: newOrderId,
        bill_number: billNumber,
        order_date: new Date().toISOString(),
        customer_name: customer_name || 'Walk-in Student/Staff',
        customer_type: custType,
        token_number: tokenNumber,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        grand_total: totals.grandTotal,
        payment_method: paymentMethod,
        payment_status: 'paid',
        order_status: 'completed',
        cashier_id: cashierId,
        notes: notes || null,
        offline_id: offline_id || null,
        is_synced: 1,
        created_at: new Date()
      };

      fallbackStore.orders.push(orderObj);

      const itemsCreated = enrichedItems.map((item, idx) => {
        const itemSubtotal = roundTo2Decimals(item.quantity * item.unit_price);
        const itemObj = {
          id: fallbackStore.order_items.length + idx + 1,
          order_id: newOrderId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          subtotal: itemSubtotal,
          notes: item.notes
        };
        fallbackStore.order_items.push(itemObj);
        return itemObj;
      });

      fallbackStore.payments.push({
        id: fallbackStore.payments.length + 1,
        order_id: newOrderId,
        payment_method: paymentMethod,
        amount: totals.grandTotal,
        status: 'success',
        created_at: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully.',
        data: {
          ...orderObj,
          items: itemsCreated
        }
      });
    }
  } catch (error: any) {
    console.error('[Create Order Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to process and record order.' });
  }
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  const { startDate, endDate, status, payment_method, search, limit = '50', page = '1' } = req.query;

  try {
    const pool = getPool();
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10)));
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const offset = (pageNum - 1) * limitNum;

    if (pool && !isFallbackActive()) {
      let query = `
        SELECT o.*, u.full_name as cashier_name,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
        FROM orders o
        LEFT JOIN users u ON o.cashier_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (startDate) {
        query += ' AND DATE(o.order_date) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND DATE(o.order_date) <= ?';
        params.push(endDate);
      }
      if (status) {
        query += ' AND o.order_status = ?';
        params.push(status);
      }
      if (payment_method) {
        query += ' AND o.payment_method = ?';
        params.push(payment_method);
      }
      if (search && typeof search === 'string' && search.trim()) {
        query += ' AND (o.bill_number LIKE ? OR o.customer_name LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
      const [countRows]: any = await pool.query(countQuery, params);
      const totalCount = countRows[0]?.total || 0;

      query += ' ORDER BY o.order_date DESC LIMIT ? OFFSET ?';
      params.push(limitNum, offset);

      const [orders]: any = await pool.query(query, params);

      res.json({
        success: true,
        data: orders,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      });
    } else {
      let list = [...fallbackStore.orders];

      if (startDate) list = list.filter(o => new Date(o.order_date).toISOString().slice(0, 10) >= String(startDate));
      if (endDate) list = list.filter(o => new Date(o.order_date).toISOString().slice(0, 10) <= String(endDate));
      if (status) list = list.filter(o => o.order_status === status);
      if (payment_method) list = list.filter(o => o.payment_method === payment_method);
      if (search && typeof search === 'string' && search.trim()) {
        const s = search.toLowerCase().trim();
        list = list.filter(o => o.bill_number.toLowerCase().includes(s) || (o.customer_name && o.customer_name.toLowerCase().includes(s)));
      }

      list.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

      const totalCount = list.length;
      const paginated = list.slice(offset, offset + limitNum).map(o => {
        const items = fallbackStore.order_items.filter(i => i.order_id === o.id);
        return {
          ...o,
          cashier_name: 'Suvai Cashier',
          items_count: items.reduce((sum, item) => sum + item.quantity, 0)
        };
      });

      res.json({
        success: true,
        data: paginated,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      const [orderRows]: any = await pool.query(
        `SELECT o.*, u.full_name as cashier_name
         FROM orders o
         LEFT JOIN users u ON o.cashier_id = u.id
         WHERE o.id = ?`,
        [id]
      );

      if (orderRows.length === 0) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      const [itemRows]: any = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
        [id]
      );
      const [paymentRows]: any = await pool.query(
        'SELECT * FROM payments WHERE order_id = ?',
        [id]
      );

      res.json({
        success: true,
        data: {
          ...orderRows[0],
          items: itemRows,
          payments: paymentRows
        }
      });
    } else {
      const order = fallbackStore.orders.find(o => o.id === Number(id));
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      const items = fallbackStore.order_items.filter(i => i.order_id === Number(id));
      const payments = fallbackStore.payments.filter(p => p.order_id === Number(id));

      res.json({
        success: true,
        data: {
          ...order,
          items,
          payments
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load order details.' });
  }
}

export async function cancelOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { cancellation_reason, refund_amount } = req.body;

  if (!cancellation_reason || !cancellation_reason.trim()) {
    res.status(400).json({ success: false, message: 'Cancellation reason is required.' });
    return;
  }

  try {
    const pool = getPool();
    const reason = cancellation_reason.trim();

    if (pool && !isFallbackActive()) {
      const [orderRows]: any = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (orderRows.length === 0) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      const order = orderRows[0];
      if (order.order_status === 'cancelled') {
        res.status(400).json({ success: false, message: 'Order is already cancelled.' });
        return;
      }

      await pool.query(
        `UPDATE orders SET 
         order_status = 'cancelled', 
         payment_status = 'refunded', 
         cancellation_reason = ? 
         WHERE id = ?`,
        [reason, id]
      );

      await pool.query(
        `UPDATE payments SET status = 'refunded' WHERE order_id = ?`,
        [id]
      );

      await logAuditEvent(req.user?.id || null, 'CANCEL_ORDER', 'order', String(id), {
        bill_number: order.bill_number,
        reason,
        grand_total: order.grand_total
      }, req.ip);

      res.json({ success: true, message: 'Order cancelled and refund recorded.' });
    } else {
      const order = fallbackStore.orders.find(o => o.id === Number(id));
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      order.order_status = 'cancelled';
      order.payment_status = 'refunded';
      order.cancellation_reason = reason;

      const payments = fallbackStore.payments.filter(p => p.order_id === Number(id));
      payments.forEach(p => (p.status = 'refunded'));

      res.json({ success: true, message: 'Order cancelled and refund recorded.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
}

/**
 * Bulk sync endpoint for offline PWA orders
 */
export async function syncOfflineOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { orders } = req.body;

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ success: false, message: 'No offline orders provided to sync.' });
    return;
  }

  const results: any[] = [];

  for (const offlineOrder of orders) {
    try {
      // Simulate standard create order request
      const fakeReq: any = {
        body: offlineOrder,
        user: req.user,
        ip: req.ip
      };

      // Check if already synced by offline_id
      const pool = getPool();
      let alreadyExists = false;

      if (offlineOrder.offline_id) {
        if (pool && !isFallbackActive()) {
          const [chk]: any = await pool.query('SELECT bill_number FROM orders WHERE offline_id = ?', [offlineOrder.offline_id]);
          if (chk.length > 0) {
            results.push({ offline_id: offlineOrder.offline_id, status: 'already_synced', bill_number: chk[0].bill_number });
            alreadyExists = true;
          }
        } else {
          const chk = fallbackStore.orders.find(o => o.offline_id === offlineOrder.offline_id);
          if (chk) {
            results.push({ offline_id: offlineOrder.offline_id, status: 'already_synced', bill_number: chk.bill_number });
            alreadyExists = true;
          }
        }
      }

      if (!alreadyExists) {
        // Create order
        let createdBill = '';
        if (pool && !isFallbackActive()) {
          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();
            const { billNumber, tokenNumber } = await generateBillNumber(conn);
            const totals = calculateOrderTotals(offlineOrder.items);

            const [res]: any = await conn.query(
              `INSERT INTO orders 
               (bill_number, order_date, customer_name, customer_type, token_number, subtotal, discount_amount, tax_amount, grand_total, payment_method, payment_status, order_status, notes, offline_id, is_synced)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'completed', ?, ?, 1)`,
              [
                billNumber,
                offlineOrder.order_date ? new Date(offlineOrder.order_date) : new Date(),
                offlineOrder.customer_name || 'Offline Student/Staff',
                offlineOrder.customer_type || 'student',
                tokenNumber,
                totals.subtotal,
                totals.discountAmount,
                totals.taxAmount,
                totals.grandTotal,
                offlineOrder.payment_method || 'cash',
                offlineOrder.notes || null,
                offlineOrder.offline_id
              ]
            );

            for (const item of offlineOrder.items) {
              await conn.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [res.insertId, item.product_id || null, item.product_name, item.quantity, item.unit_price, item.unit_cost || 0, item.quantity * item.unit_price]
              );
            }

            await conn.commit();
            createdBill = billNumber;
          } catch (e) {
            await conn.rollback();
            throw e;
          } finally {
            conn.release();
          }
        } else {
          const { billNumber, tokenNumber } = await generateBillNumber(null);
          const totals = calculateOrderTotals(offlineOrder.items);
          const newId = fallbackStore.orders.length + 1;

          fallbackStore.orders.push({
            id: newId,
            bill_number: billNumber,
            order_date: offlineOrder.order_date || new Date().toISOString(),
            customer_name: offlineOrder.customer_name || 'Offline Customer',
            customer_type: offlineOrder.customer_type || 'student',
            token_number: tokenNumber,
            subtotal: totals.subtotal,
            discount_amount: totals.discountAmount,
            tax_amount: totals.taxAmount,
            grand_total: totals.grandTotal,
            payment_method: offlineOrder.payment_method || 'cash',
            payment_status: 'paid',
            order_status: 'completed',
            offline_id: offlineOrder.offline_id,
            is_synced: 1
          });
          createdBill = billNumber;
        }

        results.push({ offline_id: offlineOrder.offline_id, status: 'synced', bill_number: createdBill });
      }
    } catch (err: any) {
      results.push({ offline_id: offlineOrder.offline_id, status: 'error', error: err.message });
    }
  }

  res.json({
    success: true,
    message: `Synchronized ${results.filter(r => r.status === 'synced').length} orders.`,
    results
  });
}
