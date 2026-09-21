import { SCAFFOLD_IDENTITY } from "../app/scaffold-identity";

export function ScaffoldRoute() {
  return (
    <main className="scaffold">
      <section className="scaffold__panel" aria-labelledby="miqos-admin-title">
        <p className="scaffold__eyebrow">{SCAFFOLD_IDENTITY.workPackage}</p>
        <h1 id="miqos-admin-title">{SCAFFOLD_IDENTITY.productName}</h1>
        <p className="scaffold__status">Desktop scaffold — TEST package</p>
        <dl className="scaffold__facts">
          <div>
            <dt>Host</dt>
            <dd>Tauri 2</dd>
          </div>
          <div>
            <dt>Renderer</dt>
            <dd>React / TypeScript</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>{SCAFFOLD_IDENTITY.status}</dd>
          </div>
        </dl>
        <p className="scaffold__notice">
          Backend integration, identity, diagnostics and Admin evidence loading are intentionally not connected in WP-G8.1.
        </p>
      </section>
    </main>
  );
}
