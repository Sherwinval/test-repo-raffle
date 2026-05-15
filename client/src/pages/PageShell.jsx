export function PageShell({ breadcrumb, title, subtitle, actions, children }) {
  return (
    <>
      <header className="dashboard-header">
        <div>
          {breadcrumb && (
            <p className="tiny-copy" style={{ marginBottom: '0.25rem', opacity: 0.6 }}>{breadcrumb}</p>
          )}
          <h1 className="title">{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
      </header>
      {children}
    </>
  );
}

export function ComingSoon({ name }) {
  return (
    <div className="soft-card" style={{ padding: '2rem', textAlign: 'center' }}>
      <p className="card-heading">Coming soon</p>
      <p className="tiny-copy">The {name} module is wired up but its content is being built.</p>
    </div>
  );
}
