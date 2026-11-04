import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, listAll, type Customer } from "../lib/api";
import { useRoles } from "../lib/auth";
import {
  customerMatchesSearch,
  searchQueryFromHistory,
  withSearchQuery,
} from "../lib/customerSearch";
import { displayAddress } from "../lib/serviceAddress";
import { deriveLeadStage, LEAD_STAGE_LABEL, LEAD_STAGE_TONE } from "../lib/leadStage";
import { useAsync } from "../lib/useAsync";
import {
  Badge, Button, Card, EmptyState, ErrorNote, Field, ListRow, Page,
  Spinner, StatusBadge,
} from "../ui/kit";

const STATUSES = ["ACTIVE", "INACTIVE", "LEAD"] as const;

export default function Search() {
  const roles = useRoles();
  const location = useLocation();
  const navigate = useNavigate();
  const query = searchQueryFromHistory(location.state, roles.sub);
  const { data: customers, error, loading, reload } = useAsync<Customer[]>(async () => {
    if (!roles.office) return [];
    // Use the existing status index, including closed leads. Exhaust each
    // partition once per load; typing only filters these authorized rows.
    const partitions = await Promise.all(
      STATUSES.map((status) => listAll((nextToken) =>
        api().models.Customer.listCustomerByStatusAndDisplayName(
          { status }, { limit: 500, nextToken }
        )
      ))
    );
    return [...new Map(partitions.flat().map((row) => [row.id, row])).values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));
  }, [roles.office, roles.sub], "Could not load the customer and lead directory");

  const matches = useMemo(
    () => (customers ?? []).filter((customer) => customerMatchesSearch(customer, query)),
    [customers, query]
  );

  const setQuery = (value: string) => navigate(
    { pathname: location.pathname, search: location.search, hash: location.hash },
    { replace: true, state: withSearchQuery(location.state, roles.sub, value) }
  );

  if (!roles.office) {
    return <Page title="Search"><EmptyState title="Office access required" /></Page>;
  }

  return (
    <Page
      title="Search"
      back
      actions={<Button small variant="subtle" disabled={loading} onClick={reload}>Refresh</Button>}
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
      {!customers && loading ? (
        <Spinner label="Loading directory…" />
      ) : !customers && error ? (
        <Button onClick={reload}>Retry</Button>
      ) : !query.trim() ? (
        <EmptyState title="Find a customer or lead"
          body="Enter a name, phone number, email, or any part of their service address." />
      ) : matches.length === 0 ? (
        <EmptyState title="No matches"
          body="Try another name, contact detail, or part of the service address." />
      ) : (
        <Card title={`${matches.length} match${matches.length === 1 ? "" : "es"}`}>
          {matches.map((customer) => {
            const address = displayAddress(customer);
            const stage = deriveLeadStage(customer);
            return (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="record-search-result"
                state={{ customerSearchReturn: { ownerSub: roles.sub } }}
              >
                <ListRow
                  title={customer.displayName}
                  meta={<span className="inline-actions">
                    <StatusBadge status={customer.status} />
                    {customer.status === "LEAD" ? (
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
      )}
    </Page>
  );
}
