import React from 'react';

export default function FormField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  options = [], // For select fields
  rows = 3,     // For textareas
  disabled = false,
  helpText,
  min,
  step,
}) {
  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.8rem',
    borderRadius: '8px',
    border: `1px solid ${error ? '#ef4444' : '#cbd5e1'}`,
    fontSize: '0.875rem',
    color: '#0f172a',
    backgroundColor: disabled ? '#f8fafc' : '#ffffff',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#334155',
          marginBottom: '0.35rem',
        }}
      >
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>

      {type === 'select' ? (
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={inputStyle}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          step={step}
          style={inputStyle}
        />
      )}

      {helpText && !error && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          {helpText}
        </p>
      )}

      {error && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#dc2626', fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  );
}
