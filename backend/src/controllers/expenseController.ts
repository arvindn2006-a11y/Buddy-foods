import { Request, Response } from 'express';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { roundTo2Decimals } from '../utils/calculations.js';
import { logAuditEvent } from '../utils/audit.js';

export async function getExpenses(req: Request, res: Response): Promise<void> {
  const { startDate, endDate, category } = req.query;

  try {
    const pool = getPool();
    let expenses: any[] = [];

    if (pool && !isFallbackActive()) {
      let query = `
        SELECT e.*, u.full_name as created_by_name
        FROM expenses e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (startDate) {
        query += ' AND e.expense_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND e.expense_date <= ?';
        params.push(endDate);
      }
      if (category && category !== 'all') {
        query += ' AND e.category = ?';
        params.push(category);
      }

      query += ' ORDER BY e.expense_date DESC, e.id DESC';

      const [rows]: any = await pool.query(query, params);
      expenses = rows;
    } else {
      expenses = [...fallbackStore.expenses];

      if (startDate) expenses = expenses.filter(e => e.expense_date >= String(startDate));
      if (endDate) expenses = expenses.filter(e => e.expense_date <= String(endDate));
      if (category && category !== 'all') expenses = expenses.filter(e => e.category === category);

      expenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
    }

    const totalAmount = roundTo2Decimals(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0));

    res.json({
      success: true,
      data: expenses,
      totalAmount
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve expenses.' });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { category, title, amount, expense_date, paid_to, payment_method, receipt_number, notes } = req.body;

  if (!title || !amount || !expense_date) {
    res.status(400).json({ success: false, message: 'Title, amount and expense date are required.' });
    return;
  }

  const parsedAmount = roundTo2Decimals(Number(amount));
  const validCat = ['groceries', 'dairy', 'gas_fuel', 'disposables', 'wages', 'maintenance', 'other'].includes(category)
    ? category
    : 'groceries';
  const payMethod = ['cash', 'upi', 'bank'].includes(payment_method) ? payment_method : 'cash';
  const createdBy = req.user?.id || null;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      const [result]: any = await pool.query(
        `INSERT INTO expenses (category, title, amount, expense_date, paid_to, payment_method, receipt_number, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [validCat, title.trim(), parsedAmount, expense_date, paid_to || null, payMethod, receipt_number || null, notes || null, createdBy]
      );

      await logAuditEvent(createdBy, 'CREATE_EXPENSE', 'expense', String(result.insertId), { title, parsedAmount }, req.ip);
      res.status(201).json({ success: true, message: 'Expense recorded.', id: result.insertId });
    } else {
      const newExp = {
        id: fallbackStore.expenses.length + 1,
        category: validCat,
        title: title.trim(),
        amount: parsedAmount,
        expense_date,
        paid_to: paid_to || null,
        payment_method: payMethod,
        receipt_number: receipt_number || null,
        notes: notes || null,
        created_by: createdBy
      };
      fallbackStore.expenses.push(newExp);
      res.status(201).json({ success: true, message: 'Expense recorded.', id: newExp.id });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to record expense.' });
  }
}

export async function updateExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { category, title, amount, expense_date, paid_to, payment_method, receipt_number, notes } = req.body;

  const parsedAmount = roundTo2Decimals(Number(amount));

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      await pool.query(
        `UPDATE expenses SET 
         category = ?, title = ?, amount = ?, expense_date = ?, paid_to = ?, payment_method = ?, receipt_number = ?, notes = ?
         WHERE id = ?`,
        [category, title, parsedAmount, expense_date, paid_to || null, payment_method || 'cash', receipt_number || null, notes || null, id]
      );
    } else {
      const exp = fallbackStore.expenses.find(e => e.id === Number(id));
      if (exp) {
        exp.category = category;
        exp.title = title;
        exp.amount = parsedAmount;
        exp.expense_date = expense_date;
        exp.paid_to = paid_to;
        exp.payment_method = payment_method;
        exp.receipt_number = receipt_number;
        exp.notes = notes;
      }
    }

    res.json({ success: true, message: 'Expense updated.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update expense.' });
  }
}

export async function deleteExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
    } else {
      fallbackStore.expenses = fallbackStore.expenses.filter(e => e.id !== Number(id));
    }

    await logAuditEvent(req.user?.id || null, 'DELETE_EXPENSE', 'expense', String(id), null, req.ip);
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete expense.' });
  }
}
