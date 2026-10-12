import { Request, Response } from 'express';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../utils/audit.js';

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    let categories: any[] = [];

    if (pool && !isFallbackActive()) {
      const [rows]: any = await pool.query(
        'SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC'
      );
      categories = rows;
    } else {
      categories = fallbackStore.categories
        .filter(c => c.is_active)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }

    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, local_name, icon, color, display_order } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ success: false, message: 'Category name is required.' });
    return;
  }

  try {
    const pool = getPool();
    const orderNum = parseInt(display_order || '0', 10);
    const categoryIcon = icon || 'Utensils';
    const categoryColor = color || '#166534';

    if (pool && !isFallbackActive()) {
      const [result]: any = await pool.query(
        'INSERT INTO categories (name, local_name, icon, color, display_order) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), local_name || null, categoryIcon, categoryColor, orderNum]
      );
      await logAuditEvent(req.user?.id || null, 'CREATE_CATEGORY', 'category', String(result.insertId), { name }, req.ip);
      res.status(201).json({ success: true, message: 'Category created.', id: result.insertId });
    } else {
      const newCat = {
        id: fallbackStore.categories.length + 1,
        name: name.trim(),
        local_name: local_name || null,
        icon: categoryIcon,
        color: categoryColor,
        display_order: orderNum,
        is_active: 1
      };
      fallbackStore.categories.push(newCat);
      res.status(201).json({ success: true, message: 'Category created.', id: newCat.id });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, local_name, icon, color, display_order, is_active } = req.body;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      await pool.query(
        'UPDATE categories SET name = ?, local_name = ?, icon = ?, color = ?, display_order = ?, is_active = ? WHERE id = ?',
        [name, local_name || null, icon || 'Utensils', color || '#166534', display_order || 0, is_active !== false ? 1 : 0, id]
      );
    } else {
      const cat = fallbackStore.categories.find(c => c.id === Number(id));
      if (cat) {
        cat.name = name;
        cat.local_name = local_name || null;
        cat.icon = icon || cat.icon;
        cat.color = color || cat.color;
        cat.display_order = display_order !== undefined ? display_order : cat.display_order;
        cat.is_active = is_active !== false ? 1 : 0;
      }
    }

    res.json({ success: true, message: 'Category updated.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      // Check if products exist in category
      const [prods]: any = await pool.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
      if (prods[0].count > 0) {
        // Soft delete
        await pool.query('UPDATE categories SET is_active = 0 WHERE id = ?', [id]);
      } else {
        await pool.query('DELETE FROM categories WHERE id = ?', [id]);
      }
    } else {
      const cat = fallbackStore.categories.find(c => c.id === Number(id));
      if (cat) cat.is_active = 0;
    }

    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
}
