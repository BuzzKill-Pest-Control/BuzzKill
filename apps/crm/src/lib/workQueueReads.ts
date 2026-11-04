import { api, listAll, type WorkEvent, type WorkItem } from "./api";

export type WorkStatus = "OPEN" | "RESOLVED";
export const WORK_PAGE_SIZE = 50;
export type WorkPage = { items: WorkItem[]; nextToken: string | null };

/** Read one status partition, never the WorkItem table or the event ledger. */
export async function readWorkPage(status: WorkStatus, nextToken?: string, limit = WORK_PAGE_SIZE): Promise<WorkPage> {
  const model = api().models.WorkItem;
  // Keep the existing pre-deployment empty state, without falling back to a scan.
  if (!model) return { items: [], nextToken: null };
  const page = await model.listWorkItemByStatusAndDueAt(
    { status }, { limit, nextToken, sortDirection: status === "OPEN" ? "ASC" : "DESC" }
  );
  if (page.errors?.length) throw new Error(page.errors.map((error) => error.message).join("; "));
  return { items: page.data, nextToken: page.nextToken ?? null };
}

/**
 * The archive is explicit access: read only resolved metadata to retain its
 * global resolution-time order. The current index sorts deadlines, not closes.
 */
export async function readResolvedWork(): Promise<WorkItem[]> {
  const items = await listAll(async (nextToken) => {
    const page = await readWorkPage("RESOLVED", nextToken, 200);
    return { data: page.items, nextToken: page.nextToken };
  });
  return mergeWorkPages([], items).sort((a, b) =>
    (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? "") || a.id.localeCompare(b.id)
  );
}

/** History is immutable and read to completion only when its case is expanded. */
export async function readWorkHistory(workItemId: string): Promise<WorkEvent[]> {
  const model = api().models.WorkEvent;
  if (!model) return [];
  const events = await listAll((nextToken) => model.listWorkEventByWorkItemIdAndOccurredAt(
    { workItemId }, { limit: 100, nextToken, sortDirection: "ASC" }
  ));
  return [...new Map(events.map((event) => [event.id, event])).values()]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
}

/** A case may move between eventually consistent pages; do not count it twice. */
export function mergeWorkPages(prior: WorkItem[], next: WorkItem[]): WorkItem[] {
  const byId = new Map(prior.map((item) => [item.id, item]));
  for (const item of next) {
    const held = byId.get(item.id);
    if (!held || (item.updatedAt ?? "") >= (held.updatedAt ?? "")) byId.set(item.id, item);
  }
  return [...byId.values()];
}
