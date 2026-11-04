import { useCallback, useEffect, useRef, useState } from "react";
import { useAsync, toMessage } from "./useAsync";
import { mergeWorkPages, readResolvedWork, readWorkPage, type WorkPage, type WorkStatus } from "./workQueueReads";

type QueueData = WorkPage & { status: WorkStatus; revision: number };

export function useWorkQueue(status: WorkStatus, suspended: boolean) {
  const generation = useRef(0);
  const currentStatus = useRef(status);
  currentStatus.current = status;
  const currentSuspended = useRef(suspended);
  currentSuspended.current = suspended;
  const mounted = useRef(false);
  const moreRequest = useRef<number | null>(null);
  const nextRequest = useRef(0);
  const [more, setMore] = useState({ status, loading: false, error: null as string | null });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      moreRequest.current = null;
    };
  }, []);
  const freshness = useAsync<QueueData>(async () => {
    const revision = ++generation.current;
    moreRequest.current = null;
    setMore({ status, loading: false, error: null });
    const page = status === "OPEN"
      ? await readWorkPage(status)
      : { items: await readResolvedWork(), nextToken: null };
    return { ...page, status, revision };
  }, [status], "Could not load work queue", { refreshOnResume: true, suspended });
  // A previous tab's rows must not appear while the selected partition loads.
  const data = freshness.data?.status === status ? freshness.data : null;
  const loadMore = useCallback(async () => {
    if (!mounted.current || !data?.nextToken || freshness.loading || currentSuspended.current || moreRequest.current !== null) return;
    const request = ++nextRequest.current;
    moreRequest.current = request;
    const revision = generation.current;
    setMore({ status, loading: true, error: null });
    try {
      const page = await readWorkPage(status, data.nextToken);
      if (!mounted.current || currentSuspended.current || currentStatus.current !== status || generation.current !== revision || moreRequest.current !== request) return;
      freshness.setData({ ...data, items: mergeWorkPages(data.items, page.items), nextToken: page.nextToken });
    } catch (error) {
      if (mounted.current && !currentSuspended.current && currentStatus.current === status && generation.current === revision && moreRequest.current === request) {
        setMore({ status, loading: false, error: toMessage(error, "Could not load more work") });
      }
    } finally {
      if (moreRequest.current === request) {
        moreRequest.current = null;
        setMore((held) => ({ ...held, loading: false }));
      }
    }
  }, [data, freshness.loading, freshness.setData, status, suspended]);
  return {
    ...freshness, data, loadMore,
    moreLoading: more.status === status && more.loading,
    moreError: more.status === status ? more.error : null,
  };
}
