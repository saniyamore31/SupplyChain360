import React, { useState } from 'react';
import { Bell, Search, Menu, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ title, breadcrumb = 'Overview', lowStockAlerts = [], onToggleSidebar }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  return (
    <header style={{
      height: '68px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      {/* Title & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '0.25rem',
          }}
          className="mobile-menu-btn"
        >
          <Menu size={22} />
        </button>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {breadcrumb}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
            {title}
          </h2>
        </div>
      </div>

      {/* Action utilities & Demo User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Low Stock Alert Bell with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View low stock alerts"
            style={{
              position: 'relative',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={18} />
            {lowStockAlerts.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff',
              }}>
                {lowStockAlerts.length}
              </span>
            )}
          </button>

          {/* Notifications Flyout */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '320px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '1rem',
              zIndex: 50,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Low Stock Notifications</span>
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{lowStockAlerts.length} Active</span>
              </div>

              {lowStockAlerts.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>
                  All inventory items are currently healthy!
                </p>
              ) : (
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lowStockAlerts.slice(0, 5).map((a) => (
                    <div
                      key={a.product_id}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/inventory?status=low_stock');
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#92400e' }}>{a.name}</div>
                      <div style={{ color: '#b45309', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                        Stock: {a.current_stock} / Threshold: {a.reorder_level}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/inventory?status=low_stock');
                }}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.78rem', padding: '0.4rem' }}
              >
                View Low-Stock Inventory <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Demo User Profile Placeholder */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e0e7ff',
            color: '#3730a3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}>
            <User size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              Engineering Student
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Operations Lead (Demo)
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
