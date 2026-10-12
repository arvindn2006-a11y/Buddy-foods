import React, { useState } from 'react';
import { Order, BusinessSettings } from '../types';
import { printOrderReceipt, PrintResult } from '../services/printer';
import { Printer, X, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, settings, isOpen, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<PrintResult | null>(null);

  if (!isOpen || !order) return null;

  const currency = settings.currency_symbol || '₹';
  const orderDate = new Date(order.order_date || Date.now());

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus(null);
    try {
      const res = await printOrderReceipt(order, settings);
      setPrintStatus(res);
    } catch (err: any) {
      setPrintStatus({
        success: false,
        message: err.message || 'Failed to print receipt',
        method: settings.printer_type
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-transparent print:static print:block">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:w-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-suvai-green-900 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-suvai-orange-400" />
            <h3 className="font-bold text-base sm:text-lg">Receipt & Token Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cream-200 hover:text-white hover:bg-suvai-green-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Print Feedback Alert */}
        {printStatus && (
          <div className={`px-4 py-3 text-sm flex items-start space-x-2 print:hidden ${printStatus.success ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-red-50 text-red-800 border-b border-red-200'}`}>
            {printStatus.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{printStatus.success ? 'Print Confirmed' : 'Print Failed'}</p>
              <p className="text-xs mt-0.5">{printStatus.message}</p>
            </div>
          </div>
        )}

        {/* Scrollable Receipt Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          {/* Helpful printing guide banner for mobile & tablet */}
          <div className="w-full max-w-[340px] mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 print:hidden flex items-start gap-1.5">
            <span className="font-bold shrink-0">💡 Tip:</span>
            <span>Set <strong>Margins: None</strong> and uncheck <strong>Headers & Footers</strong> in the print sheet for a perfect receipt.</span>
          </div>

          {/* Authentic Thermal Slip Paper */}
          <div
            id="thermal-receipt-printable"
            className="w-full max-w-[340px] bg-white p-5 rounded shadow-sm border border-stone-200 text-stone-900 font-mono text-xs leading-relaxed select-text"
          >
            {/* Header */}
            <div className="text-center space-y-1 mb-3">
              <h2 className="text-base font-black tracking-wider uppercase text-black">
                {settings.business_name || 'SUVAI CANTEEN'}
              </h2>
              {settings.college_name && <p className="text-[11px] text-stone-600 font-sans">{settings.college_name}</p>}
              {settings.campus_branch && <p className="text-[10px] text-stone-500 font-sans">{settings.campus_branch}</p>}
              {settings.phone && <p className="text-[10px] text-stone-500 font-sans">Ph: {settings.phone}</p>}
            </div>

            <div className="border-b-2 border-dashed border-stone-400 my-2"></div>

            {/* Token Badge */}
            {order.token_number && (
              <div className="text-center py-1">
                <span className="text-[10px] uppercase tracking-widest text-stone-500 font-sans">TOKEN NUMBER</span>
                <p className="text-2xl font-black tracking-tight text-black">#{order.token_number}</p>
                <div className="border-b border-dashed border-stone-300 my-2"></div>
              </div>
            )}

            {/* Bill Meta */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-500">Bill No:</span>
                <span className="font-bold">{order.bill_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date:</span>
                <span>{orderDate.toLocaleDateString('en-IN')} {orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Customer:</span>
                <span>{order.customer_name || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Payment:</span>
                <span className="font-bold uppercase text-suvai-green-900">{order.payment_method}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-stone-400 my-2"></div>

            {/* Table Header */}
            <div className="flex justify-between font-bold text-[11px] pb-1 text-black">
              <span className="w-1/2">ITEM</span>
              <span className="w-1/6 text-center">QTY</span>
              <span className="w-1/3 text-right">TOTAL</span>
            </div>
            <div className="border-b border-stone-300 mb-1"></div>

            {/* Items */}
            <div className="space-y-1.5 py-1">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] leading-tight">
                    <span className="w-1/2 font-medium truncate">{item.product_name}</span>
                    <span className="w-1/6 text-center text-stone-600">x{item.quantity}</span>
                    <span className="w-1/3 text-right font-medium">
                      {currency}{Number(item.subtotal || item.quantity * item.unit_price).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-stone-400 italic text-center py-1">No items</p>
              )}
            </div>

            <div className="border-b border-dashed border-stone-400 my-2"></div>

            {/* Totals Calculation */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-500">Subtotal:</span>
                <span>{currency}{Number(order.subtotal || order.grand_total).toFixed(2)}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-suvai-orange-700">
                  <span>Discount:</span>
                  <span>-{currency}{Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(order.tax_amount) > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>GST (Included):</span>
                  <span>{currency}{Number(order.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="border-b-2 border-stone-900 my-1"></div>
              <div className="flex justify-between text-sm font-black text-black pt-0.5">
                <span>GRAND TOTAL:</span>
                <span>{currency}{Number(order.grand_total).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-b-2 border-dashed border-stone-400 my-3"></div>

            {/* Footer Notice */}
            <div className="text-center text-[10px] text-stone-600 space-y-1 leading-normal font-sans">
              {settings.printer_footer ? (
                settings.printer_footer.split('\n').map((line, i) => <p key={i}>{line}</p>)
              ) : (
                <>
                  <p className="font-semibold text-stone-800">Thank you for dining at Suvai!</p>
                  <p>Tokens valid for today only.</p>
                </>
              )}
              <p className="text-[9px] text-stone-400 pt-1 font-mono">Powered by Suvai Smart Canteen</p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-wrap gap-2 justify-between items-center print:hidden">
          <div className="text-xs text-stone-500">
            Mode: <span className="font-semibold uppercase text-suvai-green-800">{settings.printer_type}</span> ({settings.printer_width}mm)
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2 text-xs font-bold text-white bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-95 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-60"
            >
              {isPrinting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Printing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
