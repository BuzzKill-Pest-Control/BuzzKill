import { Button } from "../ui/kit";

export type RefreshState = {
  loading: boolean;
  lastUpdatedAt: number | null;
  online: boolean;
  refreshSuspended: boolean;
  refresh: () => void;
};

export default function RefreshStatus({ state, label }: { state: RefreshState; label: string }) {
  const updated = state.lastUpdatedAt === null ? "Not updated yet" : `Updated ${new Date(state.lastUpdatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  const status = !state.online ? `Offline · ${updated}` : state.refreshSuspended ? `Updates paused during changes · ${updated}` : state.loading ? "Refreshing…" : updated;
  return (
    <div className="row-split" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <span className="muted small" role="status">{status}</span>
      <Button small variant="subtle" disabled={state.loading || state.refreshSuspended || !state.online} onClick={state.refresh} aria-label={`Refresh ${label}`}>Refresh</Button>
    </div>
  );
}
