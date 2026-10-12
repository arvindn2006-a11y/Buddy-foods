/**
 * Suvai IndexedDB Client for Offline Storage & Resilience
 */

const DB_NAME = 'suvai_pos_offline_db';
const DB_VERSION = 1;

export interface OfflineOrderRecord {
  id: string; // Unique offline order ID (e.g., OFFLINE-172872-9182)
  order_data: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error_message?: string;
  created_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object store for offline pending orders
      if (!db.objectStoreNames.contains('offline_orders')) {
        const store = db.createObjectStore('offline_orders', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Object store for catalog cache (categories, products, settings)
      if (!db.objectStoreNames.contains('catalog_cache')) {
        db.createObjectStore('catalog_cache', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const offlineStorage = {
  // Save an order created while offline
  async saveOfflineOrder(orderData: any): Promise<string> {
    const db = await openDB();
    const offlineId = `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const record: OfflineOrderRecord = {
      id: offlineId,
      order_data: {
        ...orderData,
        offline_id: offlineId
      },
      status: 'pending',
      created_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_orders', 'readwrite');
      const store = transaction.objectStore('offline_orders');
      const req = store.add(record);

      req.onsuccess = () => resolve(offlineId);
      req.onerror = () => reject(req.error);
    });
  },

  // Get all pending offline orders
  async getPendingOrders(): Promise<OfflineOrderRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_orders', 'readonly');
      const store = transaction.objectStore('offline_orders');
      const req = store.getAll();

      req.onsuccess = () => {
        const list: OfflineOrderRecord[] = req.result || [];
        resolve(list.filter(item => item.status === 'pending' || item.status === 'failed'));
      };
      req.onerror = () => reject(req.error);
    });
  },

  // Mark an order as synced
  async markAsSynced(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_orders', 'readwrite');
      const store = transaction.objectStore('offline_orders');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.status = 'synced';
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  // Cache catalog items for offline POS availability
  async cacheCatalog(key: 'categories' | 'products' | 'settings', data: any): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction('catalog_cache', 'readwrite');
      const store = transaction.objectStore('catalog_cache');
      store.put({ key, data, cached_at: new Date().toISOString() });
    } catch (err) {
      console.warn('Failed to cache catalog in IndexedDB:', err);
    }
  },

  // Retrieve cached catalog
  async getCachedCatalog(key: 'categories' | 'products' | 'settings'): Promise<any | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction('catalog_cache', 'readonly');
        const store = transaction.objectStore('catalog_cache');
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result?.data || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
};
