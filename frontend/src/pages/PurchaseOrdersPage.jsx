import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  Truck,
  PackageCheck,
  XCircle,
  Trash2,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import { LoadingState, ErrorMessage } from '../components/FeedbackStates';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';

export default function PurchaseOrdersPage() {
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [suppliers, setSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [orderForm, setOrderForm] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'draft',
    notes: '',
    items: [{ product_id: '', quantity: 10, unit_price: 0.0 }],
  });

  // View / Action Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(false);

  // Fetch Suppliers and Products
  useEffect(() => {
    Promise.all([
      api.getSuppliers('per_page=100'),
      api.getProducts('per_page=100')
    ]).then(([supRes, prodRes]) => {
      if (supRes.success) setSuppliers(supRes.suppliers || []);
      if (prodRes.success) setAllProducts(prodRes.products || []);
    }).catch(() => {});
  }, []);

  // Pre-fill from recommendation / dashboard state if present
  useEffect(() => {
    if (location.state?.openCreate && allProducts.length > 0) {
      const { supplier_id, product_id, quantity, unit_price } = location.state;
      setOrderForm({
        supplier_id: supplier_id || '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        status: 'draft',
        notes: 'Initiated via automated inventory reorder recommendation.',
        items: [{
          product_id: product_id || allProducts[0]?.id || '',
          quantity: quantity || 20,
          unit_price: unit_price || 0.0
        }],
      });
      setIsCreateOpen(true);
    }
  }, [location.state, allProducts]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '12',
        search: search.trim(),
        status: statusFilter,
      });

      const res = await api.getOrders(queryParams.toString());
      if (res.success) {
        setOrders(res.orders);
        setTotal(res.total);
        setTotalPages(res.pages);
      }
    } catch (err) {
      setError(err.message || 'Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openViewModal = async (orderId) => {
    setLoadingOrder(true);
    setViewModalOpen(true);
    try {
      const res = await api.getOrder(orderId);
      if (res.success) {
        setSelectedOrder(res.order);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
      setViewModalOpen(false);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleStatusTransition = async (newStatus) => {
    if (!selectedOrder) return;
    setProcessingStatus(true);
    try {
      let res;
      if (newStatus === 'delivered') {
        res = await api.receiveOrder(selectedOrder.id);
      } else {
        res = await api.updateOrderStatus(selectedOrder.id, newStatus);
      }

      if (res.success) {
        setSelectedOrder(res.order);
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 5000);
        fetchOrders();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setProcessingStatus(false);
    }
  };

  // Form item handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...orderForm.items];
    updated[index][field] = value;

    // If product changed, auto-fill unit_price from catalog
    if (field === 'product_id') {
      const prod = allProducts.find((p) => p.id === Number(value));
      if (prod) {
        updated[index].unit_price = prod.unit_cost;
      }
    }

    setOrderForm({ ...orderForm, items: updated });
  };

  const addItemRow = () => {
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, { product_id: allProducts[0]?.id || '', quantity: 10, unit_price: allProducts[0]?.unit_cost || 0.0 }],
    });
  };

  const removeItemRow = (index) => {
    if (orderForm.items.length <= 1) return;
    const updated = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: updated });
  };

  const calculateFormTotal = () => {
    return orderForm.items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unit_price) || 0;
      return sum + q * p;
    }, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSaving(true);
    setCreateErrors({});

    try {
      const payload = {
        supplier_id: Number(orderForm.supplier_id),
        order_date: orderForm.order_date,
        expected_delivery_date: orderForm.expected_delivery_date || undefined,
        status: orderForm.status,
        notes: orderForm.notes,
        items: orderForm.items.map((it) => ({
          product_id: Number(it.product_id),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })),
      };

      const res = await api.createOrder(payload);
      if (res.success) {
        setIsCreateOpen(false);
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 4000);
        fetchOrders();
      }
    } catch (err) {
      if (err.data?.errors) {
        setCreateErrors(err.data.errors);
      } else {
        setFeedback({ type: 'error', message: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'order_number',
      label: 'Order Reference',
      render: (val) => (
        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'supplier_name',
      label: 'Vendor Supplier',
      render: (val) => val || '—',
    },
    {
      key: 'order_date',
      label: 'Order Date',
      render: (val) => formatDate(val),
    },
    {
      key: 'expected_delivery_date',
      label: 'Expected Delivery',
      render: (val) => formatDate(val),
    },
    {
      key: 'status',
      label: 'Pipeline Status',
      render: (val) => <StatusBadge type="order" status={val} />,
    },
    {
      key: 'item_count',
      label: 'Line Items',
      render: (val) => `${val} item(s)`,
    },
    {
      key: 'total_amount',
      label: 'Total Value',
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#0f172a' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Feedback Banner */}
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

      {/* Control Bar */}
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
              placeholder="Search by PO-YYYY-XXXX..."
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
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
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="shipped">In Transit (Shipped)</option>
            <option value="delivered">Delivered & Received</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => {
              setOrderForm({
                supplier_id: suppliers[0]?.id || '',
                order_date: new Date().toISOString().split('T')[0],
                expected_delivery_date: '',
                status: 'draft',
                notes: '',
                items: [{ product_id: allProducts[0]?.id || '', quantity: 10, unit_price: allProducts[0]?.unit_cost || 0.0 }],
              });
              setCreateErrors({});
              setIsCreateOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Create Purchase Order
          </button>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingState message="Loading procurement orders..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchOrders} />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          actions={(row) => (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => openViewModal(row.id)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
              >
                <Eye size={14} /> View Details
              </button>
            </div>
          )}
        />
      )}

      {/* View & Process Order Details Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={selectedOrder ? `Purchase Order: ${selectedOrder.order_number}` : 'Order Inspection'}
        maxWidth="750px"
      >
        {loadingOrder || !selectedOrder ? (
          <LoadingState message="Fetching order invoice and line items..." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Supplier Vendor</span>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#0f172a' }}>{selectedOrder.supplier_name}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Order Date</span>
                <p style={{ margin: '0.2rem 0 0', color: '#334155' }}>{formatDate(selectedOrder.order_date)}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Expected Delivery</span>
                <p style={{ margin: '0.2rem 0 0', color: '#334155' }}>{formatDate(selectedOrder.expected_delivery_date)}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Current Status</span>
                <div style={{ marginTop: '0.2rem' }}>
                  <StatusBadge type="order" status={selectedOrder.status} />
                </div>
              </div>
            </div>

            {/* Inventory Receipt Banner */}
            {selectedOrder.is_received ? (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <CheckCircle size={18} />
                <span>
                  <strong>Inventory Received & Verified: </strong>
                  Stock items were securely received into active inventory on {formatDate(selectedOrder.received_at)}.
                  Duplicate receipt is safely prevented to avoid double-counting.
                </span>
              </div>
            ) : selectedOrder.status === 'cancelled' ? (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.82rem',
              }}>
                This order was cancelled. Cancelled orders cannot be received into inventory.
              </div>
            ) : null}

            {/* Line Items Table */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.6rem' }}>
                Order Line Items ({selectedOrder.items?.length || 0})
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>Item Description</th>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>SKU</th>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>Quantity</th>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.6rem 0.85rem', fontWeight: 600 }}>{item.product_name}</td>
                        <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>{item.product_sku}</td>
                        <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontWeight: 700 }}>{formatNumber(item.quantity)}</td>
                        <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                        <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan="4" style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 700 }}>Total Order Value:</td>
                      <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#2563eb' }}>
                        {formatCurrency(selectedOrder.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Action Transitions */}
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Pipeline Transitions (Enforces transactional business logic)
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedOrder.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleStatusTransition('pending')}
                      disabled={processingStatus}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <Clock size={14} /> Submit as Pending
                    </button>
                    <button
                      onClick={() => handleStatusTransition('cancelled')}
                      disabled={processingStatus}
                      className="btn btn-danger"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {selectedOrder.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusTransition('shipped')}
                      disabled={processingStatus}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <Truck size={14} /> Mark as In Transit (Shipped)
                    </button>
                    <button
                      onClick={() => handleStatusTransition('cancelled')}
                      disabled={processingStatus}
                      className="btn btn-danger"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {selectedOrder.status === 'shipped' && (
                  <>
                    <button
                      onClick={() => handleStatusTransition('delivered')}
                      disabled={processingStatus}
                      className="btn btn-primary"
                      style={{ background: '#10b981', borderColor: '#059669', fontSize: '0.8rem' }}
                    >
                      <PackageCheck size={16} /> Confirm Receipt & Add to Inventory
                    </button>
                    <button
                      onClick={() => handleStatusTransition('cancelled')}
                      disabled={processingStatus}
                      className="btn btn-danger"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {selectedOrder.status === 'delivered' && (
                  <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle size={15} /> Order Delivered & Fully Received
                  </span>
                )}

                {selectedOrder.status === 'cancelled' && (
                  <span style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <XCircle size={15} /> Order Cancelled
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Purchase Order"
        maxWidth="800px"
      >
        <form onSubmit={handleCreateOrder}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              id="supplier_id"
              label="Supplier Vendor"
              type="select"
              required
              value={orderForm.supplier_id}
              onChange={(e) => setOrderForm({ ...orderForm, supplier_id: e.target.value })}
              options={[
                { value: '', label: 'Select a Supplier' },
                ...suppliers.map((s) => ({ value: s.id, label: `${s.company_name} (${s.lead_time_days} days lead)` })),
              ]}
              error={createErrors.supplier_id}
            />

            <FormField
              id="status"
              label="Initial Status"
              type="select"
              value={orderForm.status}
              onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
              options={[
                { value: 'draft', label: 'Draft (Save for review)' },
                { value: 'pending', label: 'Pending (Sent to supplier)' },
              ]}
              error={createErrors.status}
              helpText="Orders only add to stock once explicitly delivered."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              id="order_date"
              label="Order Date"
              type="date"
              required
              value={orderForm.order_date}
              onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
              error={createErrors.order_date}
            />
            <FormField
              id="expected_delivery_date"
              label="Expected Delivery Date (Optional)"
              type="date"
              value={orderForm.expected_delivery_date}
              onChange={(e) => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })}
              error={createErrors.expected_delivery_date}
              helpText="Defaults to order date + supplier lead time"
            />
          </div>

          {/* Dynamic Multi-line Items */}
          <div style={{ margin: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Purchase Order Line Items
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                <Plus size={14} /> Add Another Product
              </button>
            </div>

            {orderForm.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '0.65rem',
                  alignItems: 'end',
                  marginBottom: '0.75rem',
                  background: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Product Item
                  </label>
                  <select
                    value={item.product_id}
                    onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                    }}
                  >
                    <option value="">Select Product</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Subtotal
                  </label>
                  <div style={{
                    padding: '0.5rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    textAlign: 'right',
                  }}>
                    {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                  </div>
                </div>

                {orderForm.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '0.5rem',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {/* Total calculation indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>Estimated Total Order Value:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e40af' }}>{formatCurrency(calculateFormTotal())}</span>
            </div>
          </div>

          <FormField
            id="notes"
            label="Order Notes / Delivery Instructions"
            type="textarea"
            value={orderForm.notes}
            onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
            placeholder="Special packing notes, gate pass requirements, freight conditions..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Creating Order...' : 'Generate Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
