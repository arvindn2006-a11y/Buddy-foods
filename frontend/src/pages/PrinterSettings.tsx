import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { executeTestPrint, checkPrintBridgeStatus, PrintResult } from '../services/printer';
import {
  Printer,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sliders,
  Cable,
  Wifi,
  Scissors,
  HelpCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export const PrinterSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const [printerType, setPrinterType] = useState(settings.printer_type || 'browser');
  const [printerWidth, setPrinterWidth] = useState(settings.printer_width || '80');
  const [bridgeUrl, setBridgeUrl] = useState(settings.printer_bridge_url || 'http://localhost:9123');
  const [autoCut, setAutoCut] = useState(settings.printer_auto_cut !== 'false');
  const [openDrawer, setOpenDrawer] = useState(settings.printer_open_drawer !== 'false');
  const [headerText, setHeaderText] = useState(settings.printer_header || '');
  const [footerText, setFooterText] = useState(settings.printer_footer || '');

  // Bridge Status Check
  const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [testResult, setTestResult] = useState<PrintResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const pingBridge = async () => {
    setBridgeStatus('checking');
    const isUp = await checkPrintBridgeStatus(bridgeUrl);
    setBridgeStatus(isUp ? 'connected' : 'disconnected');
  };

  useEffect(() => {
    pingBridge();
  }, [bridgeUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveBanner(null);
    try {
      await updateSettings({
        printer_type: printerType as any,
        printer_width: printerWidth as any,
        printer_bridge_url: bridgeUrl,
        printer_auto_cut: autoCut ? 'true' : 'false',
        printer_open_drawer: openDrawer ? 'true' : 'false',
        printer_header: headerText,
        printer_footer: footerText
      });
      setSaveBanner('Printer configuration saved successfully!');
    } catch (err: any) {
      setSaveBanner('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await executeTestPrint({
        printer_type: printerType as any,
        printer_width: printerWidth as any,
        printer_bridge_url: bridgeUrl,
        printer_auto_cut: autoCut ? 'true' : 'false',
        printer_open_drawer: openDrawer ? 'true' : 'false',
        business_name: settings.business_name
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Test print failed',
        method: printerType as any
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Thermal Receipt Printer Settings</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure ESC/POS hardware, 58mm/80mm roll width, Local Print Bridge, and cut commands.
          </p>
        </div>

        {/* Live Bridge Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-2 border ${
            bridgeStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : bridgeStatus === 'checking'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              bridgeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : bridgeStatus === 'checking' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <span>
              {bridgeStatus === 'connected' ? 'Print Bridge Online' : bridgeStatus === 'checking' ? 'Checking Bridge...' : 'Bridge Offline'}
            </span>
          </div>

          <button
            onClick={pingBridge}
            title="Check Bridge Status"
            className="p-2 bg-cream-100 hover:bg-cream-200 text-stone-700 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{saveBanner}</span>
          <button onClick={() => setSaveBanner(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Test Print Alert Status */}
      {testResult && (
        <div className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 ${
          testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {testResult.success ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-bold text-sm">{testResult.success ? 'Test Print Successful!' : 'Test Print Failed'}</p>
            <p className="mt-0.5">{testResult.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Modes & Roll Width (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-cream-200">
            <Sliders className="w-5 h-5 text-suvai-green-900" />
            <h3 className="font-black text-base text-stone-900">Printer Connection Configuration</h3>
          </div>

          {/* Mode Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-stone-700 uppercase">
              Printer Hardware Interface Mode *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                  printerType === 'bridge'
                    ? 'border-suvai-green-900 bg-suvai-green-50/50'
                    : 'border-cream-200 hover:border-cream-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-stone-900">Local Print Bridge</span>
                  <input
                    type="radio"
                    name="printerType"
                    value="bridge"
                    checked={printerType === 'bridge'}
                    onChange={() => setPrinterType('bridge')}
                    className="text-suvai-green-900"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Recommended for production counters (USB / LAN). Fast background printing.
                </p>
              </label>

              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                  printerType === 'serial'
                    ? 'border-suvai-green-900 bg-suvai-green-50/50'
                    : 'border-cream-200 hover:border-cream-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-stone-900">Web Serial USB</span>
                  <input
                    type="radio"
                    name="printerType"
                    value="serial"
                    checked={printerType === 'serial'}
                    onChange={() => setPrinterType('serial')}
                    className="text-suvai-green-900"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Direct browser-to-USB cable connection without drivers (Chrome/Edge).
                </p>
              </label>

              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                  printerType === 'browser'
                    ? 'border-suvai-green-900 bg-suvai-green-50/50'
                    : 'border-cream-200 hover:border-cream-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-xs text-stone-900">Browser Slip Print</span>
                  <input
                    type="radio"
                    name="printerType"
                    value="browser"
                    checked={printerType === 'browser'}
                    onChange={() => setPrinterType('browser')}
                    className="text-suvai-green-900"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Standard browser print dialog with styled 58mm/80mm thermal CSS media rules.
                </p>
              </label>
            </div>
          </div>

          {/* Paper Width (58mm vs 80mm) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700 uppercase">
              Receipt Thermal Paper Width *
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                  printerWidth === '80'
                    ? 'border-suvai-green-900 bg-suvai-green-50 font-bold text-suvai-green-950'
                    : 'border-cream-200 text-stone-700'
                }`}
              >
                <div>
                  <span className="text-xs block">80mm Paper Roll</span>
                  <span className="text-[10px] text-stone-500">48 Columns (Standard Canteen)</span>
                </div>
                <input
                  type="radio"
                  name="paperWidth"
                  value="80"
                  checked={printerWidth === '80'}
                  onChange={() => setPrinterWidth('80')}
                />
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                  printerWidth === '58'
                    ? 'border-suvai-green-900 bg-suvai-green-50 font-bold text-suvai-green-950'
                    : 'border-cream-200 text-stone-700'
                }`}
              >
                <div>
                  <span className="text-xs block">58mm Paper Roll</span>
                  <span className="text-[10px] text-stone-500">32 Columns (Compact POS)</span>
                </div>
                <input
                  type="radio"
                  name="paperWidth"
                  value="58"
                  checked={printerWidth === '58'}
                  onChange={() => setPrinterWidth('58')}
                />
              </label>
            </div>
          </div>

          {/* Bridge URL Configuration */}
          {printerType === 'bridge' && (
            <div className="space-y-1 text-xs">
              <label className="block font-bold text-stone-700 uppercase">
                Print Bridge Local Endpoint URL
              </label>
              <input
                type="text"
                value={bridgeUrl}
                onChange={e => setBridgeUrl(e.target.value)}
                placeholder="http://localhost:9123"
                className="w-full px-3.5 py-2.5 bg-cream-50/50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-hidden focus:border-suvai-green-800"
              />
              <p className="text-[11px] text-stone-500">
                Default: <code>http://localhost:9123</code> (Runs locally via <code>npm run dev:bridge</code>)
              </p>
            </div>
          )}

          {/* Cut & Cash Drawer toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-cream-50 border border-cream-200 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCut}
                onChange={e => setAutoCut(e.target.checked)}
                className="w-4 h-4 rounded text-suvai-green-900 mt-0.5"
              />
              <div>
                <span className="font-bold text-xs text-stone-800 block">Automatic Paper Cut</span>
                <span className="text-[11px] text-stone-500">Sends GS V 66 0 ESC/POS command at end of receipt</span>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-cream-50 border border-cream-200 cursor-pointer">
              <input
                type="checkbox"
                checked={openDrawer}
                onChange={e => setOpenDrawer(e.target.checked)}
                className="w-4 h-4 rounded text-suvai-green-900 mt-0.5"
              />
              <div>
                <span className="font-bold text-xs text-stone-800 block">Pulse Cash Drawer Kick</span>
                <span className="text-[11px] text-stone-500">Sends ESC p 0 25 250 kick pulse on payment</span>
              </div>
            </label>
          </div>

          {/* Receipt Custom Header & Footer */}
          <div className="space-y-4 pt-2 border-t border-cream-200 text-xs">
            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">
                Receipt Header Custom Lines
              </label>
              <textarea
                rows={3}
                value={headerText}
                onChange={e => setHeaderText(e.target.value)}
                placeholder="SUVAI CANTEEN&#10;Campus Food Court, Block-3&#10;Ph: 9876543210"
                className="w-full px-3 py-2 bg-cream-50/50 border border-stone-200 rounded-xl font-mono text-stone-800 focus:outline-hidden focus:border-suvai-green-800"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase mb-1">
                Receipt Footer Custom Message
              </label>
              <textarea
                rows={3}
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="Thank you for dining with Suvai!&#10;Tokens valid for today only.&#10;Please collect meal at counter."
                className="w-full px-3 py-2 bg-cream-50/50 border border-stone-200 rounded-xl font-mono text-stone-800 focus:outline-hidden focus:border-suvai-green-800"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-cream-200">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all"
            >
              {isSaving ? 'Saving Settings...' : 'Save Printer Configuration'}
            </button>
          </div>
        </div>

        {/* Right Info Box: Test Print & Hardware Setup Instructions */}
        <div className="space-y-6">
          {/* Test Print Box */}
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Printer className="w-5 h-5 text-suvai-orange-600" />
              <h3 className="font-extrabold text-base text-stone-900">Test Printer</h3>
            </div>
            <p className="text-xs text-stone-500">
              Sends an ESC/POS verification slip to confirm baud rate, paper alignment, and paper cutter.
            </p>

            <button
              type="button"
              onClick={handleTestPrint}
              disabled={isTesting}
              className="w-full py-3.5 px-4 bg-suvai-orange-600 hover:bg-suvai-orange-500 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
            >
              <Printer className="w-4 h-4" />
              <span>{isTesting ? 'Sending Test Slip...' : 'Send Test Print Slip'}</span>
            </button>
          </div>

          {/* Setup Instructions Card */}
          <div className="bg-cream-50 p-6 rounded-3xl border border-cream-200 space-y-4 text-xs text-stone-700">
            <div className="flex items-center space-x-2 text-suvai-green-900 font-extrabold text-sm">
              <HelpCircle className="w-4 h-4" />
              <span>How To Print Properly on Thermal Printers</span>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div className="p-3 bg-white rounded-2xl border border-cream-200 space-y-1">
                <strong className="text-suvai-green-950 block font-black">
                  🖨️ For Tablets & Mobile Phones (Android, iPad, iPhone):
                </strong>
                <p className="text-[11px] text-stone-600">
                  Select <strong>Browser / Thermal</strong> mode above. When you tap "Print Receipt", the device system print sheet opens. Connect your thermal printer via Bluetooth, AirPrint, or Wi-Fi.
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-cream-200 space-y-1.5">
                <strong className="text-stone-900 block font-bold">
                  ⚙️ 3 Critical Settings in Print Dialog for Clean Cuts:
                </strong>
                <ul className="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                  <li><strong>Paper Size:</strong> Choose <strong>80mm</strong> or <strong>58mm</strong> (or Receipt roll).</li>
                  <li><strong>Margins:</strong> Set to <strong>None</strong> or <strong>Minimum</strong>.</li>
                  <li><strong>Headers & Footers:</strong> <strong>Uncheck</strong> (prevents browser date/URL from printing).</li>
                  <li><strong>Scale:</strong> Keep at <strong>100% (Default)</strong>.</li>
                </ul>
              </div>

              <div>
                <strong className="text-stone-900 block font-bold">Local Print Bridge (Desktop Windows POS):</strong>
                <p className="text-[11px] text-stone-600">
                  For background silent printing with cash drawer kick on PC counters, start the included bridge daemon using <code>npm run dev:bridge</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
