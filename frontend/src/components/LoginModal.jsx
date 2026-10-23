import React, { useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, AlertCircle, KeyRound, LogIn } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { login, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoUsername) => {
    setLoading(true);
    setError(null);
    try {
      await login(demoUsername, 'Password123');
      onClose();
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const demoRoles = [
    {
      role: 'admin',
      name: 'System Admin',
      username: 'admin',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      desc: 'Full administrative rights: Settings, demo reset, users & all CRUD.'
    },
    {
      role: 'operations_manager',
      name: 'Operations Lead',
      username: 'ops_manager',
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      desc: 'Procurement rights: Create POs, confirm safe receipt & demand analytics.'
    },
    {
      role: 'inventory_manager',
      name: 'Inventory Supervisor',
      username: 'inv_manager',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      desc: 'Catalog rights: Products CRUD, vendor directory, stock updates.'
    },
    {
      role: 'viewer',
      name: 'Guest / Auditor',
      username: 'viewer',
      color: '#64748b',
      bg: '#f8fafc',
      border: '#e2e8f0',
      desc: 'Read-only access: Can inspect dashboards and data without mutation rights.'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Authentication & Role Selection" maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Quick Role Selector for Portfolio Evaluators */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <KeyRound size={16} color="#2563eb" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              One-Click Demo Role Switcher
            </span>
          </div>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
            Select any predefined role below to test backend Role-Based Access Control (RBAC):
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            {demoRoles.map((dr) => {
              const isCurrent = user?.username === dr.username;
              return (
                <button
                  key={dr.role}
                  type="button"
                  onClick={() => handleQuickDemoLogin(dr.username)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${isCurrent ? dr.color : dr.border}`,
                    background: isCurrent ? dr.bg : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = dr.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isCurrent ? dr.bg : '#ffffff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: dr.color }}>
                      {dr.name}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, background: dr.color, color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        Active
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>
                    {dr.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Or log in manually</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Manual Credentials Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '0.65rem',
              borderRadius: '6px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.8rem',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <FormField
            id="username"
            label="Username or Email"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin, ops_manager, inv_manager, or viewer"
          />

          <FormField
            id="password"
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <LogIn size={15} /> {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
