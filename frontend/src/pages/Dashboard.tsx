import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { DashboardData, Order } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  TrendingUp,
  ShoppingBag,
  Banknote,
  QrCode,
  AlertOctagon,
  TrendingDown,
  CircleDollarSign,
  Receipt,
  PlusCircle,
  Eye,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { settings } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const currency = settings.currency_symbol || '₹';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReceipt = async (orderSummary: Order) => {
    try {
      const res = await api.getOrderById(orderSummary.id);
      if (res.success && res.data) {
        setSelectedReceiptOrder(res.data);
      } else {
        setSelectedReceiptOrder(orderSummary);
      }
    } catch {
      setSelectedReceiptOrder(orderSummary);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-suvai-green-800 animate-spin" />
        <p className="text-sm font-semibold text-stone-600">Loading today's canteen metrics...</p>
      </div>
    );
  }

  const grossSales = data?.gross_sales || 0;
  const orderCount = data?.completed_orders_count || 0;
  const cashTotal = data?.cash_collections || 0;
  const upiTotal = data?.upi_collections || 0;
  const refundsTotal = data?.refunds_amount || 0;
  const cancelledCount = data?.cancelled_orders_count || 0;
  const expensesTotal = data?.operating_expenses || 0;
  const netProfit = data?.estimated_net_profit || 0;
  const profitMargin = data?.profit_margin_percentage || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-suvai-green-950 via-suvai-green-900 to-suvai-green-800 p-6 rounded-3xl text-white shadow-xl shadow-suvai-green-950/15">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-suvai-green-800/80 text-suvai-orange-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Today's Live Counters</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Today's Sales & Canteen Overview</h2>
          <p className="text-xs text-cream-200 mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('pos')}
            className="px-5 py-3 bg-suvai-orange-600 hover:bg-suvai-orange-500 active:scale-95 text-white text-xs font-extrabold rounded-2xl shadow-md flex items-center space-x-2 transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>Open POS (New Bill)</span>
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="px-4 py-3 bg-suvai-green-800 hover:bg-suvai-green-700 active:scale-95 text-cream-100 text-xs font-bold rounded-2xl border border-suvai-green-700 flex items-center space-x-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4 text-suvai-orange-300" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-3 bg-suvai-green-800/80 hover:bg-suvai-green-700 text-white rounded-2xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Gross Sales</span>
            <div className="p-2.5 rounded-xl bg-suvai-green-50 text-suvai-green-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-3">
            {currency}{grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            From <span className="font-bold text-suvai-green-900">{orderCount}</span> completed orders
          </p>
        </div>

        {/* Cash vs UPI Collections */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cash vs UPI</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block">Cash</span>
              <span className="text-lg font-black text-emerald-800">{currency}{cashTotal.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-stone-400 block">UPI Pay</span>
              <span className="text-lg font-black text-blue-700">{currency}{upiTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-2 w-full bg-stone-100 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-emerald-600 h-full"
              style={{ width: `${grossSales > 0 ? (cashTotal / grossSales) * 100 : 50}%` }}
              title="Cash Share"
            />
            <div
              className="bg-blue-600 h-full"
              style={{ width: `${grossSales > 0 ? (upiTotal / grossSales) * 100 : 50}%` }}
              title="UPI Share"
            />
          </div>
        </div>

        {/* Recorded Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Operating Expenses</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-3">
            {currency}{expensesTotal.toFixed(2)}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Groceries, milk, fuel & daily wages
          </p>
        </div>

        {/* Estimated Net Profit (Formula backed) */}
        <div className="bg-gradient-to-br from-suvai-green-900 to-suvai-green-950 text-white p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-suvai-orange-300 uppercase tracking-wider">Estimated Net Profit</span>
            <div className="p-2.5 rounded-xl bg-suvai-green-800 text-suvai-orange-400">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            {currency}{netProfit.toFixed(2)}
          </p>
          <div className="flex items-center justify-between text-xs text-cream-200 mt-1">
            <span>Margin: <strong className="text-emerald-300">{profitMargin}%</strong></span>
            <span className="text-[10px] text-cream-400">Sales - COGS - Exp</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar: Refunds & Cancellations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-cream-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase">Completed Bills</p>
              <p className="text-lg font-black text-stone-900">{orderCount}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-suvai-green-800 hover:underline"
          >
            View Bills &rarr;
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-stone-100 text-stone-700 rounded-lg">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase">Cancelled / Voided</p>
              <p className="text-lg font-black text-stone-700">{cancelledCount}</p>
            </div>
          </div>
          <span className="text-xs text-stone-400">No Double-counting</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase">Refunds Processed</p>
              <p className="text-lg font-black text-rose-700">{currency}{refundsTotal.toFixed(2)}</p>
            </div>
          </div>
          <span className="text-xs text-stone-400">Excluded from Net</span>
        </div>
      </div>

      {/* Middle Section: Peak Hours & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Peak Break Analysis */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-suvai-green-800" />
              <h3 className="font-extrabold text-base text-stone-900">Peak Break Hours</h3>
            </div>
            <span className="text-xs font-semibold text-stone-400">Today</span>
          </div>

          <p className="text-xs text-stone-500 mb-4">
            Hourly canteen rush distribution helps staff prepare hot batches for morning & afternoon breaks.
          </p>

          <div className="flex-1 flex flex-col justify-end space-y-3">
            {data?.hourly_trend && data.hourly_trend.length > 0 ? (
              data.hourly_trend.map((hour) => {
                const hourFormatted = `${hour.order_hour > 12 ? hour.order_hour - 12 : hour.order_hour}:00 ${hour.order_hour >= 12 ? 'PM' : 'AM'}`;
                const maxSales = Math.max(...data.hourly_trend.map(h => Number(h.hourly_sales || 1)));
                const pct = Math.min(100, Math.round((Number(hour.hourly_sales) / maxSales) * 100));

                return (
                  <div key={hour.order_hour} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-stone-700">
                      <span>{hourFormatted}</span>
                      <span>{currency}{Number(hour.hourly_sales).toFixed(2)} ({hour.order_count} bills)</span>
                    </div>
                    <div className="w-full bg-cream-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-suvai-green-800 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-stone-400 text-xs">
                No orders registered yet today. Start billing to see rush hours!
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-base text-stone-900">Recent Transactions</h3>
              <p className="text-xs text-stone-500">Live feed of orders at the counter</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-suvai-green-900 hover:text-suvai-green-700 underline"
            >
              Full Order History
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cream-200 text-stone-500 uppercase tracking-wider">
                  <th className="pb-3 font-bold">Token</th>
                  <th className="pb-3 font-bold">Bill No</th>
                  <th className="pb-3 font-bold">Customer</th>
                  <th className="pb-3 font-bold">Payment</th>
                  <th className="pb-3 font-bold text-right">Amount</th>
                  <th className="pb-3 font-bold text-center">Status</th>
                  <th className="pb-3 font-bold text-right">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {data?.recent_orders && data.recent_orders.length > 0 ? (
                  data.recent_orders.map((order) => (
                    <tr key={order.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 font-black text-suvai-green-900">
                        #{order.token_number || '-'}
                      </td>
                      <td className="py-3 font-mono text-stone-700 font-medium">
                        {order.bill_number}
                      </td>
                      <td className="py-3 text-stone-800 font-medium truncate max-w-[120px]">
                        {order.customer_name}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          order.payment_method === 'upi'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="py-3 font-extrabold text-stone-900 text-right">
                        {currency}{Number(order.grand_total).toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.order_status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {order.order_status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => openReceipt(order)}
                          className="p-1.5 rounded-lg text-suvai-green-900 hover:bg-suvai-green-50 transition-colors"
                          title="Preview & Print Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-stone-400 italic">
                      No transactions recorded yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        settings={settings}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
