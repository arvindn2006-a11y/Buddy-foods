import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useSettings } from '../context/SettingsContext';
import {
  Wifi,
  WifiOff,
  CloudUpload,
  User as UserIcon,
  LogOut,
  Menu,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu: () => void;
  activePageTitle: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, activePageTitle }) => {
  const { user, logout, isAdmin } = useAuth();
  const { isOnline, pendingCount, isSyncing, syncNow } = useSync();
  const { settings } = useSettings();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-cream-200 px-4 lg:px-8 py-3 flex items-center justify-between transition-all">
      {/* Left: Mobile trigger & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-stone-600 hover:bg-cream-100 active:scale-95 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-lg lg:text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <span>{activePageTitle}</span>
          </h1>
          <p className="text-xs text-stone-500 hidden sm:block">
            {settings.business_name} • {settings.college_name}
          </p>
        </div>
      </div>

      {/* Right: Network & Sync status, User badge */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Offline / Online Status Badge */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isOnline
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-100 text-amber-900 border border-amber-300'
          }`}
          title={isOnline ? 'Network Connected' : 'Offline Mode Active'}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Online</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Pending Sync Orders Indicator */}
        {pendingCount > 0 && (
          <button
            onClick={syncNow}
            disabled={!isOnline || isSyncing}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
              isOnline
                ? 'bg-suvai-orange-600 hover:bg-suvai-orange-700 text-white animate-bounce'
                : 'bg-stone-200 text-stone-600 cursor-not-allowed'
            }`}
            title="Click to sync offline orders to database"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing ? 'Syncing...' : `${pendingCount} Pending Sync`}
            </span>
          </button>
        )}

        {/* User Profile Badge */}
        {user && (
          <div className="flex items-center space-x-3 pl-2 sm:pl-3 border-l border-cream-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-stone-800 leading-tight">{user.full_name}</p>
              <div className="flex items-center justify-end space-x-1">
                {isAdmin && <ShieldCheck className="w-3 h-3 text-suvai-green-700" />}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-suvai-green-700">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
