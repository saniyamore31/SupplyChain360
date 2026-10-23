import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Download,
  Filter,
  Package,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import ChartCard from '../components/ChartCard';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import { LoadingState, ErrorMessage } from '../components/FeedbackStates';
import { formatDate, formatNumber, formatCurrency } from '../utils/formatters';

export default function DemandAnalyticsPage() {
  const navigate = useNavigate();
  const { canManageOrders } = useAuth();

  const [activeTab, setActiveTab] = useState('demand'); // 'demand' or 'recommendations'
  const [demandRecords, setDemandRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters
  const [selectedProduct, setSelectedProduct] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch product catalog for dropdown
  useEffect(() => {
    api.getProducts('per_page=100').then((res) => {
      if (res.success) setProducts(res.products || []);
    }).catch(() => {});
  }, []);

  const fetchDemandAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '15',
        product_id: selectedProduct,
        start_date: startDate,
        end_date: endDate,
      });

      const summaryParams = new URLSearchParams({
        product_id: selectedProduct,
        days: '90',
      });

      const [recRes, sumRes, trendRes] = await Promise.all([
        api.getDemandRecords(queryParams.toString()),
        api.getDemandSummary(summaryParams.toString()),
        api.getDemandTrends(selectedProduct ? `product_id=${selectedProduct}` : '')
      ]);

      if (recRes.success) {
        setDemandRecords(recRes.demand_records);
        setTotalRecords(recRes.total);
        setTotalPages(recRes.pages);
      }
      if (sumRes.success) setSummary(sumRes);
      if (trendRes.success) setTrends(trendRes.trends);
    } catch (err) {
      setError(err.message || 'Failed to load demand analytics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await api.getReorderRecommendations();
      if (res.success) {
        setRecommendations(res.recommendations || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchDemandAnalytics();
  }, [page, selectedProduct, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'recommendations') {
      fetchRecommendations();
    }
  }, [activeTab]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      product_id: selectedProduct,
      start_date: startDate,
      end_date: endDate,
    });
    window.location.href = `/api/v1/demand/export?${params.toString()}`;
  };

  const demandColumns = [
    {
      key: 'date',
      label: 'Demand Date',
      render: (val) => formatDate(val),
    },
    {
      key: 'product_name',
      label: 'Product Item',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
            {row.product_sku} · {row.product_category}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity_demanded',
      label: 'Units Demanded',
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#2563eb' }}>
          {formatNumber(val)} units
        </span>
      ),
    },
    {
      key: 'channel',
      label: 'Distribution Channel',
      render: (val) => (
        <span style={{
          fontSize: '0.75rem',
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          background: '#f1f5f9',
          color: '#475569',
          fontWeight: 500,
        }}>
          {val}
        </span>
      ),
    },
    {
      key: 'is_synthetic',
      label: 'Data Integrity',
      render: (val) => (
        <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
          {val ? 'Synthetic Model Record' : 'Live Point-of-Sale'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Synthetic Data Disclaimer Banner */}
      <div style={{
        padding: '0.85rem 1.25rem',
        borderRadius: '10px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        color: '#92400e',
        fontSize: '0.82rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
      }}>
        <Info size={18} />
        <span>
          <strong>Synthetic Modeling Notice: </strong>
          All demand consumption numbers displayed below represent reproducible synthetic demonstration data.
          This dataset simulates 90 days of operational consumption for algorithmic inventory forecasting.
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('demand')}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'demand' ? '#2563eb' : 'transparent',
            color: activeTab === 'demand' ? '#ffffff' : '#64748b',
          }}
        >
          Consumption Trends & Records
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'recommendations' ? '#2563eb' : 'transparent',
            color: activeTab === 'recommendations' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Sparkles size={16} /> Rule-Based Reorder Recommendations
        </button>
      </div>

      {activeTab === 'demand' ? (
        <>
          {/* Summary KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}>
            <SummaryCard
              title="Total Demand (90 Days)"
              value={formatNumber(summary?.total_demand)}
              subtitle="Aggregated units consumed"
              icon={TrendingUp}
              color="emerald"
            />
            <SummaryCard
              title="Daily Consumption Rate"
              value={`${summary?.avg_daily_demand || 0} units/day`}
              subtitle="Average inventory velocity"
              icon={Calendar}
              color="blue"
            />
            <SummaryCard
              title="Top Demanded Item"
              value={summary?.top_products?.[0]?.name ? summary.top_products[0].name.substring(0, 18) + '...' : '—'}
              subtitle={`${summary?.top_products?.[0]?.total_demand || 0} units consumed`}
              icon={Package}
              color="purple"
            />
          </div>

          {/* Charts Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.5rem',
          }}>
            {/* Monthly Trend Area Chart */}
            <ChartCard
              title="Monthly Demand Velocity"
              subtitle="Aggregated units demanded by calendar month"
              height={260}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="demChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [formatNumber(val) + ' units', 'Demand']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="quantity" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#demChartGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top 5 Products Bar Chart */}
            <ChartCard
              title="Highest Velocity Products"
              subtitle="Top 5 items by total consumption"
              height={260}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.top_products || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="sku" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [formatNumber(val) + ' units', 'Total Demand']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="total_demand" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Filter Bar & CSV Export */}
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
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Product Filter */}
              <select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#334155',
                }}
              >
                <option value="">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>

              {/* Start Date */}
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#334155',
                }}
              />

              {/* End Date */}
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#334155',
                }}
              />
            </div>

            {/* Export CSV Button */}
            <button onClick={handleExportCSV} className="btn btn-secondary">
              <Download size={15} /> Export Filtered CSV
            </button>
          </div>

          {/* Demand Records Table */}
          {loading ? (
            <LoadingState message="Loading demand consumption records..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchDemandAnalytics} />
          ) : (
            <DataTable
              columns={demandColumns}
              data={demandRecords}
              total={totalRecords}
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        /* Rule-Based Reorder Recommendations Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Methodology Explainer Box */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Deterministic Supply Chain Replenishment Logic
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              This system does <strong>not</strong> rely on opaque black-box machine learning.
              Instead, it applies verified, industry-standard deterministic inventory equations:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
              marginTop: '1rem',
            }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>1. LEAD-TIME DEMAND</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                  Avg Daily Demand × Lead Time
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>2. TARGET STOCK BUFFER</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                  Lead-Time Demand + Safety Stock
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>3. SUGGESTED REORDER</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                  max(0, Target Stock − Current Stock)
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations Cards List */}
          {loadingRecs ? (
            <LoadingState message="Evaluating catalog demand velocity and lead-time equations..." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recommendations.map((rec) => (
                <div
                  key={rec.product_id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: `1px solid ${rec.is_reorder_needed ? '#fde68a' : '#e2e8f0'}`,
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: '1 1 320px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {rec.product_name}
                      </h4>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                        {rec.sku}
                      </span>
                      <StatusBadge type="urgency" status={rec.urgency} />
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                      {rec.reason}
                    </p>

                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem', color: '#64748b' }}>
                      <span>Current Stock: <strong style={{ color: '#0f172a' }}>{rec.current_stock}</strong></span>
                      <span>Reorder Level: <strong style={{ color: '#0f172a' }}>{rec.reorder_level}</strong></span>
                      <span>Vendor Lead Time: <strong style={{ color: '#0f172a' }}>{rec.lead_time_days} days</strong></span>
                      <span>Target Buffer: <strong style={{ color: '#0f172a' }}>{rec.target_stock_level}</strong></span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Suggested Reorder</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: rec.is_reorder_needed ? '#2563eb' : '#10b981' }}>
                        +{rec.suggested_reorder_quantity} units
                      </div>
                      {rec.is_reorder_needed && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Est. Cost: {formatCurrency(rec.estimated_cost)}
                        </div>
                      )}
                    </div>

                    {rec.is_reorder_needed && (
                      <button
                        onClick={() => navigate('/purchase-orders', {
                          state: {
                            openCreate: true,
                            supplier_id: rec.supplier_id,
                            product_id: rec.product_id,
                            quantity: rec.suggested_reorder_quantity,
                            unit_price: rec.unit_cost,
                          }
                        })}
                        disabled={!canManageOrders}
                        title={canManageOrders ? 'Draft purchase order from recommendation' : 'Requires Operations Manager or Admin role'}
                        className="btn btn-primary"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.4rem 0.85rem',
                          ...(!canManageOrders ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                        }}
                      >
                        Create Purchase Order <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
