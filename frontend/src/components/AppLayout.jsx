import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { api } from '../services/api';

const routeTitles = {
  '/': { title: 'Operational Dashboard', breadcrumb: 'Overview & Metrics' },
  '/inventory': { title: 'Inventory Management', breadcrumb: 'Catalog & Stock Levels' },
  '/suppliers': { title: 'Supplier Directory', breadcrumb: 'Vendors & Partners' },
  '/purchase-orders': { title: 'Purchase Orders', breadcrumb: 'Procurement & Logistics' },
  '/demand': { title: 'Demand Analytics', breadcrumb: 'Consumption Trends' },
  '/settings': { title: 'Settings & Diagnostics', breadcrumb: 'System Configuration' },
};

export default function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  // Fetch low stock items for the topbar notification bell and sidebar badge
  const fetchAlerts = async () => {
    try {
      const res = await api.getLowStockAlerts();
      if (res.success) {
        setLowStockAlerts(res.alerts || []);
      }
    } catch {
      // Backend may be reloading
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000); // Poll every 20s
    return () => clearInterval(interval);
  }, [location.pathname]);

  const currentMeta = routeTitles[location.pathname] || {
    title: 'SupplyChain360',
    breadcrumb: 'Operations',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar
        lowStockCount={lowStockAlerts.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div style={{
        flex: 1,
        marginLeft: '260px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }} className="main-content-wrapper">
        <Topbar
          title={currentMeta.title}
          breadcrumb={currentMeta.breadcrumb}
          lowStockAlerts={lowStockAlerts}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main style={{ flex: 1, padding: '2rem' }}>
          <Outlet context={{ refreshAlerts: fetchAlerts }} />
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .main-content-wrapper {
            margin-left: 0 !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
