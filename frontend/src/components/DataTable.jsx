import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  total,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No records found matching your filters.',
  actions,
}) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                const canSort = col.sortable && onSort;

                return (
                  <th
                    key={col.key}
                    onClick={() => canSort && onSort(col.key)}
                    style={{
                      padding: '0.85rem 1.25rem',
                      fontWeight: 600,
                      color: '#475569',
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: canSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{col.label}</span>
                      {canSort && (
                        <span style={{ color: isSorted ? '#2563eb' : '#94a3b8' }}>
                          {isSorted ? (
                            sortDirection === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />
                          ) : (
                            <ArrowUpDown size={13} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              {actions && (
                <th style={{
                  padding: '0.85rem 1.25rem',
                  fontWeight: 600,
                  color: '#475569',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  textAlign: 'right',
                }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {!data || data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  style={{
                    borderBottom: rowIdx === data.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: '0.85rem 1.25rem', color: '#1e293b' }}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          fontSize: '0.82rem',
          color: '#64748b',
        }}>
          <div>
            Showing Page <strong style={{ color: '#0f172a' }}>{currentPage}</strong> of{' '}
            <strong style={{ color: '#0f172a' }}>{totalPages}</strong> {total !== undefined && `(${total} total records)`}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.5 : 1,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.5 : 1,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
