// Centralized API client service for SupplyChain360
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Handles standard HTTP request with error catching and JSON parsing.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to the SupplyChain360 backend service. Please ensure the Flask server is running.');
    }
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Products
  getProducts: (params = '') => request(`/products${params ? `?${params}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (payload) => request('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: (params = '') => request(`/suppliers${params ? `?${params}` : ''}`),
  getSupplier: (id) => request(`/suppliers/${id}`),
  createSupplier: (payload) => request('/suppliers', { method: 'POST', body: JSON.stringify(payload) }),
  updateSupplier: (id, payload) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  // Purchase Orders
  getOrders: (params = '') => request(`/purchase-orders${params ? `?${params}` : ''}`),
  getOrder: (id) => request(`/purchase-orders/${id}`),
  createOrder: (payload) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderStatus: (id, status, notes = '') => 
    request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  receiveOrder: (id) => request(`/purchase-orders/${id}/receive`, { method: 'POST' }),

  // Dashboard & Metrics
  getDashboardSummary: () => request('/dashboard/summary'),
  getInventoryByCategory: () => request('/dashboard/inventory-by-category'),
  getOrdersByStatus: () => request('/dashboard/orders-by-status'),
  getMonthlyDemandTrend: () => request('/dashboard/monthly-demand'),
  getLowStockAlerts: () => request('/dashboard/low-stock'),

  // Demand Analytics
  getDemandRecords: (params = '') => request(`/demand${params ? `?${params}` : ''}`),
  getDemandSummary: (params = '') => request(`/demand/summary${params ? `?${params}` : ''}`),
  getDemandTrends: (params = '') => request(`/demand/trends${params ? `?${params}` : ''}`),

  // Recommendations
  getReorderRecommendations: () => request('/recommendations/reorder'),

  // Settings & Demo Data
  getSettings: () => request('/settings'),
  updateSettings: (payload) => request('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  seedDemoData: () => request('/settings/seed', { method: 'POST' }),
  resetDemoData: () => request('/settings/reset', { method: 'POST' }),
};
