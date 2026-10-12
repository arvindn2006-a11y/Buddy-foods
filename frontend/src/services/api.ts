/**
 * Suvai Frontend API Client
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('suvai_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('suvai_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('suvai_token');
  localStorage.removeItem('suvai_user');
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      clearAuthToken();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `API error: ${response.status}`);
      }
      return data;
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `API error: ${response.status}`);
      }
      return text as unknown as T;
    }
  } catch (error: any) {
    console.error(`API request failed [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  changePassword: (data: any) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data: any) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: any) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params?: { category_id?: number; search?: string; available_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category_id) q.append('category_id', String(params.category_id));
    if (params?.search) q.append('search', params.search);
    if (params?.available_only) q.append('available_only', '1');
    const query = q.toString() ? `?${q.toString()}` : '';
    return request(`/products${query}`);
  },
  createProduct: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleProductStock: (id: number) => request(`/products/${id}/toggle-stock`, { method: 'PATCH' }),
  deleteProduct: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),

  // Orders
  createOrder: (data: any) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return request(`/orders${q ? `?${q}` : ''}`);
  },
  getOrderById: (id: number) => request(`/orders/${id}`),
  cancelOrder: (id: number, data: { cancellation_reason: string }) => request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify(data) }),
  syncOfflineOrders: (orders: any[]) => request('/orders/sync', { method: 'POST', body: JSON.stringify({ orders }) }),

  // Expenses
  getExpenses: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return request(`/expenses${q ? `?${q}` : ''}`);
  },
  createExpense: (data: any) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: number, data: any) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: number) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Reports
  getDashboard: () => request('/reports/dashboard'),
  getDailyEarnings: (date?: string) => request(`/reports/daily-earnings${date ? `?date=${date}` : ''}`),
  getAnalytics: (params?: { startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams(params || {}).toString();
    return request(`/reports/analytics${q ? `?${q}` : ''}`);
  },
  exportCsvUrl: (type: 'sales' | 'expenses', startDate?: string, endDate?: string) => {
    const q = new URLSearchParams({ type, ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) });
    return `${API_BASE}/reports/export-csv?${q.toString()}`;
  },

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data: any) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Backup
  exportBackupUrl: () => `${API_BASE}/backup/export`,
  restoreBackup: (data: any) => request('/backup/restore', { method: 'POST', body: JSON.stringify({ data }) }),
  resetDemoData: () => request('/backup/reset-demo', { method: 'POST' }),

  // System
  checkHealth: () => request('/health')
};
