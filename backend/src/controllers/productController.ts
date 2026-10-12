import { Request, Response } from 'express';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { roundTo2Decimals } from '../utils/calculations.js';
import { logAuditEvent } from '../utils/audit.js';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { category_id, search, available_only } = req.query;

  try {
    const pool = getPool();
    let products: any[] = [];

    if (pool && !isFallbackActive()) {
      let query = `
        SELECT p.*, c.name as category_name, c.color as category_color
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (category_id) {
        query += ' AND p.category_id = ?';
        params.push(Number(category_id));
      }

      if (available_only === '1' || available_only === 'true') {
        query += ' AND p.is_available = 1';
      }

      if (search && typeof search === 'string' && search.trim()) {
        query += ' AND (p.name LIKE ? OR p.local_name LIKE ? OR p.code LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      query += ' ORDER BY c.display_order ASC, p.name ASC';

      const [rows]: any = await pool.query(query, params);
      products = rows;
    } else {
      products = fallbackStore.products.map(p => {
        const cat = fallbackStore.categories.find(c => c.id === p.category_id);
        return {
          ...p,
          category_name: cat?.name || 'General',
          category_color: cat?.color || '#166534'
        };
      });

      if (category_id) {
        products = products.filter(p => p.category_id === Number(category_id));
      }
      if (available_only === '1' || available_only === 'true') {
        products = products.filter(p => p.is_available);
      }
      if (search && typeof search === 'string' && search.trim()) {
        const s = search.toLowerCase().trim();
        products = products.filter(
          p =>
            p.name.toLowerCase().includes(s) ||
            (p.local_name && p.local_name.toLowerCase().includes(s)) ||
            (p.code && p.code.toLowerCase().includes(s))
        );
      }
    }

    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { category_id, name, local_name, code, selling_price, cost_price, food_type, preparation_time_mins, is_available, image_url } = req.body;

  if (!category_id || !name || selling_price === undefined) {
    res.status(400).json({ success: false, message: 'Category, product name and selling price are required.' });
    return;
  }

  const sPrice = roundTo2Decimals(Number(selling_price));
  const cPrice = roundTo2Decimals(Number(cost_price || 0));
  const fType = ['veg', 'non-veg', 'beverage'].includes(food_type) ? food_type : 'veg';
  const prep = parseInt(preparation_time_mins || '5', 10);
  const avail = is_available !== false ? 1 : 0;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      const [result]: any = await pool.query(
        `INSERT INTO products 
         (category_id, name, local_name, code, selling_price, cost_price, food_type, preparation_time_mins, is_available, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [category_id, name.trim(), local_name || null, code || null, sPrice, cPrice, fType, prep, avail, image_url || null]
      );
      await logAuditEvent(req.user?.id || null, 'CREATE_PRODUCT', 'product', String(result.insertId), { name, sPrice }, req.ip);
      res.status(201).json({ success: true, message: 'Product created.', id: result.insertId });
    } else {
      const newProd = {
        id: fallbackStore.products.length + 1,
        category_id: Number(category_id),
        name: name.trim(),
        local_name: local_name || null,
        code: code || `P${fallbackStore.products.length + 1}`,
        selling_price: sPrice,
        cost_price: cPrice,
        food_type: fType,
        preparation_time_mins: prep,
        is_available: avail,
        image_url: image_url || null
      };
      fallbackStore.products.push(newProd);
      res.status(201).json({ success: true, message: 'Product created.', id: newProd.id });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { category_id, name, local_name, code, selling_price, cost_price, food_type, preparation_time_mins, is_available, image_url } = req.body;

  const sPrice = roundTo2Decimals(Number(selling_price));
  const cPrice = roundTo2Decimals(Number(cost_price || 0));

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      await pool.query(
        `UPDATE products SET 
         category_id = ?, name = ?, local_name = ?, code = ?, selling_price = ?, cost_price = ?, 
         food_type = ?, preparation_time_mins = ?, is_available = ?, image_url = ?
         WHERE id = ?`,
        [category_id, name, local_name || null, code || null, sPrice, cPrice, food_type || 'veg', preparation_time_mins || 5, is_available ? 1 : 0, image_url || null, id]
      );
    } else {
      const p = fallbackStore.products.find(x => x.id === Number(id));
      if (p) {
        p.category_id = Number(category_id);
        p.name = name;
        p.local_name = local_name || null;
        p.code = code || p.code;
        p.selling_price = sPrice;
        p.cost_price = cPrice;
        p.food_type = food_type || p.food_type;
        p.preparation_time_mins = preparation_time_mins || p.preparation_time_mins;
        p.is_available = is_available ? 1 : 0;
        p.image_url = image_url || p.image_url;
      }
    }

    await logAuditEvent(req.user?.id || null, 'UPDATE_PRODUCT', 'product', String(id), { name, sPrice, cPrice }, req.ip);
    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
}

export async function toggleProductStock(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const pool = getPool();
    let newStatus = 1;

    if (pool && !isFallbackActive()) {
      const [rows]: any = await pool.query('SELECT is_available FROM products WHERE id = ?', [id]);
      if (rows.length === 0) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }
      newStatus = rows[0].is_available ? 0 : 1;
      await pool.query('UPDATE products SET is_available = ? WHERE id = ?', [newStatus, id]);
    } else {
      const p = fallbackStore.products.find(x => x.id === Number(id));
      if (!p) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }
      p.is_available = p.is_available ? 0 : 1;
      newStatus = p.is_available;
    }

    res.json({ success: true, message: `Product stock marked as ${newStatus ? 'Available' : 'Sold Out'}.`, is_available: !!newStatus });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to toggle product status.' });
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      await pool.query('DELETE FROM products WHERE id = ?', [id]);
    } else {
      fallbackStore.products = fallbackStore.products.filter(p => p.id !== Number(id));
    }

    await logAuditEvent(req.user?.id || null, 'DELETE_PRODUCT', 'product', String(id), null, req.ip);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
}
