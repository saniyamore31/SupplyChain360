import React from 'react';

export default function StatusBadge({ status, type = 'order' }) {
  if (!status) return null;

  let label = status;
  let bg = '#f1f5f9';
  let color = '#475569';
  let border = '#cbd5e1';

  if (type === 'order') {
    switch (status.toLowerCase()) {
      case 'draft':
        label = 'Draft';
        bg = '#f8fafc';
        color = '#64748b';
        border = '#cbd5e1';
        break;
      case 'pending':
        label = 'Pending';
        bg = '#fffbeb';
        color = '#b45309';
        border = '#fde68a';
        break;
      case 'shipped':
        label = 'In Transit';
        bg = '#eff6ff';
        color = '#1d4ed8';
        border = '#bfdbfe';
        break;
      case 'delivered':
        label = 'Delivered & Received';
        bg = '#ecfdf5';
        color = '#047857';
        border = '#a7f3d0';
        break;
      case 'cancelled':
        label = 'Cancelled';
        bg = '#fef2f2';
        color = '#b91c1c';
        border = '#fecaca';
        break;
      default:
        label = status;
    }
  } else if (type === 'stock') {
    switch (status) {
      case 'critical':
        label = 'Out of Stock';
        bg = '#fef2f2';
        color = '#b91c1c';
        border = '#fecaca';
        break;
      case 'low':
        label = 'Low Stock';
        bg = '#fffbeb';
        color = '#b45309';
        border = '#fde68a';
        break;
      case 'healthy':
        label = 'Healthy';
        bg = '#ecfdf5';
        color = '#047857';
        border = '#a7f3d0';
        break;
      default:
        label = status;
    }
  } else if (type === 'urgency') {
    switch (status.toUpperCase()) {
      case 'CRITICAL':
        label = 'Critical';
        bg = '#fef2f2';
        color = '#991b1b';
        border = '#fecaca';
        break;
      case 'HIGH':
        label = 'High Priority';
        bg = '#fff7ed';
        color = '#c2410c';
        border = '#ffedd5';
        break;
      case 'MEDIUM':
        label = 'Medium Priority';
        bg = '#fffbeb';
        color = '#b45309';
        border = '#fde68a';
        break;
      default:
        label = 'Normal';
        bg = '#ecfdf5';
        color = '#047857';
        border = '#a7f3d0';
    }
  }

  return (
    <span
      className="badge"
      style={{
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        padding: '0.2rem 0.65rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: color
      }} />
      {label}
    </span>
  );
}
