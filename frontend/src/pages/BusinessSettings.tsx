import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import {
  Settings,
  Building2,
  Receipt,
  QrCode,
  Lock,
  CheckCircle,
  AlertCircle,
  Save,
  Globe
} from 'lucide-react';

export const BusinessSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const [formData, setFormData] = useState({
    business_name: settings.business_name || 'Suvai Canteen',
    college_name: settings.college_name || 'PSG College of Technology & Sciences',
    campus_branch: settings.campus_branch || 'Campus Food Court, Block-3',
    phone: settings.phone || '+91 98765 43210',
    email: settings.email || 'canteen@suvaifoods.edu',
    currency_symbol: settings.currency_symbol || '₹',
    tax_name: settings.tax_name || 'GST',
    tax_percentage: settings.tax_percentage || '5.00',
    tax_inclusive: settings.tax_inclusive !== 'false',
    invoice_prefix: settings.invoice_prefix || 'SUV-',
    timezone: settings.timezone || 'Asia/Kolkata',
    upi_vpa: settings.upi_vpa || 'suvaicanteen@okaxis',
    upi_merchant_name: settings.upi_merchant_name || 'Suvai Canteen PSG'
  });

  // Password Change State
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passMessage, setPassMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setBannerMessage(null);
    try {
      await updateSettings({
        ...formData,
        tax_inclusive: formData.tax_inclusive ? 'true' : 'false'
      });
      setBannerMessage({ text: 'Business details updated successfully!', type: 'success' });
    } catch (err: any) {
      setBannerMessage({ text: err.message || 'Failed to save settings', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (passData.newPassword !== passData.confirmPassword) {
      setPassMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (passData.newPassword.length < 6) {
      setPassMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }

    try {
      const res = await api.changePassword({
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      if (res.success) {
        setPassMessage({ text: 'Admin password changed successfully!', type: 'success' });
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      setPassMessage({ text: err.message || 'Failed to update password', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Business & Canteen Settings</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure campus details, tax calculation, UPI ID, invoice serial prefix, and admin security.
          </p>
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

      <form onSubmit={handleSettingsSubmit} className="space-y-6">
        {/* Section 1: Canteen Identity */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-cream-200">
            <Building2 className="w-5 h-5 text-suvai-green-900" />
            <h3 className="font-black text-base text-stone-900">Canteen & Campus Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Canteen Brand Name *</label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">College / Institution Name *</label>
              <input
                type="text"
                required
                value={formData.college_name}
                onChange={e => setFormData({ ...formData, college_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium text-stone-900"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Campus Block / Food Court Location</label>
              <input
                type="text"
                value={formData.campus_branch}
                onChange={e => setFormData({ ...formData, campus_branch: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium text-stone-900"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Contact Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-medium text-stone-900"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Taxation & Currency */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-cream-200">
            <Receipt className="w-5 h-5 text-suvai-orange-600" />
            <h3 className="font-black text-base text-stone-900">Taxation & Invoicing Rules</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Tax Label (GST / VAT)</label>
              <input
                type="text"
                value={formData.tax_name}
                onChange={e => setFormData({ ...formData, tax_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Tax Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.tax_percentage}
                onChange={e => setFormData({ ...formData, tax_percentage: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-black text-stone-900"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={e => setFormData({ ...formData, currency_symbol: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-black text-lg text-suvai-green-950"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Bill Serial Prefix</label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={e => setFormData({ ...formData, invoice_prefix: e.target.value })}
                placeholder="SUV-"
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Business Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-mono"
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="tax-inc"
                checked={formData.tax_inclusive}
                onChange={e => setFormData({ ...formData, tax_inclusive: e.target.checked })}
                className="w-4 h-4 rounded text-suvai-green-900"
              />
              <label htmlFor="tax-inc" className="font-semibold text-stone-800">
                Menu Prices Include GST (Standard)
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Counter UPI QR Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-cream-200">
            <QrCode className="w-5 h-5 text-blue-700" />
            <h3 className="font-black text-base text-stone-900">Counter Dynamic UPI Payment Gateway</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Canteen UPI ID (VPA) *</label>
              <input
                type="text"
                required
                value={formData.upi_vpa}
                onChange={e => setFormData({ ...formData, upi_vpa: e.target.value })}
                placeholder="canteen@okaxis or canteen@upi"
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-mono font-bold text-blue-900"
              />
              <p className="text-[11px] text-stone-500 mt-1">Used to generate dynamic QR codes on customer-facing screen</p>
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">Merchant Display Name</label>
              <input
                type="text"
                value={formData.upi_merchant_name}
                onChange={e => setFormData({ ...formData, upi_merchant_name: e.target.value })}
                placeholder="Suvai Canteen PSG"
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-bold text-stone-900"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3.5 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-98 text-white font-black text-xs rounded-2xl shadow-lg flex items-center space-x-2 transition-all disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save All Business Settings'}</span>
          </button>
        </div>
      </form>

      {/* Section 4: Admin Password Security */}
      <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-cream-200">
          <Lock className="w-5 h-5 text-rose-700" />
          <h3 className="font-black text-base text-stone-900">Administrator Security & Password</h3>
        </div>

        {passMessage && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold ${
            passMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {passMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 uppercase mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={passData.currentPassword}
              onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 uppercase mb-1">New Password *</label>
            <input
              type="password"
              required
              value={passData.newPassword}
              onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 uppercase mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              value={passData.confirmPassword}
              onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
