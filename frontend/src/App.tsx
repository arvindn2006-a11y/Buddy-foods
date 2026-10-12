import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { SettingsProvider } from './context/SettingsContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Pos } from './pages/Pos';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Expenses } from './pages/Expenses';
import { DailyEarnings } from './pages/DailyEarnings';
import { Reports } from './pages/Reports';
import { PrinterSettings } from './pages/PrinterSettings';
import { BusinessSettings } from './pages/BusinessSettings';
import { Backup } from './pages/Backup';

const pageTitles: Record<string, string> = {
  dashboard: 'Canteen Dashboard',
  pos: 'Point of Sale (New Bill)',
  products: 'Food Menu & Stock Management',
  orders: 'Order & Transaction History',
  expenses: 'Operational Expenses',
  'daily-earnings': 'Daily Shift Reconciliation',
  reports: 'Reports & Analytics',
  'printer-settings': 'Thermal Printer Settings',
  settings: 'Business Settings',
  backup: 'Database Backup & Restore'
};

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('pos'); // Start directly on POS for cashier speed
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Global hotkeys for busy canteen counters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentPage('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentPage('orders');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentPage('dashboard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-suvai-green-800 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-stone-600">Starting Suvai POS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => setCurrentPage('pos')} />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={(page) => setCurrentPage(page)} />;
      case 'pos':
        return <Pos />;
      case 'products':
        return <Products />;
      case 'orders':
        return <Orders />;
      case 'expenses':
        return <Expenses />;
      case 'daily-earnings':
        return <DailyEarnings />;
      case 'reports':
        return <Reports />;
      case 'printer-settings':
        return <PrinterSettings />;
      case 'settings':
        return <BusinessSettings />;
      case 'backup':
        return <Backup />;
      default:
        return <Pos />;
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Navbar
          activePageTitle={pageTitles[currentPage] || 'Suvai POS'}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 p-4 lg:p-8">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SyncProvider>
          <MainLayout />
        </SyncProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
