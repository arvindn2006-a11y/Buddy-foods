import { Request, Response } from 'express';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../utils/audit.js';

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const settingsObj: Record<string, string> = {
      business_name: 'Suvai Canteen',
      college_name: 'PSG College of Technology & Sciences',
      campus_branch: 'Campus Food Court, Block-3',
      phone: '+91 98765 43210',
      email: 'canteen@suvaifoods.edu',
      tax_name: 'GST',
      tax_percentage: '5.00',
      tax_inclusive: 'true',
      currency_symbol: '₹',
      timezone: 'Asia/Kolkata',
      invoice_prefix: 'SUV-',
      printer_type: 'bridge', // 'bridge' | 'serial' | 'browser'
      printer_width: '80', // '58' | '80'
      printer_bridge_url: 'http://localhost:9123',
      printer_auto_cut: 'true',
      printer_open_drawer: 'true',
      printer_header: 'SUVAI CANTEEN\nPSG Tech Campus Food Court\nPh: +91 98765 43210',
      printer_footer: 'Thank you for choosing Suvai!\nFood tokens valid for today only.\nPlease collect your meal at the counter.',
      upi_vpa: 'suvaicanteen@okaxis',
      upi_merchant_name: 'Suvai Canteen PSG'
    };

    if (pool && !isFallbackActive()) {
      const [rows]: any = await pool.query('SELECT setting_key, setting_value FROM business_settings');
      for (const row of rows) {
        settingsObj[row.setting_key] = row.setting_value;
      }
    } else {
      Object.assign(settingsObj, fallbackStore.business_settings);
    }

    res.json({ success: true, data: settingsObj });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const updates: Record<string, string> = req.body;

  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ success: false, message: 'Settings object required.' });
    return;
  }

  try {
    const pool = getPool();
    if (pool && !isFallbackActive()) {
      for (const [key, value] of Object.entries(updates)) {
        await pool.query(
          `INSERT INTO business_settings (setting_key, setting_value) 
           VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, String(value)]
        );
      }
    } else {
      for (const [key, value] of Object.entries(updates)) {
        fallbackStore.business_settings[key] = String(value);
      }
    }

    await logAuditEvent(req.user?.id || null, 'UPDATE_SETTINGS', 'settings', null, Object.keys(updates), req.ip);
    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
}
