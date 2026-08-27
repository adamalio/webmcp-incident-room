import type { TimelineEvent } from "../domain/incident-machine";

export function IncidentTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <p className="section-label">Visible receipts</p>
      <h2 id="timeline-title">Incident timeline</h2>
      <ol aria-label="Incident timeline">
        {events.map((event) => (
          <li key={event.id}>
            <strong>{event.label}</strong>
            {event.receiptId ? <code>{event.receiptId}</code> : null}
            <time dateTime={event.timestamp}>{event.timestamp}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
