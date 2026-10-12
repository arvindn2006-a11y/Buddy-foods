import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ShoppingBag,
  Percent,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { settings } = useSettings();
  const [periodPreset, setPeriodPreset] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currency = settings.currency_symbol || '₹';

  // Calculate dates based on preset
  useEffect(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    if (periodPreset === 'today') {
      const d = formatDate(today);
      setStartDate(d);
      setEndDate(d);
    } else if (periodPreset === 'yesterday') {
      const yesterday = new Date(today.getTime() - 86400000);
      const d = formatDate(yesterday);
      setStartDate(d);
      setEndDate(d);
    } else if (periodPreset === '7days') {
      const prior = new Date(today.getTime() - 7 * 86400000);
      setStartDate(formatDate(prior));
      setEndDate(formatDate(today));
    } else if (periodPreset === '30days') {
      const prior = new Date(today.getTime() - 30 * 86400000);
      setStartDate(formatDate(prior));
      setEndDate(formatDate(today));
    }
  }, [periodPreset]);

  const loadReport = async () => {
    if (!startDate || !endDate) return;
    setIsLoading(true);
    try {
      const res = await api.getAnalytics({ startDate, endDate });
      if (res.success) {
        setData(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load report analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      loadReport();
    }
  }, [startDate, endDate]);

  const metrics = data?.metrics || {};
  const grossSales = Number(metrics.gross_sales || 0);
  const ingredientCost = Number(metrics.ingredient_cost || 0);
  const operatingExpenses = Number(metrics.operating_expenses || 0);
  const grossProfit = Number(metrics.gross_profit || 0);
  const netProfit = Number(metrics.net_profit || 0);
  const profitMargin = Number(metrics.profit_margin || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Financial & Profit/Loss Reports</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real database-backed analytics with strict formula calculations and CSV exports.
          </p>
        </div>

        {/* CSV Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.exportCsvUrl('sales', startDate, endDate)}
            download
            className="px-4 py-2.5 bg-cream-100 hover:bg-cream-200 text-stone-800 text-xs font-bold rounded-xl border border-cream-200 flex items-center space-x-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-suvai-green-800" />
            <span>Export Sales CSV</span>
          </a>

          <a
            href={api.exportCsvUrl('expenses', startDate, endDate)}
            download
            className="px-4 py-2.5 bg-cream-100 hover:bg-cream-200 text-stone-800 text-xs font-bold rounded-xl border border-cream-200 flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-rose-700" />
            <span>Export Expenses CSV</span>
          </a>
        </div>
      </div>

      {/* Date Presets Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-xs flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'custom', label: 'Custom Range' }
          ].map(preset => (
            <button
              key={preset.id}
              onClick={() => setPeriodPreset(preset.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                periodPreset === preset.id
                  ? 'bg-suvai-green-900 text-white shadow-xs'
                  : 'bg-cream-50 text-stone-700 hover:bg-cream-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-xs text-stone-600">
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPeriodPreset('custom'); }}
            className="px-2.5 py-1.5 bg-cream-50 border border-cream-200 rounded-xl text-xs font-medium"
          />
          <span className="text-stone-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPeriodPreset('custom'); }}
            className="px-2.5 py-1.5 bg-cream-50 border border-cream-200 rounded-xl text-xs font-medium"
          />
        </div>
      </div>

      {/* Profit & Loss Comprehensive Statement Card */}
      <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-cream-200">
          <div>
            <h3 className="font-black text-base text-stone-900">Estimated Profit & Loss Breakdown</h3>
            <p className="text-xs text-stone-500">
              Formula: <code className="bg-cream-100 text-suvai-green-950 font-bold px-1.5 py-0.5 rounded">Net Profit = Sales - Ingredient Cost - Operating Expenses</code>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-stone-500 uppercase">Period Order Volume</span>
            <p className="text-lg font-black text-stone-900">{metrics.order_count || 0} Bills</p>
          </div>
        </div>

        {/* Financial Flow Line Items */}
        <div className="space-y-3 text-xs max-w-3xl">
          <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-cream-50">
            <div>
              <span className="font-extrabold text-stone-900 text-sm">1. Gross Sales Revenue</span>
              <span className="text-[11px] text-stone-500 block">Total verified food sales receipts</span>
            </div>
            <span className="font-black text-stone-900 text-base">{currency}{grossSales.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-stone-50 text-stone-700">
            <div>
              <span className="font-bold text-stone-800">2. Less: Cost of Goods Sold (COGS)</span>
              <span className="text-[11px] text-stone-500 block">Total raw ingredients used in sold items</span>
            </div>
            <span className="font-black text-stone-800 text-sm">-{currency}{ingredientCost.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-emerald-50 text-emerald-950 font-bold border border-emerald-200">
            <span>= Gross Profit (Sales - COGS)</span>
            <span className="font-black text-emerald-800 text-sm">{currency}{grossProfit.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-rose-50/50 text-rose-900">
            <div>
              <span className="font-bold text-rose-950">3. Less: Operating Expenses</span>
              <span className="text-[11px] text-rose-700 block">Groceries, dairy procurement, gas cylinders & wages</span>
            </div>
            <span className="font-black text-rose-700 text-sm">-{currency}{operatingExpenses.toFixed(2)}</span>
          </div>

          {/* Grand Net Profit Final Row */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-gradient-to-r from-suvai-green-950 to-suvai-green-900 text-white shadow-md">
            <div>
              <span className="text-xs font-bold text-suvai-orange-300 uppercase tracking-widest block">
                ESTIMATED NET PROFIT
              </span>
              <span className="text-[11px] text-cream-200">
                Net Profit Margin: <strong className="text-emerald-300">{profitMargin}%</strong>
              </span>
            </div>
            <span className="text-2xl font-black text-white">
              {currency}{netProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Top 10 Bestselling Food Items & Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-cream-200 mb-4">
              <ShoppingBag className="w-5 h-5 text-suvai-green-900" />
              <h3 className="font-black text-base text-stone-900">Top 10 Bestselling Food Items</h3>
            </div>

            <div className="space-y-2.5">
              {data?.top_items && data.top_items.length > 0 ? (
                data.top_items.map((item: any, idx: number) => {
                  const maxQty = Math.max(...data.top_items.map((i: any) => Number(i.total_quantity || 1)));
                  const pct = Math.min(100, Math.round((Number(item.total_quantity) / maxQty) * 100));

                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-stone-800">
                        <span>
                          <strong className="text-suvai-orange-600 mr-1.5">#{idx + 1}</strong>
                          {item.product_name}
                        </span>
                        <span>{item.total_quantity} sold ({currency}{Number(item.total_revenue).toFixed(2)})</span>
                      </div>
                      <div className="w-full bg-cream-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-suvai-green-800 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-stone-400 italic text-xs py-8 text-center">
                  No sales recorded for this date period.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-cream-200 mb-4">
              <PieChart className="w-5 h-5 text-suvai-orange-600" />
              <h3 className="font-black text-base text-stone-900">Payment Breakdown</h3>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">Total Cash Collected</span>
                  <span className="text-[11px] text-emerald-700">Hard cash tendered at POS</span>
                </div>
                <span className="text-xl font-black text-emerald-800">
                  {currency}{Number(metrics.cash_total || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-blue-900 block">Total UPI Received</span>
                  <span className="text-[11px] text-blue-700">QR code mobile payments</span>
                </div>
                <span className="text-xl font-black text-blue-800">
                  {currency}{Number(metrics.upi_total || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-amber-900 block">Refunds & Cancelled Deductions</span>
                  <span className="text-[11px] text-amber-700">Voided bills</span>
                </div>
                <span className="text-xl font-black text-amber-800">
                  {currency}{Number(metrics.refunds_total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-stone-400 text-center mt-6">
            All reports strictly adhere to the business timezone: <strong>{settings.timezone || 'Asia/Kolkata'}</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
