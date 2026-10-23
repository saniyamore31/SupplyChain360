import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Building2, Phone, Mail, Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import { LoadingState, ErrorMessage } from '../components/FeedbackStates';

export default function SuppliersPage() {
  const { canManageInventory } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    lead_time_days: 7,
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '12',
        search: search.trim(),
      });
      const res = await api.getSuppliers(queryParams.toString());
      if (res.success) {
        setSuppliers(res.suppliers);
        setTotal(res.total);
        setTotalPages(res.pages);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSuppliers();
  };

  const openCreateModal = () => {
    if (!canManageInventory) return;
    setEditingSupplier(null);
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      lead_time_days: 7,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (sup) => {
    if (!canManageInventory) return;
    setEditingSupplier(sup);
    setFormData({
      company_name: sup.company_name,
      contact_person: sup.contact_person,
      email: sup.email,
      phone: sup.phone,
      address: sup.address || '',
      lead_time_days: sup.lead_time_days,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openDetailModal = async (sup) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const res = await api.getSupplier(sup.id);
      if (res.success) {
        setActiveSupplier(res.supplier);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    try {
      let res;
      if (editingSupplier) {
        res = await api.updateSupplier(editingSupplier.id, formData);
      } else {
        res = await api.createSupplier(formData);
      }

      if (res.success) {
        setIsFormOpen(false);
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 4000);
        fetchSuppliers();
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

  const confirmDelete = (sup) => {
    setSupplierToDelete(sup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setDeleting(true);
    try {
      const res = await api.deleteSupplier(supplierToDelete.id);
      if (res.success) {
        setDeleteDialogOpen(false);
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 4000);
        fetchSuppliers();
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
      key: 'company_name',
      label: 'Supplier Organization',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{val}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Contact: {row.contact_person}</div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contact Info',
      render: (val, row) => (
        <div style={{ fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb' }}>
            <Mail size={13} /> {val}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', marginTop: '0.15rem' }}>
            <Phone size={13} /> {row.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'lead_time_days',
      label: 'Fulfillment Lead Time',
      render: (val) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          background: '#eff6ff',
          color: '#1d4ed8',
          fontWeight: 600,
          fontSize: '0.78rem',
        }}>
          <Clock size={13} /> {val} Days
        </span>
      ),
    },
    {
      key: 'products_count',
      label: 'Assigned Catalog',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#334155' }}>
          {val} products
        </span>
      ),
    },
    {
      key: 'orders_count',
      label: 'PO Orders',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#334155' }}>
          {val} orders
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Feedback banner */}
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 240px', maxWidth: '380px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by company, contact person, or email..."
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

        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          disabled={!canManageInventory}
          title={canManageInventory ? 'Register new vendor supplier' : 'Requires Inventory Manager or Admin role'}
          style={!canManageInventory ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <Plus size={16} /> Register Supplier
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading vendor supplier directory..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchSuppliers} />
      ) : (
        <DataTable
          columns={columns}
          data={suppliers}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          actions={(row) => (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => openDetailModal(row)}
                title="View Supplier Details & Products"
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.35rem 0.5rem',
                  cursor: 'pointer',
                  color: '#2563eb',
                }}
              >
                <Eye size={15} />
              </button>
              {canManageInventory ? (
                <>
                  <button
                    onClick={() => openEditModal(row)}
                    title="Edit Supplier"
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
                    title="Delete Supplier"
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
                </>
              ) : null}
            </div>
          )}
        />
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.company_name}` : 'Register New Vendor Supplier'}
      >
        <form onSubmit={handleSaveSupplier}>
          <FormField
            id="company_name"
            label="Company Name"
            required
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            error={formErrors.company_name}
            placeholder="e.g. Apex Industrial Polymers Ltd"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              id="contact_person"
              label="Contact Person Name"
              required
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              error={formErrors.contact_person}
              placeholder="e.g. Rajesh Nair"
            />
            <FormField
              id="lead_time_days"
              label="Lead Time (Days)"
              type="number"
              required
              min="1"
              value={formData.lead_time_days}
              onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
              error={formErrors.lead_time_days}
              helpText="Delivery turnaround time"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              id="email"
              label="Business Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              placeholder="orders@vendor-domain.com"
            />
            <FormField
              id="phone"
              label="Contact Phone"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              placeholder="+91 98765 43210"
            />
          </div>

          <FormField
            id="address"
            label="Facility / Factory Address"
            type="textarea"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Industrial Estate, Unit 14, Plot 3..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Detail View Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={activeSupplier?.company_name || 'Supplier Profile'}
        maxWidth="700px"
      >
        {loadingDetail || !activeSupplier ? (
          <LoadingState message="Loading supplier profile and catalog..." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Primary Contact</span>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#0f172a' }}>{activeSupplier.contact_person}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Email Address</span>
                <p style={{ margin: '0.2rem 0 0', color: '#2563eb', fontWeight: 600 }}>{activeSupplier.email}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Phone Number</span>
                <p style={{ margin: '0.2rem 0 0', color: '#334155' }}>{activeSupplier.phone}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Average Lead Time</span>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#10b981' }}>{activeSupplier.lead_time_days} Days</p>
              </div>
            </div>

            {activeSupplier.address && (
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Manufacturing / Dispatch Address:</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#334155' }}>{activeSupplier.address}</p>
              </div>
            )}

            {/* Associated Products */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.6rem' }}>
                Catalog Products Assigned to this Supplier ({activeSupplier.products?.length || 0})
              </h4>
              {!activeSupplier.products || activeSupplier.products.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No products currently mapped to this supplier.</p>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Product</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>SKU</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Stock Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSupplier.products.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>{p.sku}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>{p.stock_quantity} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${supplierToDelete?.company_name}"? If there are catalog products or active/historical purchase orders linked to this supplier, deletion will be safely rejected.`}
        confirmText="Delete Supplier"
        danger
        loading={deleting}
      />
    </div>
  );
}
