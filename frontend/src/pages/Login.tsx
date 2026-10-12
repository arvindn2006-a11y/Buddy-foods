import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Utensils, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.login({ username, password });
      if (res.success && res.token && res.user) {
        login(res.user, res.token);
        onLoginSuccess();
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server. Check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Background decoration */}
      <div className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-suvai-green-900 to-suvai-green-700 mx-auto flex items-center justify-center shadow-lg shadow-suvai-green-950/20 mb-4 border-2 border-suvai-orange-400">
            <Utensils className="w-8 h-8 text-cream-100" />
          </div>
          <h1 className="text-3xl font-extrabold text-suvai-green-950 tracking-tight">
            Suvai
          </h1>
          <p className="text-sm font-medium text-stone-600 mt-1">
            Smart Canteen Billing & Management System
          </p>
          <p className="text-xs text-suvai-green-800 font-semibold mt-0.5">
            College Campus Food Court Edition
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-stone-200/50 border border-cream-200">
          <h2 className="text-xl font-bold text-stone-900 mb-1">Canteen Login</h2>
          <p className="text-xs text-stone-500 mb-6">Enter your cashier or administrator credentials to proceed.</p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-11 pr-4 py-3 bg-cream-50/50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:border-suvai-green-700 focus:ring-2 focus:ring-suvai-green-200 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-cream-50/50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:border-suvai-green-700 focus:ring-2 focus:ring-suvai-green-200 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-suvai-green-900 hover:bg-suvai-green-800 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md shadow-suvai-green-950/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In to Register'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Credential Fill for Easy Testing */}
          <div className="mt-6 pt-5 border-t border-cream-200">
            <div className="flex items-center space-x-1 text-xs font-semibold text-stone-500 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-suvai-green-700" />
              <span>Default Credentials</span>
            </div>
            <button
              type="button"
              onClick={() => fillCredentials('admin', 'admin123')}
              className="w-full text-left p-2.5 rounded-lg bg-cream-100 hover:bg-cream-200 text-stone-700 text-xs flex justify-between items-center transition-colors"
            >
              <span><strong>admin</strong> / admin123</span>
              <span className="text-[11px] font-semibold text-suvai-green-800 bg-suvai-green-100 px-2 py-0.5 rounded">
                Fill Admin
              </span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Suvai Canteen OS • Fast Offline-Ready POS
        </p>
      </div>
    </div>
  );
};
