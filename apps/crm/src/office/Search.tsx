import { useEffect, useRef, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRoles } from "../lib/auth";
import {
  normalizeCustomerSearchQuery,
  searchQueryFromHistory,
  searchResumeFromHistory,
  withSearchQuery,
  withSearchResume,
} from "../lib/customerSearch";
import { displayAddress } from "../lib/serviceAddress";
import { LEAD_STAGE_LABEL, LEAD_STAGE_TONE } from "../lib/leadStage";
import { useCustomerSearch } from "../lib/useCustomerSearch";
import {
  Badge, Button, Card, EmptyState, ErrorNote, Field, ListRow, Page,
  Spinner, StatusBadge,
} from "../ui/kit";

export default function Search() {
  const roles = useRoles();
  const location = useLocation();
  const navigate = useNavigate();
  const query = searchQueryFromHistory(location.state, roles.sub);
  const resume = searchResumeFromHistory(location.state, roles.sub, query);
  const search = useCustomerSearch(query, roles.sub, roles.office, resume);
  const { items: matches, error, loading, searched, nextToken } = search;
  const restoredRow = useRef<HTMLAnchorElement>(null);
  const focusedResume = useRef<string | null>(null);
  useEffect(() => {
    const focusKey = resume ? JSON.stringify([roles.sub, query, resume.cursor, resume.customerId]) : null;
    if (focusKey && focusedResume.current !== focusKey && searched && !loading && restoredRow.current) {
      focusedResume.current = focusKey;
      restoredRow.current.focus({ preventScroll: true });
      restoredRow.current.scrollIntoView({ block: "nearest" });
    }
  }, [searched, loading, roles.sub, query, resume?.cursor, resume?.customerId]);

  const setQuery = (value: string) => navigate(
    { pathname: location.pathname, search: location.search, hash: location.hash },
    { replace: true, state: withSearchQuery(location.state, roles.sub, value) }
  );

  const rememberResult = (event: MouseEvent<HTMLAnchorElement>, customerId: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.defaultPrevented) return;
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, {
      replace: true,
      state: withSearchResume(location.state, roles.sub, query, { customerId, cursor: search.sourceFor(customerId) }),
    });
  };

  if (!roles.office) {
    return <Page title="Search"><EmptyState title="Office access required" /></Page>;
  }

  return (
    <Page
      title="Search"
      back
      actions={<Button small variant="subtle" disabled={loading || !normalizeCustomerSearchQuery(query)}
        onClick={() => resume ? setQuery(query) : void search.restart()}>Search again</Button>}
    >
      <Field
        label="Search customers and leads"
        hint="Active and inactive customers, plus all leads, including closed inquiries."
      >
        <input
          type="search"
          autoFocus
          autoComplete="off"
          maxLength={200}
          placeholder="Name, email, phone, or service address…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>
      <ErrorNote error={error} />
      {resume ? <p className="muted small">Showing the saved search page. Search again to start from the beginning.</p> : null}
      {!normalizeCustomerSearchQuery(query) ? (
        <EmptyState title="Find a customer or lead"
          body="Enter a name, phone number, email, or any part of their service address." />
      ) : loading && !searched ? (
        <Spinner label="Searching directory…" />
      ) : error && !searched ? (
        <Button onClick={() => void search.retry()}>Retry</Button>
      ) : matches.length === 0 && !nextToken ? (
        <EmptyState title="No matches"
          body="Try another name, contact detail, or part of the service address." />
      ) : matches.length > 0 ? (
        <Card title={`${matches.length} match${matches.length === 1 ? "" : "es"}${nextToken ? " so far" : ""}`}>
          {matches.map((customer) => {
            const address = displayAddress(customer);
            const stage = customer.leadStage;
            return (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="record-search-result"
                state={{ customerSearchReturn: { ownerSub: roles.sub } }}
                onClick={(event) => rememberResult(event, customer.id)}
                ref={customer.id === resume?.customerId ? restoredRow : undefined}
              >
                <ListRow
                  title={customer.displayName}
                  meta={<span className="inline-actions">
                    <StatusBadge status={customer.status} />
                    {stage ? (
                      <Badge tone={LEAD_STAGE_TONE[stage]}>{LEAD_STAGE_LABEL[stage]}</Badge>
                    ) : null}
                  </span>}
                  subtitle={<>
                    {address ? <span className="nested-line">{address}</span> : null}
                    <span className="nested-line">{[
                      customer.contactName !== customer.displayName ? customer.contactName : null,
                      customer.phone, customer.email,
                    ].filter(Boolean).join(" · ")}</span>
                  </>}
                />
              </Link>
            );
          })}
        </Card>
      ) : null}
      {searched && nextToken ? (
        <Card>
          <p className="muted small">
            {matches.length ? "More records remain to search." : "No matching records in the pages checked so far. More records remain to search."}
          </p>
          <Button block loading={loading} onClick={() => void search.more()}>
            {matches.length ? "Load more" : "Search more records"}
          </Button>
        </Card>
      ) : null}
    </Page>
  );
}
