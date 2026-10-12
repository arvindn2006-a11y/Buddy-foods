import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { executeTestPrint } from '../services/printer';
import {
  Coins,
  Banknote,
  QrCode,
  Calendar,
  Printer,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const DailyEarnings: React.FC = () => {
  const { settings } = useSettings();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cash Drawer Reconciliation State
  const [startingFloat, setStartingFloat] = useState<string>('500');
  const [actualCashCounted, setActualCashCounted] = useState<string>('');
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const currency = settings.currency_symbol || '₹';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDailyEarnings(selectedDate);
      if (res.success) {
        setData(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load daily earnings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const floatAmount = parseFloat(startingFloat) || 0;
  const cashSales = data?.cash_sales || 0;
  const cashExpenses = data?.cash_expenses_paid || 0;
  const totalRefunds = data?.total_refunds || 0;

  // Expected Cash in Drawer = Starting Float + Cash Collected - Cash Expenses - Cash Refunds
  const expectedCashInDrawer = floatAmount + cashSales - cashExpenses - totalRefunds;

  const actualCount = parseFloat(actualCashCounted);
  const isCountEntered = !isNaN(actualCount) && actualCashCounted !== '';
  const difference = isCountEntered ? Math.round((actualCount - expectedCashInDrawer + Number.EPSILON) * 100) / 100 : 0;

  const handlePrintDailySlip = async () => {
    setPrintStatus('Transmitting daily summary slip to thermal printer...');
    try {
      const res = await executeTestPrint(settings);
      setPrintStatus(res.message);
    } catch (err: any) {
      setPrintStatus('Print failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Daily Earnings & Cash Drawer Tally
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Shift reconciliation: Reconcile physical cash drawer notes, petty cash expenses, and digital UPI sales.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-cream-50 px-3 py-1.5 rounded-xl border border-cream-200">
            <Calendar className="w-4 h-4 text-suvai-green-800" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-stone-800 bg-transparent focus:outline-hidden"
            />
          </div>

          <button
            onClick={loadData}
            className="p-2.5 bg-cream-100 hover:bg-cream-200 text-stone-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {printStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{printStatus}</span>
          <button onClick={() => setPrintStatus(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Main Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Gross Day Sales</span>
          <p className="text-2xl font-black text-stone-900 mt-2">
            {currency}{Number(data?.gross_sales || 0).toFixed(2)}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Across <strong>{data?.total_orders || 0}</strong> verified bills
          </p>
        </div>

        {/* Total Cash Inflow */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Cash Register Sales</span>
            <Banknote className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2">
            {currency}{Number(data?.cash_sales || 0).toFixed(2)}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Collected physically at counter
          </p>
        </div>

        {/* UPI Payments */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">UPI / QR Collections</span>
            <QrCode className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2">
            {currency}{Number(data?.upi_sales || 0).toFixed(2)}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Direct to bank via QR code
          </p>
        </div>
      </div>

      {/* Cash Drawer Reconciliation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-cream-200">
            <Coins className="w-5 h-5 text-suvai-green-900" />
            <h3 className="font-extrabold text-base text-stone-900">Physical Cash Drawer Reconciliation</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Float input */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-cream-50 border border-cream-200">
              <div>
                <span className="font-bold text-stone-800 block">Starting Morning Cash Float</span>
                <span className="text-[11px] text-stone-500">Change coins & small notes in register</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="font-bold text-stone-500">{currency}</span>
                <input
                  type="number"
                  value={startingFloat}
                  onChange={e => setStartingFloat(e.target.value)}
                  placeholder="500"
                  className="w-24 px-2 py-1 text-right font-black bg-white border border-stone-200 rounded-lg text-stone-900"
                />
              </div>
            </div>

            {/* Cash Collected from Orders */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <span className="font-bold text-emerald-950">+ Cash Collected from Orders</span>
              <span className="font-black text-emerald-800 text-sm">{currency}{cashSales.toFixed(2)}</span>
            </div>

            {/* Cash Paid for Expenses */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-100">
              <div>
                <span className="font-bold text-rose-950 block">- Cash Paid for Petty Expenses</span>
                <span className="text-[11px] text-rose-700">Groceries/milk paid directly from drawer</span>
              </div>
              <span className="font-black text-rose-700 text-sm">-{currency}{cashExpenses.toFixed(2)}</span>
            </div>

            {/* Refunds */}
            {totalRefunds > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                <span className="font-bold text-amber-950">- Cash Refunds Returned</span>
                <span className="font-black text-amber-800 text-sm">-{currency}{totalRefunds.toFixed(2)}</span>
              </div>
            )}

            {/* Net Expected */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-suvai-green-950 text-white shadow-sm">
              <div>
                <span className="text-xs font-bold text-suvai-orange-300 uppercase tracking-wider block">
                  Expected Cash In Drawer
                </span>
                <span className="text-[11px] text-cream-300">Float + Cash Sales - Expenses</span>
              </div>
              <span className="text-xl font-black text-white">
                {currency}{expectedCashInDrawer.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Counter Cash Count & Discrepancy */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-cream-200 mb-4">
              <Banknote className="w-5 h-5 text-suvai-orange-600" />
              <h3 className="font-extrabold text-base text-stone-900">Shift End Cash Count</h3>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Count all physical currency notes and coins currently inside the cash drawer and enter the total below:
            </p>

            <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase">
                Actual Cash Physically Counted ({currency})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={actualCashCounted}
                  onChange={e => setActualCashCounted(e.target.value)}
                  placeholder="Enter counted amount..."
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-lg font-black text-stone-900 focus:outline-hidden focus:border-suvai-green-800"
                />
              </div>
            </div>

            {/* Difference / Discrepancy Indicator */}
            {isCountEntered && (
              <div className={`mt-4 p-4 rounded-2xl border text-xs flex items-start space-x-3 ${
                difference === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : difference > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {difference === 0 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {difference === 0
                      ? 'Perfect Tally! Cash matches exactly.'
                      : difference > 0
                      ? `Cash Drawer is Over by +${currency}${difference.toFixed(2)}`
                      : `Cash Drawer is Short by -${currency}${Math.abs(difference).toFixed(2)}`}
                  </p>
                  <p className="text-[11px] mt-0.5 text-stone-600">
                    Expected: {currency}{expectedCashInDrawer.toFixed(2)} • Counted: {currency}{actualCount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Thermal Print Shift Summary Button */}
          <div className="pt-4 border-t border-cream-200">
            <button
              onClick={handlePrintDailySlip}
              className="w-full py-3 px-4 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-98 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <Printer className="w-4 h-4 text-suvai-orange-400" />
              <span>Print End-of-Day Canteen Cash Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
