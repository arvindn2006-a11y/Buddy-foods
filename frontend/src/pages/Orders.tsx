import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { Order } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  Search,
  Calendar,
  Filter,
  Eye,
  Ban,
  Printer,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertOctagon,
  X,
  AlertCircle
} from 'lucide-react';

export const Orders: React.FC = () => {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Modals
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const currency = settings.currency_symbol || '₹';

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOrders({
        page,
        limit: 25,
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status || undefined,
        payment_method: paymentMethod || undefined
      });

      if (res.success) {
        setOrders(res.data);
        if (res.pagination) {
          setTotalOrders(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err: any) {
      setActionMessage({ text: 'Failed to load order history: ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, status, paymentMethod]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleOpenReceipt = async (orderSummary: Order) => {
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

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder || !cancellationReason.trim()) return;

    try {
      const res = await api.cancelOrder(cancelModalOrder.id, { cancellation_reason: cancellationReason });
      if (res.success) {
        setActionMessage({ text: `Order #${cancelModalOrder.bill_number} cancelled and refund recorded.`, type: 'success' });
        setCancelModalOrder(null);
        setCancellationReason('');
        loadOrders();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to cancel order', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Order & Transaction History</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Searchable log of canteen receipts, thermal re-prints, and refund tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-stone-500">
            Total Logged: <strong className="text-stone-900">{totalOrders}</strong>
          </span>
          <button
            onClick={loadOrders}
            className="p-2.5 bg-cream-100 hover:bg-cream-200 text-stone-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-cream-200 shadow-xs flex flex-wrap gap-3 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Bill No or Customer..."
            className="w-full pl-9 pr-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-suvai-green-700"
          />
        </div>

        {/* Date Filters */}
        <div className="flex items-center space-x-1.5 text-xs text-stone-600">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium"
          />
          <span className="text-stone-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium"
          />
        </div>

        {/* Payment Filter */}
        <select
          value={paymentMethod}
          onChange={e => { setPaymentMethod(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium text-stone-700"
        >
          <option value="">All Payments</option>
          <option value="cash">Cash Only</option>
          <option value="upi">UPI Pay Only</option>
          <option value="card">Card / Other</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-cream-50/50 border border-cream-200 rounded-xl text-xs font-medium text-stone-700"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-suvai-green-900 text-white rounded-xl text-xs font-bold hover:bg-suvai-green-800 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Orders List & Table */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden">
        {/* Mobile / Tablet Cards View */}
        <div className="block md:hidden divide-y divide-cream-100">
          {isLoading ? (
            <div className="py-12 text-center text-stone-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-suvai-green-800" />
              <span>Loading transactions...</span>
            </div>
          ) : orders.length > 0 ? (
            orders.map(order => {
              const dateObj = new Date(order.order_date);
              return (
                <div key={order.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-xl bg-suvai-green-100 text-suvai-green-900 font-black text-sm flex items-center justify-center">
                        #{order.token_number || '-'}
                      </span>
                      <div>
                        <p className="font-mono font-bold text-xs text-stone-900">{order.bill_number}</p>
                        <p className="text-[10px] text-stone-400">
                          {dateObj.toLocaleDateString('en-IN')} {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-sm text-suvai-green-950">
                        {currency}{Number(order.grand_total).toFixed(2)}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        order.payment_method === 'upi' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {order.payment_method}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-stone-600 font-medium">{order.customer_name}</span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenReceipt(order)}
                        className="px-3 py-1.5 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Printer className="w-3.5 h-3.5 text-suvai-orange-400" />
                        <span>Print Receipt</span>
                      </button>

                      {order.order_status === 'completed' && (
                        <button
                          onClick={() => setCancelModalOrder(order)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Cancel Order"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-stone-400 italic">
              No orders match your filter criteria.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-200 text-stone-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Token</th>
                <th className="py-3.5 px-4 font-bold">Bill Number</th>
                <th className="py-3.5 px-4 font-bold">Date & Time</th>
                <th className="py-3.5 px-4 font-bold">Customer</th>
                <th className="py-3.5 px-4 font-bold">Payment</th>
                <th className="py-3.5 px-4 font-bold text-right">Grand Total</th>
                <th className="py-3.5 px-4 font-bold text-center">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-suvai-green-800" />
                    <span>Loading transactions...</span>
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map(order => {
                  const dateObj = new Date(order.order_date);
                  return (
                    <tr key={order.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4 font-black text-suvai-green-900 text-sm">
                        #{order.token_number || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {order.bill_number}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        <div>{dateObj.toLocaleDateString('en-IN')}</div>
                        <div className="text-[10px] text-stone-400">{dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-800">
                        <div>{order.customer_name}</div>
                        <span className="text-[10px] text-stone-400 uppercase font-semibold">{order.customer_type}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          order.payment_method === 'upi'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-stone-900 text-right text-sm">
                        {currency}{Number(order.grand_total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.order_status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {order.order_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenReceipt(order)}
                            className="px-2.5 py-1.5 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                            title="Preview & Reprint Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-suvai-orange-400" />
                            <span>Print</span>
                          </button>
                          {order.order_status === 'completed' && (
                            <button
                              onClick={() => setCancelModalOrder(order)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel & Refund Order"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 italic">
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-cream-200 flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Page {page} of {totalPages}</span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-cream-200 bg-white hover:bg-cream-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-cream-200 bg-white hover:bg-cream-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Reason Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-cream-200">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Cancel Order #{cancelModalOrder.bill_number}</h3>
              </div>
              <button onClick={() => setCancelModalOrder(null)} className="p-1 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <p className="font-bold">Refund Amount: {currency}{Number(cancelModalOrder.grand_total).toFixed(2)}</p>
                <p className="text-[11px] mt-0.5">This action will mark the bill as cancelled and log a refund audit entry.</p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="e.g., Customer ordered wrong item / token voided / kitchen out of stock"
                  className="w-full px-3 py-2 bg-cream-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-rose-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 bg-cream-100 font-semibold"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-rose-700 hover:bg-rose-800 font-bold shadow-xs"
                >
                  Confirm Cancellation & Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal for Reprinting */}
      <ReceiptModal
        order={selectedReceiptOrder}
        settings={settings}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
