import React, { createContext, useContext, useState, useEffect } from 'react';
import { BusinessSettings } from '../types';
import { api } from '../services/api';
import { offlineStorage } from '../services/db';

const defaultSettings: BusinessSettings = {
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
  printer_type: 'bridge',
  printer_width: '80',
  printer_bridge_url: 'http://localhost:9123',
  printer_auto_cut: 'true',
  printer_open_drawer: 'true',
  printer_header: 'SUVAI CANTEEN\nPSG Tech Campus Food Court\nPh: +91 98765 43210',
  printer_footer: 'Thank you for choosing Suvai!\nFood tokens valid for today only.\nPlease collect your meal at counter.',
  upi_vpa: 'suvaicanteen@okaxis',
  upi_merchant_name: 'Suvai Canteen PSG'
};

interface SettingsContextType {
  settings: BusinessSettings;
  isLoading: boolean;
  reloadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
        await offlineStorage.cacheCatalog('settings', res.data);
      }
    } catch {
      // Offline fallback: try reading from IndexedDB
      const cached = await offlineStorage.getCachedCatalog('settings');
      if (cached) {
        setSettings(prev => ({ ...prev, ...cached }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<BusinessSettings>) => {
    await api.updateSettings(updates);
    setSettings(prev => ({ ...prev, ...updates }));
    await offlineStorage.cacheCatalog('settings', { ...settings, ...updates });
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, reloadSettings: loadSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
