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
  const printerType = settings.printer_type || 'browser';
  const bridgeUrl = settings.printer_bridge_url || 'http://localhost:9123';
  const { hex, bytes } = buildOrderReceiptBytes(order, settings);

  // 1. Browser Print Mode (Standard & Recommended for Tablets, Mobiles & Thermal Printers)
  if (printerType === 'browser') {
    try {
      window.print();
      return {
        success: true,
        message: 'System / Thermal print dialog opened successfully.',
        method: 'browser'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to open print dialog: ${err.message}`,
        method: 'browser',
        error: err.message
      };
    }
  }

  // 2. Local Print Bridge Mode (For dedicated Windows POS counter with ESC/POS hardware)
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
        // Fallback to browser print if bridge rejected
        window.print();
        return {
          success: true,
          message: 'Bridge rejected, opened device print dialog as fallback.',
          method: 'browser'
        };
      }
    } catch (err: any) {
      // Fallback to browser print so customer receipt always prints on Tab / Mobile / PC
      window.print();
      return {
        success: true,
        message: 'Print Bridge unreachable. Opened device print dialog.',
        method: 'browser'
      };
    }
  }

  // 3. Web Serial API Mode (Direct USB Cable from Browser)
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
        window.print();
        return {
          success: true,
          message: `Serial port failed (${err.message}). Opened device print dialog.`,
          method: 'browser',
          error: err.message
        };
      }
    } else {
      window.print();
      return {
        success: true,
        message: 'Web Serial not supported on this device. Opened device print dialog.',
        method: 'browser'
      };
    }
  }

  window.print();
  return {
    success: true,
    message: 'Print dialog triggered for thermal receipt.',
    method: 'browser'
  };
}

/**
 * Execute test print
 */
export async function executeTestPrint(settings: Partial<BusinessSettings> = {}): Promise<PrintResult> {
  const printerType = settings.printer_type || 'browser';
  const bridgeUrl = settings.printer_bridge_url || 'http://localhost:9123';
  const { hex, bytes } = buildTestReceiptBytes(settings);

  if (printerType === 'browser') {
    window.print();
    return {
      success: true,
      message: 'Triggered device / thermal print dialog for test receipt.',
      method: 'browser'
    };
  }

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
        window.print();
        return {
          success: true,
          message: 'Bridge offline, opened device print dialog for test receipt.',
          method: 'browser'
        };
      }
    } catch (err: any) {
      window.print();
      return {
        success: true,
        message: `Bridge offline at ${bridgeUrl}. Opened device print dialog for test receipt.`,
        method: 'browser'
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
        window.print();
        return {
          success: true,
          message: `Serial port error. Opened device print dialog.`,
          method: 'browser'
        };
      }
    } else {
      window.print();
      return {
        success: true,
        message: 'Web Serial not supported. Opened device print dialog.',
        method: 'browser'
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
