import { useEffect, useState } from "react";
import { type WorkEvent } from "../lib/api";
import { fmtDateTime } from "../lib/format";
import { toMessage } from "../lib/useAsync";
import { readWorkHistory } from "../lib/workQueueReads";
import { Button, ErrorNote } from "../ui/kit";

export default function WorkHistory({ workItemId, revision }: { workItemId: string; revision: number }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{ revision: number; events: WorkEvent[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) { setLoading(false); return; }
    if (snapshot?.revision === revision) return;
    let current = true;
    setLoading(true);
    setError(null);
    void readWorkHistory(workItemId).then((events) => {
      if (current) setSnapshot({ revision, events });
    }).catch((err) => {
      if (current) setError(toMessage(err, "Could not load case history"));
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
    // The snapshot is the result of this request, not a new reason to run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workItemId, revision, retry]);
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} style={{ marginTop: 12 }}>
      <summary className="small">Permanent history{snapshot ? ` (${snapshot.events.length})` : ""}</summary>
      {loading ? <p className="muted small" role="status">Loading case history…</p> : null}
      <ErrorNote error={error} />
      {error ? <Button small variant="ghost" onClick={() => setRetry((value) => value + 1)}>Retry history</Button> : null}
      {snapshot?.events.map((event) => (
        <p className="muted small" key={event.id} style={{ marginTop: 6 }}>
          {fmtDateTime(event.occurredAt)} · {event.eventType?.toLowerCase().replace(/_/g, " ")} · {event.actorEmail}
          <span className="nested-line">{event.note}</span>
        </p>
      ))}
      {snapshot?.events.length === 0 && !loading && !error ? <p className="muted small">No history recorded.</p> : null}
    </details>
  );
}
