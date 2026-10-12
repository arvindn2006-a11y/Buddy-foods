import { Request, Response } from 'express';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { seedDefaultData, seedFallbackStore } from '../database/init.js';
import { logAuditEvent } from '../utils/audit.js';

export async function exportDatabaseBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const pool = getPool();
    let backupData: any = {};

    if (pool && !isFallbackActive()) {
      const [categories]: any = await pool.query('SELECT * FROM categories');
      const [products]: any = await pool.query('SELECT * FROM products');
      const [orders]: any = await pool.query('SELECT * FROM orders');
      const [order_items]: any = await pool.query('SELECT * FROM order_items');
      const [payments]: any = await pool.query('SELECT * FROM payments');
      const [expenses]: any = await pool.query('SELECT * FROM expenses');
      const [settings]: any = await pool.query('SELECT * FROM business_settings');

      backupData = {
        app: 'Suvai Canteen System',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        categories,
        products,
        orders,
        order_items,
        payments,
        expenses,
        settings
      };
    } else {
      backupData = {
        app: 'Suvai Canteen System',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        categories: fallbackStore.categories,
        products: fallbackStore.products,
        orders: fallbackStore.orders,
        order_items: fallbackStore.order_items,
        payments: fallbackStore.payments,
        expenses: fallbackStore.expenses,
        settings: fallbackStore.business_settings
      };
    }

    const filename = `suvai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate backup export.' });
  }
}

export async function restoreDatabaseBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { data } = req.body;

  if (!data || typeof data !== 'object' || data.app !== 'Suvai Canteen System') {
    res.status(400).json({ success: false, message: 'Invalid Suvai backup file payload.' });
    return;
  }

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // If categories provided, replace
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          for (const c of data.categories) {
            await conn.query(
              `INSERT INTO categories (id, name, local_name, icon, color, display_order, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), local_name=VALUES(local_name), icon=VALUES(icon), color=VALUES(color)`,
              [c.id, c.name, c.local_name, c.icon, c.color, c.display_order, c.is_active]
            );
          }
        }

        // If products provided, replace
        if (Array.isArray(data.products) && data.products.length > 0) {
          for (const p of data.products) {
            await conn.query(
              `INSERT INTO products (id, category_id, name, local_name, code, selling_price, cost_price, food_type, preparation_time_mins, is_available)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), selling_price=VALUES(selling_price), cost_price=VALUES(cost_price)`,
              [p.id, p.category_id, p.name, p.local_name, p.code, p.selling_price, p.cost_price, p.food_type, p.preparation_time_mins, p.is_available]
            );
          }
        }

        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    } else {
      if (Array.isArray(data.categories)) fallbackStore.categories = data.categories;
      if (Array.isArray(data.products)) fallbackStore.products = data.products;
      if (Array.isArray(data.orders)) fallbackStore.orders = data.orders;
      if (Array.isArray(data.order_items)) fallbackStore.order_items = data.order_items;
      if (Array.isArray(data.expenses)) fallbackStore.expenses = data.expenses;
      if (data.settings) fallbackStore.business_settings = data.settings;
    }

    await logAuditEvent(req.user?.id || null, 'RESTORE_BACKUP', 'system', null, null, req.ip);
    res.json({ success: true, message: 'Database backup successfully restored.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to restore database backup.' });
  }
}

export async function resetDemoData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      await seedDefaultData();
    } else {
      await seedFallbackStore();
    }

    await logAuditEvent(req.user?.id || null, 'RESET_DEMO', 'system', null, null, req.ip);
    res.json({ success: true, message: 'Default canteen data refreshed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reset demo data.' });
  }
}
