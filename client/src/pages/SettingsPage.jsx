import { useEffect, useState } from 'react';
import { PageShell } from './PageShell';
import { fetchSystemSettings, saveSystemSettings, testSmtp } from '@/features/settings/settings.service';

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

  async function handleSmtpTest() {
    setMessage('');
    setError('');
    try {
      const result = await testSmtp();
      setMessage(`SMTP test ${result.ok ? 'succeeded' : 'queued (draft mode)'}.`);
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
          <input type="text" className="event-input" value={data.accentColor || ''} onChange={(e) => set('accentColor', e.target.value)} placeholder="#ff8c00" />
        </Field>
        <Field label="Logo URL">
          <input type="text" className="event-input" value={data.logoUrl || ''} onChange={(e) => set('logoUrl', e.target.value)} />
        </Field>
      </section>

      <section className="soft-card" style={{ marginBottom: '1rem' }}>
        <p className="card-heading">Email (SMTP)</p>
        <Field label="Host">
          <input type="text" className="event-input" value={data.smtpHost || ''} onChange={(e) => set('smtpHost', e.target.value)} />
        </Field>
        <Field label="Port">
          <input type="number" className="event-input" value={data.smtpPort || 587} onChange={(e) => set('smtpPort', parseInt(e.target.value) || 587)} />
        </Field>
        <Field label="Username">
          <input type="text" className="event-input" value={data.smtpUser || ''} onChange={(e) => set('smtpUser', e.target.value)} />
        </Field>
        <Field label="Password" hint="Stored encrypted; write-only.">
          <input type="password" className="event-input" placeholder={data.smtpPasswordMasked ? '••••••••' : ''} onChange={(e) => set('smtpPassword', e.target.value)} />
        </Field>
        <Field label="From address">
          <input type="email" className="event-input" value={data.smtpFrom || ''} onChange={(e) => set('smtpFrom', e.target.value)} />
        </Field>
        <Field label="Draft mode (suppress real sends)">
          <input type="checkbox" checked={!!data.draftMode} onChange={(e) => set('draftMode', e.target.checked)} />
        </Field>
        <button type="button" className="btn-ghost" style={{ marginRight: '0.5rem' }} onClick={handleSmtpTest}>Send test email</button>
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
