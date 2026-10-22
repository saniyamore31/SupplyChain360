import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  ShoppingBag,
  TrendingUp,
  Settings,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ lowStockCount = 0, isOpen = true, onClose }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : null, badgeColor: '#ef4444' },
    { name: 'Suppliers', path: '/suppliers', icon: Truck },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingBag },
    { name: 'Demand Analytics', path: '/demand', icon: TrendingUp },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40,
      transition: 'transform 0.2s ease-in-out',
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: '#2563eb',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.15rem',
          boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
        }}>
          360
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
            SupplyChain360
          </h1>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
            Enterprise Inventory & SCM
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '1.25rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ padding: '0 0.5rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Operations & Analytics
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563eb' : '#475569',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={19} />
                <span>{item.name}</span>
              </div>

              {item.badge && (
                <span style={{
                  background: item.badgeColor,
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Database Status & System Indicator */}
      <div style={{
        padding: '1rem',
        margin: '0.85rem',
        borderRadius: '10px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>SQLite DB Active</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
          Local development store with transactional ORM persistence.
        </p>
      </div>
    </aside>
  );
}
