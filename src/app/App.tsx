import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { checkoutIncident } from "../data/checkout-incident";
import {
  createInitialIncidentState,
  incidentReducer,
} from "../domain/incident-machine";
import { createInspectIncidentHandler } from "../tools/inspect-incident";
import { useIncidentTools } from "../webmcp/useIncidentTools";
import "./app.css";

export function App() {
  const [state, dispatch] = useReducer(
    incidentReducer,
    undefined,
    createInitialIncidentState,
  );
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const inspect = useCallback((input: unknown) => {
    const handler = createInspectIncidentHandler(
      () => stateRef.current,
      dispatch,
    );
    return handler(input);
  }, []);
  const unavailable = useCallback(
    () => ({
      ok: false,
      error: {
        code: "INVALID_STATE",
        message: "Available in a later incident tracer.",
        retryable: false,
      },
    }),
    [],
  );
  const handlers = useMemo(
    () => ({
      inspect_incident: inspect,
      query_signals: unavailable,
      propose_mitigation: unavailable,
    }),
    [inspect, unavailable],
  );
  useIncidentTools(state, handlers);

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
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "RESET" });
          }}
        >
          Reset
        </button>
      </header>

      <main>
        <section aria-labelledby="incident-title" className="incident-card">
          <div className="incident-summary">
            <div>
              <p className="section-label">Canonical scenario</p>
              <h2 id="incident-title">{checkoutIncident.title}</h2>
            </div>
            <span className="status">
              {state.phase === "idle"
                ? checkoutIncident.status
                : "Investigating"}
            </span>
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
          {state.phase === "idle" ? (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "START" });
              }}
            >
              Start incident
            </button>
          ) : (
            <dl className="impact-grid">
              <div>
                <dt>p95 latency</dt>
                <dd>{checkoutIncident.impact.p95LatencyMs} ms</dd>
              </div>
              <div>
                <dt>Error rate</dt>
                <dd>{checkoutIncident.impact.errorRatePercent}%</dd>
              </div>
              <div>
                <dt>Affected sessions</dt>
                <dd>{checkoutIncident.impact.affectedSessions}</dd>
              </div>
            </dl>
          )}
        </section>
        <p role="status" aria-live="polite" className="invocation-status">
          {state.latestStatus}
        </p>
        <IncidentTimeline events={state.timeline} />
      </main>

      <footer>
        <p>No real systems or customer data are connected.</p>
        <p id="browser-verification">
          Agent discovery requires a browser with native WebMCP
          document.modelContext support; no fallback API is installed.
        </p>
      </footer>
    </div>
  );
}
