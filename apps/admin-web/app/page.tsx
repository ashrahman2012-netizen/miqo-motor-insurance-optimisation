export default function AdminDashboard() {
  return (
    <main id="main-content">
      <p className="eyebrow">Operations</p>
      <h1>MIQOS administration</h1>
      <p className="lede">
        Controlled local diagnostics and audit access for the synthetic desktop environment.
        Customer profile authority remains governed by the existing capability boundary.
      </p>

      <section className="admin-grid" aria-label="Administration status">
        <article className="admin-card">
          <strong>Profile inspection</strong>
          <span>Available only through the controlled synthetic handoff from an authorised customer journey.</span>
        </article>
        <article className="admin-card">
          <strong>Audit reconstruction</strong>
          <span>Preserves the existing immutable version, integrity and traceability controls.</span>
        </article>
        <article className="admin-card">
          <strong>Environment boundary</strong>
          <span>Synthetic-only. No live customer, insurer or provider authority is enabled.</span>
        </article>
      </section>
    </main>
  );
}
