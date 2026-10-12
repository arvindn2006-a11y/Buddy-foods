import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { Expense, ExpenseCategory } from '../types';
import {
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  Receipt,
  Edit2,
  X,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { settings } = useSettings();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    category: 'groceries' as ExpenseCategory,
    title: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    paid_to: '',
    payment_method: 'cash' as 'cash' | 'upi' | 'bank',
    receipt_number: '',
    notes: ''
  });

  const currency = settings.currency_symbol || '₹';

  const categoryLabels: Record<ExpenseCategory, string> = {
    groceries: 'Groceries & Veg',
    dairy: 'Milk & Dairy',
    gas_fuel: 'Gas & Commercial Fuel',
    disposables: 'Packaging & Disposables',
    wages: 'Staff Daily Wages',
    maintenance: 'Kitchen Maintenance',
    other: 'Miscellaneous / Other'
  };

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await api.getExpenses({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined
      });
      if (res.success) {
        setExpenses(res.data);
        setTotalAmount(res.totalAmount || 0);
      }
    } catch (err: any) {
      setBannerMessage({ text: 'Failed to load expenses: ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, startDate, endDate]);

  const openNewExpenseModal = () => {
    setEditingExpense(null);
    setFormData({
      category: 'groceries',
      title: '',
      amount: '',
      expense_date: new Date().toISOString().slice(0, 10),
      paid_to: '',
      payment_method: 'cash',
      receipt_number: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditExpenseModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      category: exp.category,
      title: exp.title,
      amount: String(exp.amount),
      expense_date: exp.expense_date,
      paid_to: exp.paid_to || '',
      payment_method: exp.payment_method,
      receipt_number: exp.receipt_number || '',
      notes: exp.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, formData);
        setBannerMessage({ text: 'Expense entry updated successfully.', type: 'success' });
      } else {
        await api.createExpense(formData);
        setBannerMessage({ text: 'Expense recorded successfully.', type: 'success' });
      }
      setIsModalOpen(false);
      loadExpenses();
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.deleteExpense(id);
      setBannerMessage({ text: 'Expense record deleted.', type: 'success' });
      loadExpenses();
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Failed to delete expense', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Operating Expenses</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Record kitchen raw materials, dairy, gas cylinders, and staff wages for accurate net profit reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl text-right">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Period Expense</span>
            <span className="text-lg font-black text-rose-800">{currency}{totalAmount.toFixed(2)}</span>
          </div>

          <button
            onClick={openNewExpenseModal}
            className="px-5 py-3 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 text-white text-xs font-extrabold rounded-2xl shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
          bannerMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          <span>{bannerMessage.text}</span>
          <button onClick={() => setBannerMessage(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium text-stone-700"
          >
            <option value="all">All Expense Categories</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="flex items-center space-x-1 text-xs text-stone-600">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        <button
          onClick={loadExpenses}
          className="p-2 text-stone-600 hover:text-stone-900 bg-cream-100 hover:bg-cream-200 rounded-xl transition-colors"
          title="Reload Expenses"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Expenses Table Card */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-200 text-stone-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Date</th>
                <th className="py-3.5 px-4 font-bold">Expense Title & Notes</th>
                <th className="py-3.5 px-4 font-bold">Category</th>
                <th className="py-3.5 px-4 font-bold">Paid To</th>
                <th className="py-3.5 px-4 font-bold">Payment Mode</th>
                <th className="py-3.5 px-4 font-bold text-right">Amount</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-suvai-green-800" />
                    <span>Loading expenses...</span>
                  </td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-cream-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-700 whitespace-nowrap">
                      {new Date(exp.expense_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-stone-900">{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-stone-500 font-medium">{exp.notes}</div>
                      )}
                      {exp.receipt_number && (
                        <span className="text-[10px] text-stone-400 font-mono">Rcpt: {exp.receipt_number}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-stone-100 text-stone-700">
                        {categoryLabels[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-700">
                      {exp.paid_to || '-'}
                    </td>
                    <td className="py-3 px-4 font-bold uppercase text-[10px] text-stone-600">
                      {exp.payment_method}
                    </td>
                    <td className="py-3 px-4 font-black text-rose-700 text-right text-sm">
                      {currency}{Number(exp.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditExpenseModal(exp)}
                          className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-cream-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                    No operating expenses recorded for this date period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-cream-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="font-extrabold text-base text-stone-900">
                {editingExpense ? 'Edit Recorded Expense' : 'Record Canteen Operating Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Aavin Milk 20 Packets / Gas Cylinder Refill"
                  className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-suvai-green-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="1200"
                    className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-black text-rose-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={e => setFormData({ ...formData, payment_method: e.target.value as 'cash' | 'upi' | 'bank' })}
                    className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                  >
                    <option value="cash">Cash (From Drawer)</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Paid To / Vendor</label>
                  <input
                    type="text"
                    value={formData.paid_to}
                    onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                    placeholder="e.g., Wholesale Mandi"
                    className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Receipt / Invoice No</label>
                  <input
                    type="text"
                    value={formData.receipt_number}
                    onChange={e => setFormData({ ...formData, receipt_number: e.target.value })}
                    placeholder="e.g., INV-8491"
                    className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional expense notes..."
                  className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 bg-cream-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-suvai-green-900 font-bold"
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
