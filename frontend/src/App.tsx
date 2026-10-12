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

import { Receipt, UtensilsCrossed, Clock, Printer, Menu } from 'lucide-react';

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

        <main className="flex-1 p-3 sm:p-4 lg:p-8 pb-20 lg:pb-8">
          {renderCurrentPage()}
        </main>

        {/* Mobile & Tablet Bottom Quick Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-cream-200 px-1 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setCurrentPage('pos')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
              currentPage === 'pos' ? 'text-suvai-green-900 bg-suvai-green-50' : 'text-stone-500'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span>POS</span>
          </button>
          <button
            onClick={() => setCurrentPage('products')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
              currentPage === 'products' ? 'text-suvai-green-900 bg-suvai-green-50' : 'text-stone-500'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 mb-0.5" />
            <span>Menu</span>
          </button>
          <button
            onClick={() => setCurrentPage('orders')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
              currentPage === 'orders' ? 'text-suvai-green-900 bg-suvai-green-50' : 'text-stone-500'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span>Orders</span>
          </button>
          <button
            onClick={() => setCurrentPage('printer-settings')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
              currentPage === 'printer-settings' ? 'text-suvai-green-900 bg-suvai-green-50' : 'text-stone-500'
            }`}
          >
            <Printer className="w-5 h-5 mb-0.5" />
            <span>Printer</span>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold text-stone-500 hover:text-stone-900 transition-all"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </nav>
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
