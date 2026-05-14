import { PageShell } from './PageShell';

export function ForbiddenPage() {
  return (
    <PageShell breadcrumb="Dashboard" title="Forbidden" subtitle="You don't have permission to view this section.">
      <div className="soft-card" style={{ padding: '2rem' }}>
        <p className="tiny-copy">
          This area is restricted. If you believe you should have access, contact an Admin.
        </p>
      </div>
    </PageShell>
  );
}
