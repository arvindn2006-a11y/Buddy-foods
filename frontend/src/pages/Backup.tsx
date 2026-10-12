import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileCheck,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

export const Backup: React.FC = () => {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreFile(e.target.files[0]);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    setIsRestoring(true);
    setBanner(null);

    try {
      const fileText = await restoreFile.text();
      const parsed = JSON.parse(fileText);

      if (!parsed.app || parsed.app !== 'Suvai Canteen System') {
        throw new Error('Selected file is not a valid Suvai database backup.');
      }

      const res = await api.restoreBackup(parsed);
      if (res.success) {
        setBanner({ text: 'Database successfully restored from backup!', type: 'success' });
        setRestoreFile(null);
      }
    } catch (err: any) {
      setBanner({ text: 'Restore failed: ' + err.message, type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all categories and menu items to default sample canteen data?')) return;

    setIsResetting(true);
    setBanner(null);
    try {
      const res = await api.resetDemoData();
      if (res.success) {
        setBanner({ text: 'Canteen demo catalog refreshed to default items.', type: 'success' });
      }
    } catch (err: any) {
      setBanner({ text: 'Reset failed: ' + err.message, type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Database Backup & Data Recovery</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Safeguard your canteen transaction history, products catalog, and operational expenses.
          </p>
        </div>
      </div>

      {banner && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
          banner.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
        }`}>
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Grid: 1. Download Backup, 2. Restore Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-suvai-green-900 mb-2">
              <Download className="w-5 h-5 text-suvai-orange-600" />
              <h3 className="font-extrabold text-base text-stone-900">Export Full Database Backup</h3>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              Downloads a complete JSON snapshot containing all categories, products, past orders, payment records, and settings.
            </p>

            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-suvai-green-900 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Data Loss Protection</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Recommended to run at the close of every business week before system maintenance.
              </p>
            </div>
          </div>

          <a
            href={api.exportBackupUrl()}
            download
            className="w-full py-3.5 px-4 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-98 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all text-center"
          >
            <Download className="w-4 h-4" />
            <span>Download Database Backup File (.json)</span>
          </a>
        </div>

        {/* Restore Backup Card */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-suvai-green-900 mb-2">
              <Upload className="w-5 h-5 text-suvai-orange-600" />
              <h3 className="font-extrabold text-base text-stone-900">Restore From Backup File</h3>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              Restore your canteen data from a previously downloaded JSON backup file.
            </p>

            <form onSubmit={handleRestoreSubmit} className="space-y-3">
              <div className="p-4 bg-cream-50 border-2 border-dashed border-cream-300 rounded-2xl text-center">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-suvai-green-900 file:text-white hover:file:bg-suvai-green-800 cursor-pointer"
                />
                {restoreFile && (
                  <p className="text-xs font-bold text-suvai-green-900 mt-2 flex items-center justify-center gap-1">
                    <FileCheck className="w-4 h-4" />
                    <span>{restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!restoreFile || isRestoring}
                className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isRestoring ? 'Restoring Tables...' : 'Execute Database Restore'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Reset / Fresh Seed Card */}
      <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-stone-800 mb-1">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm">Refresh Sample Canteen Data</h3>
          </div>
          <p className="text-xs text-stone-500">
            Re-populates the 25+ standard breakfast, meal, tiffin, and juice items without altering previous billing numbers.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={isResetting}
          className="px-5 py-2.5 bg-cream-100 hover:bg-cream-200 text-stone-800 text-xs font-bold rounded-xl border border-cream-200 flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Sample Menu</span>
        </button>
      </div>
    </div>
  );
};
