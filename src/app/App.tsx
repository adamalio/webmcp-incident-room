import { checkoutIncident } from "../data/checkout-incident";
import "./app.css";

export function App() {
  return (
    <div className="app-shell">
      <header className="incident-header">
        <div>
          <p className="eyebrow">{checkoutIncident.simulationLabel}</p>
          <h1>WebMCP Incident Room</h1>
          <p className="subtitle">
            A deterministic workspace for a simulated checkout incident.
          </p>
        </div>
        <button type="button">Reset</button>
      </header>

      <main>
        <section aria-labelledby="incident-title" className="incident-card">
          <div className="incident-summary">
            <div>
              <p className="section-label">Canonical scenario</p>
              <h2 id="incident-title">{checkoutIncident.title}</h2>
            </div>
            <span className="status">{checkoutIncident.status}</span>
          </div>

          <dl className="incident-details">
            <div>
              <dt>Incident ID</dt>
              <dd>{checkoutIncident.id}</dd>
            </div>
            <div>
              <dt>Fixed start</dt>
              <dd>
                <time dateTime={checkoutIncident.startedAt}>
                  {checkoutIncident.startedAt}
                </time>
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer>
        <p>No real systems or customer data are connected.</p>
      </footer>
    </div>
  );
}
