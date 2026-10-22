import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Boxes,
  AlertTriangle,
  Clock,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Layers,
  PieChart as PieIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend
} from 'recharts';

import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import ChartCard from '../components/ChartCard';
import { LoadingState, ErrorMessage } from '../components/FeedbackStates';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatNumber } from '../utils/formatters';

const STATUS_COLORS = {
  delivered: '#10b981',
  shipped: '#3b82f6',
  pending: '#f59e0b',
  draft: '#94a3b8',
  cancelled: '#ef4444'
};

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState([]);
  const [demandTrends, setDemandTrends] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, catRes, ordRes, demRes, lowRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getInventoryByCategory(),
        api.getOrdersByStatus(),
        api.getMonthlyDemandTrend(),
        api.getLowStockAlerts()
      ]);

      if (sumRes.success) setSummary(sumRes.summary);
      if (catRes.success) setCategories(catRes.categories);
      if (ordRes.success) setOrdersStatus(ordRes.orders_by_status);
      if (demRes.success) setDemandTrends(demRes.trends);
      if (lowRes.success) setLowStockAlerts(lowRes.alerts || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingState message="Loading live operational metrics and charts..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchDashboardData} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Valuation Methodology Banner */}
      <div style={{
        padding: '0.85rem 1.25rem',
        borderRadius: '10px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        color: '#1e40af',
        fontSize: '0.82rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <span>
            <strong>Deterministic Valuation: </strong>
            Total Inventory Valuation is calculated dynamically as the exact sum of{' '}
            <code>Current Stock Quantity × Unit Cost</code> across all registered product records.
          </span>
        </div>
        <button
          onClick={() => navigate('/settings')}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          View Settings <ExternalLink size={14} />
        </button>
      </div>

      {/* Summary KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
      }}>
        <SummaryCard
          title="Total Products"
          value={formatNumber(summary?.total_products)}
          subtitle="Unique SKUs tracked"
          icon={Package}
          color="blue"
          onClick={() => navigate('/inventory')}
        />
        <SummaryCard
          title="Units In Stock"
          value={formatNumber(summary?.total_units_in_stock)}
          subtitle="Physical inventory on hand"
          icon={Boxes}
          color="emerald"
          onClick={() => navigate('/inventory')}
        />
        <SummaryCard
          title="Low Stock Items"
          value={formatNumber(summary?.low_stock_count)}
          subtitle="At or below reorder level"
          badge={summary?.low_stock_count > 0 ? "Action Needed" : "Optimal"}
          icon={AlertTriangle}
          color={summary?.low_stock_count > 0 ? "rose" : "emerald"}
          onClick={() => navigate('/inventory?status=low_stock')}
        />
        <SummaryCard
          title="Open Purchase Orders"
          value={formatNumber(summary?.open_orders_count)}
          subtitle="Draft, Pending, or In Transit"
          icon={Clock}
          color="amber"
          onClick={() => navigate('/purchase-orders')}
        />
        <SummaryCard
          title="Total Inventory Value"
          value={formatCurrency(summary?.total_inventory_value)}
          subtitle="Calculated at unit cost"
          icon={IndianRupee}
          color="purple"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Inventory Units by Category */}
        <ChartCard
          title="Inventory Units by Category"
          subtitle="Physical distribution across categories"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(val) => [formatNumber(val) + ' units', 'Quantity']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="total_units" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Purchase Orders by Status */}
        <ChartCard
          title="Purchase Orders by Status"
          subtitle="Current procurement pipeline"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ordersStatus.filter(o => o.count > 0)}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {ordersStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name) => [val + ' orders', name.toUpperCase()]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend
                formatter={(val) => <span style={{ fontSize: '0.78rem', color: '#475569', textTransform: 'capitalize' }}>{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly Demand Consumption Trend */}
        <ChartCard
          title="Monthly Demand Trends"
          subtitle="Synthetic historical consumption volume"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demandTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(val) => [formatNumber(val) + ' units', 'Units Demanded']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Area type="monotone" dataKey="quantity" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#demandGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Critical Low Stock Action Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Inventory Reorder Action List
              </h3>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Products at or below reorder threshold. Quantities suggested using deterministic safety stock rules.
            </p>
          </div>

          <button
            onClick={() => navigate('/inventory')}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            All Products <ArrowRight size={14} />
          </button>
        </div>

        {lowStockAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981' }}>
            ✓ All inventory items are currently well above their reorder thresholds.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>Current Stock</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>Reorder Threshold</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>Supplier</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>Suggested Qty</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockAlerts.map((item) => (
                  <tr
                    key={item.product_id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#64748b' }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        background: item.current_stock === 0 ? '#fef2f2' : '#fffbeb',
                        color: item.current_stock === 0 ? '#991b1b' : '#92400e',
                        fontWeight: 700,
                      }}>
                        {item.current_stock} units
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {item.reorder_level} units
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      {item.supplier_name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>
                      +{item.suggested_reorder_quantity} units
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate('/purchase-orders', {
                          state: {
                            openCreate: true,
                            supplier_id: item.supplier_id,
                            product_id: item.product_id,
                            quantity: item.suggested_reorder_quantity,
                            unit_price: item.unit_cost
                          }
                        })}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      >
                        Create PO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
