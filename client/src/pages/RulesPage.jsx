import { useEffect, useState } from 'react';
import { PageShell } from './PageShell';
import { fetchEvents } from '@/features/entry-upload/entryUpload.service';
import { fetchRules, saveRules, previewRules } from '@/features/rules/rules.service';

const TIERS = ['MINI', 'MAJOR'];
const ATTRIBUTES = ['department', 'site', 'role'];
const OPERATORS = ['equals', 'not_equals'];

function CategoryEditor({ category, onChange, onRemove }) {
  return (
    <div className="event-card-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          className="event-input"
          placeholder="Category name (e.g. Mini Prize - Voucher)"
          value={category.name}
          onChange={(e) => onChange({ ...category, name: e.target.value })}
          style={{ flex: 2 }}
        />
        <select
          className="event-sort-select"
          value={category.tier}
          onChange={(e) => onChange({ ...category, tier: e.target.value })}
        >
          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="number"
          min="1"
          className="event-input"
          value={category.prizeCount}
          onChange={(e) => onChange({ ...category, prizeCount: parseInt(e.target.value) || 1 })}
          style={{ width: '90px' }}
        />
        <button type="button" className="btn-ghost-sm" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

function ConstraintEditor({ constraint, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
      <select className="event-sort-select" value={constraint.attribute} onChange={(e) => onChange({ ...constraint, attribute: e.target.value })}>
        {ATTRIBUTES.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <span className="tiny-copy">max per value</span>
      <input
        type="number"
        min="1"
        className="event-input"
        value={constraint.maxPerValue}
        onChange={(e) => onChange({ ...constraint, maxPerValue: parseInt(e.target.value) || 1 })}
        style={{ width: '90px' }}
      />
      <select className="event-sort-select" value={constraint.type} onChange={(e) => onChange({ ...constraint, type: e.target.value })}>
        <option value="HARD">HARD</option>
        <option value="SOFT">SOFT</option>
      </select>
      <button type="button" className="btn-ghost-sm" onClick={onRemove}>Remove</button>
    </div>
  );
}

function WeightEditor({ weight, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
      <select className="event-sort-select" value={weight.attribute} onChange={(e) => onChange({ ...weight, attribute: e.target.value })}>
        {ATTRIBUTES.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select className="event-sort-select" value={weight.operator} onChange={(e) => onChange({ ...weight, operator: e.target.value })}>
        {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <input
        type="text"
        className="event-input"
        placeholder="Value (e.g. Engineering)"
        value={weight.value}
        onChange={(e) => onChange({ ...weight, value: e.target.value })}
      />
      <span className="tiny-copy">multiplier</span>
      <input
        type="number"
        min="0.1"
        step="0.1"
        className="event-input"
        value={weight.multiplier}
        onChange={(e) => onChange({ ...weight, multiplier: parseFloat(e.target.value) || 1 })}
        style={{ width: '90px' }}
      />
      <button type="button" className="btn-ghost-sm" onClick={onRemove}>Remove</button>
    </div>
  );
}

export function RulesPage({ eventId, navigate }) {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState(eventId || '');
  const [rules, setRules] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEvents().then((evs) => {
      setEvents(evs);
      if (!activeEventId && evs.length > 0) setActiveEventId(evs[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!activeEventId) return;
    fetchRules(activeEventId).then(setRules).catch((e) => setError(e.message));
    previewRules(activeEventId).then(setPreview).catch(() => {});
  }, [activeEventId]);

  function updateCategory(idx, next) {
    setRules({ ...rules, categories: rules.categories.map((c, i) => i === idx ? next : c) });
  }

  function addCategory() {
    setRules({
      ...rules,
      categories: [...(rules.categories || []), { name: 'New category', tier: 'MINI', prizeCount: 1, displayOrder: rules.categories.length }]
    });
  }

  function removeCategory(idx) {
    setRules({ ...rules, categories: rules.categories.filter((_, i) => i !== idx) });
  }

  function addConstraint() {
    setRules({ ...rules, constraints: [...(rules.constraints || []), { attribute: 'department', maxPerValue: 1, type: 'HARD' }] });
  }

  function addWeight() {
    setRules({ ...rules, weights: [...(rules.weights || []), { attribute: 'department', operator: 'equals', value: '', multiplier: 1.5 }] });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveRules(activeEventId, rules);
      setRules(saved);
      const p = await previewRules(activeEventId);
      setPreview(p);
      setMessage('Saved.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const hasWeights = (rules?.weights || []).length > 0;

  return (
    <PageShell
      breadcrumb="Dashboard / Rules & Weights"
      title="Rules & Weights"
      subtitle="Configure prize categories, exclusion rules, draw constraints, and attribute weights per event."
      actions={
        <select className="event-sort-select" value={activeEventId} onChange={(e) => setActiveEventId(e.target.value)}>
          <option value="">— Select event —</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      }
    >
      {error && <div className="error-card" style={{ marginBottom: '1rem' }}>{error}</div>}
      {message && <p className="tiny-copy" style={{ color: '#22c55e', marginBottom: '1rem' }}>{message}</p>}
      {hasWeights && <div className="status-chip" style={{ marginBottom: '1rem' }}>Weighted draw configured</div>}

      {!activeEventId ? (
        <p className="tiny-copy">Select an event to configure rules.</p>
      ) : !rules ? (
        <p className="tiny-copy">Loading rules...</p>
      ) : (
        <>
          <section className="soft-card" style={{ marginBottom: '1rem' }}>
            <p className="card-heading">Prize categories</p>
            <p className="tiny-copy">Define what's drawn. MINI winners are excluded from the same MINI category only. MAJOR eligibility is preserved.</p>
            <div style={{ marginTop: '0.75rem' }}>
              {(rules.categories || []).map((c, idx) => (
                <CategoryEditor
                  key={c.id || idx}
                  category={c}
                  onChange={(next) => updateCategory(idx, next)}
                  onRemove={() => removeCategory(idx)}
                />
              ))}
              <button type="button" className="btn-ghost" style={{ marginTop: '0.5rem' }} onClick={addCategory}>+ Add category</button>
            </div>
          </section>

          <section className="soft-card" style={{ marginBottom: '1rem' }}>
            <p className="card-heading">Exclusion rules</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                checked={!!rules.crossCategoryExclusion}
                onChange={(e) => setRules({ ...rules, crossCategoryExclusion: e.target.checked })}
              />
              <span className="tiny-copy">Strict one-prize-per-person (cross-category exclusion)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                checked={!!rules.excludeInactive}
                onChange={(e) => setRules({ ...rules, excludeInactive: e.target.checked })}
              />
              <span className="tiny-copy">Exclude inactive/excluded participants from draws</span>
            </label>
          </section>

          <section className="soft-card" style={{ marginBottom: '1rem' }}>
            <p className="card-heading">Draw constraints (caps)</p>
            <p className="tiny-copy">Limit winners per attribute value (e.g. max 1 per department).</p>
            <div style={{ marginTop: '0.75rem' }}>
              {(rules.constraints || []).map((c, idx) => (
                <ConstraintEditor
                  key={c.id || idx}
                  constraint={c}
                  onChange={(next) => setRules({ ...rules, constraints: rules.constraints.map((x, i) => i === idx ? next : x) })}
                  onRemove={() => setRules({ ...rules, constraints: rules.constraints.filter((_, i) => i !== idx) })}
                />
              ))}
              <button type="button" className="btn-ghost" onClick={addConstraint}>+ Add constraint</button>
            </div>
          </section>

          <section className="soft-card" style={{ marginBottom: '1rem' }}>
            <p className="card-heading">Attribute weights</p>
            <p className="tiny-copy">Multiply odds for entries matching attributes. Default 1.0. Max {rules.weightCapMultiplier ?? 10}x.</p>
            <div style={{ marginTop: '0.75rem' }}>
              {(rules.weights || []).map((w, idx) => (
                <WeightEditor
                  key={w.id || idx}
                  weight={w}
                  onChange={(next) => setRules({ ...rules, weights: rules.weights.map((x, i) => i === idx ? next : x) })}
                  onRemove={() => setRules({ ...rules, weights: rules.weights.filter((_, i) => i !== idx) })}
                />
              ))}
              <button type="button" className="btn-ghost" onClick={addWeight}>+ Add weight rule</button>
            </div>
          </section>

          {preview && (
            <section className="soft-card" style={{ marginBottom: '1rem' }}>
              <p className="card-heading">Eligibility preview</p>
              <p className="tiny-copy">Total entries: {preview.totalEntries} · Eligible: {preview.eligible}</p>
              {(preview.byCategory || []).map((c) => (
                <p key={c.id || c.name} className="tiny-copy">
                  {c.name} ({c.tier}): {c.eligible} eligible · {c.prizeCount} prize slot(s) {c.eligible < c.prizeCount && <strong style={{ color: '#f87171' }}>— insufficient!</strong>}
                </p>
              ))}
            </section>
          )}

          <button type="button" className="btn-primary action-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save rules'}
          </button>
        </>
      )}
    </PageShell>
  );
}
