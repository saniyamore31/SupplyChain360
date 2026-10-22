import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading live data from server...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
      color: '#64748b',
    }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563eb', marginBottom: '0.75rem' }} />
      <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, actionText, onAction }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3.5rem 1.5rem',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px dashed #cbd5e1',
      margin: '1rem 0',
    }}>
      {Icon && (
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: '#f1f5f9',
          color: '#64748b',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}>
          <Icon size={24} />
        </div>
      )}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
        {message}
      </p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          {actionText}
        </button>
      )}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div style={{
      padding: '1.25rem',
      borderRadius: '10px',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#991b1b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      margin: '1rem 0',
    }}>
      <div style={{ fontSize: '0.875rem' }}>
        <strong>Error: </strong> {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: '#ffffff',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#b91c1c',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
