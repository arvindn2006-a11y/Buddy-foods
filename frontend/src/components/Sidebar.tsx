import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  Clock,
  TrendingDown,
  Coins,
  BarChart3,
  Printer,
  Settings,
  Database,
  X,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isMobileOpen,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'New Bill (POS)', icon: Receipt, highlight: true },
    { id: 'products', label: 'Menu & Stock', icon: UtensilsCrossed },
    { id: 'orders', label: 'Order History', icon: Clock },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'daily-earnings', label: 'Daily Earnings', icon: Coins },
    { id: 'reports', label: 'Reports & Profit', icon: BarChart3 },
    { id: 'printer-settings', label: 'Printer Settings', icon: Printer },
    { id: 'settings', label: 'Business Settings', icon: Settings },
    { id: 'backup', label: 'Backup & Restore', icon: Database }
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-suvai-green-950 text-cream-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-suvai-green-900 shadow-xl`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-5 border-b border-suvai-green-900 bg-suvai-green-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-suvai-orange-600 to-suvai-orange-400 flex items-center justify-center shadow-md shadow-suvai-orange-950/40">
              <span className="text-white font-black text-xl tracking-tighter">S</span>
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                <span>Suvai</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-suvai-orange-600/90 text-white font-bold uppercase tracking-wider">
                  POS
                </span>
              </h2>
              <p className="text-[11px] text-cream-300 font-medium">Smart Canteen System</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-cream-300 hover:text-white rounded-lg hover:bg-suvai-green-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-suvai-green-800 text-white shadow-sm shadow-suvai-green-950/50 font-bold border-l-4 border-suvai-orange-500'
                    : 'text-cream-300 hover:text-white hover:bg-suvai-green-900/50'
                } ${item.highlight && !isActive ? 'text-suvai-orange-300 hover:text-suvai-orange-200' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-suvai-orange-400'
                      : item.highlight
                      ? 'text-suvai-orange-400'
                      : 'text-cream-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-suvai-orange-500 animate-pulse"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Quick Help Card */}
        <div className="p-3 m-3 bg-suvai-green-900/60 rounded-xl border border-suvai-green-800 text-xs text-cream-300">
          <div className="flex items-center space-x-1.5 text-suvai-orange-300 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Counter Tip</span>
          </div>
          <p className="text-[11px] leading-relaxed text-cream-300/90">
            Use touch category pills for 1-tap item entry. Thermal receipt cuts automatically.
          </p>
        </div>
      </aside>
    </>
  );
};
