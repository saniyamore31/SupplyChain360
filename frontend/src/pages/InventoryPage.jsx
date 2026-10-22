import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import { LoadingState, ErrorMessage } from '../components/FeedbackStates';
import { formatCurrency, formatNumber } from '../utils/formatters';

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Filter & pagination states
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    stock_quantity: 0,
    reorder_level: 10,
    unit_cost: 0.0,
    supplier_id: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch initial suppliers for dropdown
  useEffect(() => {
    api.getSuppliers('per_page=100').then((res) => {
      if (res.success) setSuppliers(res.suppliers || []);
    }).catch(() => {});
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
        search: search.trim(),
        category: category,
        status: status,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const res = await api.getProducts(queryParams.toString());
      if (res.success) {
        setProducts(res.products);
        setTotal(res.total);
        setTotalPages(res.pages);
        if (res.categories) setCategories(res.categories);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, category, status, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: categories[0] || 'Electronics',
      stock_quantity: 0,
      reorder_level: 10,
      unit_cost: 0.0,
      supplier_id: suppliers[0]?.id || '',
      description: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      stock_quantity: prod.stock_quantity,
      reorder_level: prod.reorder_level,
      unit_cost: prod.unit_cost,
      supplier_id: prod.supplier_id || '',
      description: prod.description || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    try {
      const payload = {
        ...formData,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
      };

      let res;
      if (editingProduct) {
        res = await api.updateProduct(editingProduct.id, payload);
      } else {
        res = await api.createProduct(payload);
      }

      if (res.success) {
        setIsModalOpen(false);
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 4000);
        fetchProducts();
      }
    } catch (err) {
      if (err.data?.errors) {
        setFormErrors(err.data.errors);
      } else {
        setFeedback({ type: 'error', message: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (prod) => {
    setProductToDelete(prod);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const res = await api.deleteProduct(productToDelete.id);
      if (res.success) {
        setDeleteDialogOpen(false);
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 4000);
        fetchProducts();
      }
    } catch (err) {
      setDeleteDialogOpen(false);
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Product Details',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
            SKU: {row.sku}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: false,
      render: (val) => (
        <span style={{
          fontSize: '0.75rem',
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          background: '#f1f5f9',
          color: '#475569',
          fontWeight: 600,
        }}>
          {val}
        </span>
      ),
    },
    {
      key: 'stock_quantity',
      label: 'Current Stock',
      sortable: true,
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, color: row.is_low_stock ? '#b45309' : '#0f172a' }}>
            {formatNumber(val)}
          </span>
          <StatusBadge
            type="stock"
            status={val === 0 ? 'critical' : row.is_low_stock ? 'low' : 'healthy'}
          />
        </div>
      ),
    },
    {
      key: 'reorder_level',
      label: 'Reorder Threshold',
      sortable: false,
      render: (val) => <span style={{ color: '#64748b' }}>{formatNumber(val)} units</span>,
    },
    {
      key: 'unit_cost',
      label: 'Unit Cost',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'inventory_value',
      label: 'Inventory Value',
      sortable: true,
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#1e293b' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      key: 'supplier_name',
      label: 'Supplier',
      sortable: false,
      render: (val) => val || <span style={{ color: '#94a3b8' }}>None</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Feedback Alert */}
      {feedback && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: feedback.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '0.875rem',
        }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Control Bar: Search, Filters, Add Product */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 240px', maxWidth: '380px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ padding: '0.55rem 0.85rem' }}>
            Search
          </button>
        </form>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#ffffff',
              color: '#334155',
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Stock Status Dropdown */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#ffffff',
              color: '#334155',
            }}
          >
            <option value="all">All Stock Levels</option>
            <option value="low_stock">Low Stock Only</option>
            <option value="in_stock">Healthy Stock</option>
          </select>

          {/* Add Product Button */}
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      {loading ? (
        <LoadingState message="Loading catalog inventory..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchProducts} />
      ) : (
        <DataTable
          columns={columns}
          data={products}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          sortColumn={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          actions={(row) => (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => openEditModal(row)}
                aria-label={`Edit ${row.name}`}
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.35rem 0.5rem',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                <Edit size={15} />
              </button>
              <button
                onClick={() => confirmDelete(row)}
                aria-label={`Delete ${row.name}`}
                style={{
                  background: 'none',
                  border: '1px solid #fee2e2',
                  borderRadius: '6px',
                  padding: '0.35rem 0.5rem',
                  cursor: 'pointer',
                  color: '#dc2626',
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        />
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}
      >
        <form onSubmit={handleSaveProduct}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              id="name"
              label="Product Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g. Lithium Battery Pack 24V"
            />
            <FormField
              id="sku"
              label="Unique SKU"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              error={formErrors.sku}
              placeholder="e.g. ELEC-BAT-102"
              helpText="Standardized inventory code"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              id="category"
              label="Category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              error={formErrors.category}
              placeholder="e.g. Electronics"
            />
            <FormField
              id="supplier_id"
              label="Primary Supplier"
              type="select"
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              options={[
                { value: '', label: 'Select a Supplier (Optional)' },
                ...suppliers.map((s) => ({ value: s.id, label: `${s.company_name} (${s.lead_time_days}d lead)` })),
              ]}
              error={formErrors.supplier_id}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <FormField
              id="stock_quantity"
              label="Stock Quantity"
              type="number"
              required
              min="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              error={formErrors.stock_quantity}
            />
            <FormField
              id="reorder_level"
              label="Reorder Threshold"
              type="number"
              required
              min="0"
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
              error={formErrors.reorder_level}
              helpText="Alerts when stock is ≤ this"
            />
            <FormField
              id="unit_cost"
              label="Unit Cost (₹)"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
              error={formErrors.unit_cost}
            />
          </div>

          <FormField
            id="description"
            label="Product Description"
            type="textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Technical details, specifications, packaging dimensions..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${productToDelete?.name}" (${productToDelete?.sku})? If this product has historical purchase order records, deletion will be blocked to preserve audit integrity.`}
        confirmText="Delete Product"
        danger
        loading={deleting}
      />
    </div>
  );
}
