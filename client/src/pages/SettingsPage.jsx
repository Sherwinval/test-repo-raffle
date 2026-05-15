import { useEffect, useState } from 'react';
import { PageShell } from './PageShell';
import { fetchSystemSettings, saveSystemSettings, testEmailSimulation } from '@/features/settings/settings.service';

const SECTIONS = [
  { id: 'system', label: 'System' },
  { id: 'profile', label: 'Profile' }
];

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="tiny-copy" style={{ opacity: 0.6 }}>{hint}</p>}
    </div>
  );
}

function SystemSection() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSystemSettings().then(setData).catch((e) => setError(e.message));
  }, []);

  function set(key, value) {
    setData({ ...data, [key]: value });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveSystemSettings(data);
      setData(saved);
      setMessage('Saved.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEmailSimulationTest() {
    setMessage('');
    setError('');
    try {
      const result = await testEmailSimulation();
      setMessage(result.message || 'Email sent (simulated).');
    } catch (e) {
      setError(e.message);
    }
  }

  if (!data) return <p className="tiny-copy">Loading...</p>;

  return (
    <div>
      {error && <div className="error-card" style={{ marginBottom: '1rem' }}>{error}</div>}
      {message && <p className="tiny-copy" style={{ color: '#22c55e', marginBottom: '1rem' }}>{message}</p>}

      <section className="soft-card" style={{ marginBottom: '1rem' }}>
        <p className="card-heading">Branding</p>
        <Field label="Brand name">
          <input type="text" className="event-input" value={data.brandName || ''} onChange={(e) => set('brandName', e.target.value)} />
        </Field>
        <Field label="Accent color (hex)">
          <input type="text" className="event-input" value={data.accentColor || ''} onChange={(e) => set('accentColor', e.target.value)} placeholder="#ef4444" />
        </Field>
        <Field label="Logo URL">
          <input type="text" className="event-input" value={data.logoUrl || ''} onChange={(e) => set('logoUrl', e.target.value)} />
        </Field>
      </section>

      <section className="soft-card" style={{ marginBottom: '1rem' }}>
        <p className="card-heading">Email simulation</p>
        <p className="tiny-copy" style={{ marginBottom: '0.75rem' }}>
          Emails are simulated only. The system logs a successful send message and does not deliver to real inboxes.
        </p>
        <button type="button" className="btn-ghost" style={{ marginRight: '0.5rem' }} onClick={handleEmailSimulationTest}>Simulate email send</button>
      </section>

      <section className="soft-card" style={{ marginBottom: '1rem' }}>
        <p className="card-heading">Data retention</p>
        <Field label="Retention (days; 0 = forever)" hint="Applies to participants, draws, and audit logs.">
          <input type="number" className="event-input" value={data.retentionDays ?? 0} onChange={(e) => set('retentionDays', parseInt(e.target.value) || 0)} />
        </Field>
      </section>

      <button type="button" className="btn-primary action-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save system settings'}
      </button>
    </div>
  );
}

function ProfileSection() {
  return (
    <div className="soft-card">
      <p className="card-heading">Your profile</p>
      <p className="tiny-copy">Profile editing will be enabled once the authentication layer ships. Notification preferences are managed under <a href="#/notifications">Notifications</a>.</p>
    </div>
  );
}

export function SettingsPage({ section }) {
  const initial = section && SECTIONS.find((s) => s.id === section) ? section : 'system';
  const [active, setActive] = useState(initial);

  return (
    <PageShell breadcrumb="Dashboard / Settings" title="Settings" subtitle="System configuration and personal preferences.">
      <div className="tab-wrap" style={{ marginBottom: '1rem' }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`tab-btn ${active === s.id ? 'tab-btn--active' : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {active === 'system' && <SystemSection />}
      {active === 'profile' && <ProfileSection />}
    </PageShell>
  );
}

