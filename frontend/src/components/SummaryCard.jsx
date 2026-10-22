import React from 'react';

export default function SummaryCard({ title, value, subtitle, icon: Icon, badge, color = 'blue', onClick }) {
  const colorMap = {
    blue: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    amber: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    emerald: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    purple: { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff' },
    rose: { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      className={onClick ? 'hover:shadow-md hover:border-blue-300' : ''}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: c.bg,
            color: c.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {value}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
          {badge && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
              background: c.bg,
              color: c.text,
              border: `1px solid ${c.border}`
            }}>
              {badge}
            </span>
          )}
          {subtitle && (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
