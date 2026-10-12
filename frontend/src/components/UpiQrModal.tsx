import React from 'react';
import { X, QrCode, CheckCircle2 } from 'lucide-react';

interface UpiQrModalProps {
  isOpen: boolean;
  amount: number;
  billNumber?: string;
  upiVpa: string;
  merchantName: string;
  currencySymbol: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UpiQrModal: React.FC<UpiQrModalProps> = ({
  isOpen,
  amount,
  billNumber = 'SUVAI',
  upiVpa,
  merchantName,
  currencySymbol,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Canteen Bill ${billNumber}`)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiPayload)}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-cream-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-suvai-green-900 text-white">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-suvai-orange-400" />
            <h3 className="font-bold text-base">Instant Counter UPI Pay</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-cream-200 hover:text-white hover:bg-suvai-green-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Body */}
        <div className="p-6 text-center space-y-4">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Payable</span>
            <p className="text-3xl font-black text-suvai-green-950 mt-0.5">
              {currencySymbol}{amount.toFixed(2)}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-cream-50 rounded-2xl border-2 border-dashed border-suvai-green-200 inline-block shadow-inner">
            <img
              src={qrImageUrl}
              alt="UPI QR Code"
              className="w-48 h-48 mx-auto rounded-lg shadow-xs"
              loading="lazy"
            />
          </div>

          <div className="space-y-1 text-xs">
            <p className="font-semibold text-stone-700">{merchantName}</p>
            <p className="text-stone-500 font-mono bg-stone-100 py-1 px-3 rounded-full inline-block">
              {upiVpa}
            </p>
            <p className="text-[11px] text-stone-400 pt-1">Scan using Google Pay, PhonePe, Paytm, or BHIM</p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={onConfirm}
              className="w-full py-3 px-4 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-98 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Payment Received — Complete Bill</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
            >
              Cancel & Switch Payment Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
