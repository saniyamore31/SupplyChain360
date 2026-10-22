import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Database,
  CheckCircle,
  AlertTriangle,
  Building,
  Coins,
  ShieldAlert,
  Server
} from 'lucide-react';
import { api } from '../services/api';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import { LoadingState, ErrorMessage } from '../components/FeedbackStates';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    business_name: '',
    currency_code: 'INR',
    currency_symbol: '₹',
    low_stock_threshold_multiplier: '1.0',
  });
  const [diagnostics, setDiagnostics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Demo Reset Modal
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSettings();
      if (res.success) {
        setSettings(res.settings);
        setDiagnostics(res.diagnostics);
      }
    } catch (err) {
      setError(err.message || 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSettings(settings);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    setResetting(true);
    try {
      const res = await api.resetDemoData();
      if (res.success) {
        setResetDialogOpen(false);
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => setFeedback(null), 5000);
        fetchSettings();
      }
    } catch (err) {
      setResetDialogOpen(false);
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <LoadingState message="Loading system settings and database diagnostics..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchSettings} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px' }}>
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
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Business Configuration Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Building size={20} color="#2563eb" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Enterprise Profile & Currency Preferences
          </h3>
        </div>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
          These preferences are persisted directly into the SQLite <code>app_settings</code> table and apply across all operational modules.
        </p>

        <form onSubmit={handleSaveSettings}>
          <FormField
            id="business_name"
            label="Enterprise Legal Entity Name"
            required
            value={settings.business_name}
            onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
            placeholder="e.g. SupplyChain360 Global Logistics Ltd"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              id="currency_code"
              label="Default Currency Code (ISO)"
              required
              value={settings.currency_code}
              onChange={(e) => setSettings({ ...settings, currency_code: e.target.value.toUpperCase() })}
              placeholder="INR, USD, EUR..."
              helpText="Used for transaction invoicing"
            />
            <FormField
              id="currency_symbol"
              label="Currency Display Symbol"
              required
              value={settings.currency_symbol}
              onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
              placeholder="₹, $, €..."
              helpText="Used in dashboard tables & charts"
            />
          </div>

          <FormField
            id="low_stock_multiplier"
            label="Dynamic Safety Stock Multiplier"
            type="number"
            step="0.1"
            min="0.5"
            value={settings.low_stock_threshold_multiplier}
            onChange={(e) => setSettings({ ...settings, low_stock_threshold_multiplier: e.target.value })}
            helpText="Scale factor applied to standard target-stock calculations (Default: 1.0)"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Database Diagnostics Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Server size={20} color="#10b981" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Database Diagnostics & Persistence Engine
          </h3>
        </div>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
          Real-time metrics from the local SQLite persistent database instance.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Database Engine</span>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#0f172a' }}>{diagnostics?.database_type}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Engine Version</span>
            <p style={{ margin: '0.2rem 0 0', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>v{diagnostics?.sqlite_version}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Active Products</span>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#2563eb' }}>{diagnostics?.counts?.products} records</p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Suppliers</span>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#10b981' }}>{diagnostics?.counts?.suppliers} records</p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Purchase Orders</span>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#d97706' }}>{diagnostics?.counts?.purchase_orders} records</p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Demand History</span>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#7c3aed' }}>{diagnostics?.counts?.demand_records} entries</p>
          </div>
        </div>
      </div>

      {/* Demonstration Data Management */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #fee2e2',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <ShieldAlert size={20} color="#dc2626" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
            Demonstration Data & Reset Operations
          </h3>
        </div>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#7f1d1d' }}>
          Resetting will clear all existing transactional records and restore the clean demonstration dataset with 20 products, 6 suppliers, 12 purchase orders, and 90 days of demand records.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Requires explicit user confirmation to safeguard data integrity.
          </div>
          <button
            onClick={() => setResetDialogOpen(true)}
            className="btn btn-danger"
          >
            <RotateCcw size={16} /> Reset to Clean Demo State
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleResetDemoData}
        title="Confirm Demonstration Data Reset"
        message="Are you sure you want to reset the database? All currently saved products, suppliers, orders, and customized settings will be cleared and replaced with the clean reproducible synthetic demonstration dataset."
        confirmText="Yes, Wipe & Reset Database"
        danger
        loading={resetting}
      />
    </div>
  );
}
