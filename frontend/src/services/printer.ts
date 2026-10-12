/**
 * Suvai Printer Integration Service
 * Manages physical printing via Local Print Bridge, Web Serial API, and Thermal Browser Fallback.
 */

import { Order, BusinessSettings } from '../types';
import { buildOrderReceiptBytes, buildTestReceiptBytes } from '../utils/escpos';

export interface PrintResult {
  success: boolean;
  message: string;
  method: 'bridge' | 'serial' | 'browser' | 'none';
  error?: string;
}

export async function checkPrintBridgeStatus(bridgeUrl = 'http://localhost:9123'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${bridgeUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Print order receipt using configured printer mode
 */
export async function printOrderReceipt(order: Order, settings: Partial<BusinessSettings> = {}): Promise<PrintResult> {
  const printerType = settings.printer_type || 'bridge';
  const bridgeUrl = settings.printer_bridge_url || 'http://localhost:9123';
  const { hex, bytes } = buildOrderReceiptBytes(order, settings);

  // 1. Local Print Bridge Mode (Recommended for production POS counters)
  if (printerType === 'bridge') {
    try {
      const response = await fetch(`${bridgeUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawHex: hex,
          targetType: 'network',
          printerIp: '127.0.0.1',
          printerPort: 9100
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.simulated
            ? `Receipt sent to Print Bridge (Simulated on localhost).`
            : `Receipt successfully transmitted to physical thermal printer.`,
          method: 'bridge'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Thermal printer bridge rejected print job.',
          method: 'bridge',
          error: data.message
        };
      }
    } catch (err: any) {
      console.warn('Local print bridge unreachable:', err.message);
      return {
        success: false,
        message: `Local Print Bridge is not responding at ${bridgeUrl}. Start bridge or switch to Web Serial/Browser mode in Printer Settings.`,
        method: 'bridge',
        error: err.message
      };
    }
  }

  // 2. Web Serial API Mode (Direct USB Cable from Browser)
  if (printerType === 'serial') {
    if ('serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(bytes);
        writer.releaseLock();
        await port.close();

        return {
          success: true,
          message: 'Receipt sent directly via Web Serial USB port.',
          method: 'serial'
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Web Serial communication failed: ${err.message}`,
          method: 'serial',
          error: err.message
        };
      }
    } else {
      return {
        success: false,
        message: 'Web Serial API is not supported in this browser. Please use Chrome/Edge or Print Bridge.',
        method: 'serial'
      };
    }
  }

  // 3. Browser Print Slip Fallback
  if (printerType === 'browser') {
    window.print();
    return {
      success: true,
      message: 'Print dialog triggered for thermal receipt.',
      method: 'browser'
    };
  }

  return {
    success: false,
    message: 'Unknown printer type configured.',
    method: 'none'
  };
}

/**
 * Execute test print
 */
export async function executeTestPrint(settings: Partial<BusinessSettings> = {}): Promise<PrintResult> {
  const printerType = settings.printer_type || 'bridge';
  const bridgeUrl = settings.printer_bridge_url || 'http://localhost:9123';
  const { hex, bytes } = buildTestReceiptBytes(settings);

  if (printerType === 'bridge') {
    try {
      const response = await fetch(`${bridgeUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawHex: hex,
          targetType: 'network',
          printerIp: '127.0.0.1',
          printerPort: 9100
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          message: 'Test print sent successfully to thermal printer.',
          method: 'bridge'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Printer failed to print test receipt.',
          method: 'bridge'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Print Bridge unreachable at ${bridgeUrl}. Ensure print-bridge is running.`,
        method: 'bridge',
        error: err.message
      };
    }
  }

  if (printerType === 'serial') {
    if ('serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(bytes);
        writer.releaseLock();
        await port.close();
        return {
          success: true,
          message: 'Test receipt sent directly via Web Serial USB port.',
          method: 'serial'
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Serial port error: ${err.message}`,
          method: 'serial'
        };
      }
    } else {
      return {
        success: false,
        message: 'Web Serial not supported in this browser.',
        method: 'serial'
      };
    }
  }

  // Browser preview test
  window.print();
  return {
    success: true,
    message: 'Triggered browser print dialog for test receipt.',
    method: 'browser'
  };
}
