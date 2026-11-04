import { generateClient } from "aws-amplify/api";
import { api, listAll, type Customer, type Agreement, type Invoice, type Job, type ServicePlan, type ServiceReport, type ServiceReportAmendment, type CustomerLifecycleEvent } from "./api";

export type RecordPage<T> = { items: T[]; nextToken: string | null };
export type CustomerConnection = "servicePlans" | "jobs" | "invoices" | "agreements" | "serviceReports";
type ConnectionRows = { servicePlans: ServicePlan; jobs: Job; invoices: Invoice; agreements: Agreement; serviceReports: ServiceReport };
const fields = {
  servicePlans: "id customerId planName serviceCode catalogVersion priceCents serviceFrequency salesTaxPercent billingAnchorDate status stripeSubscriptionId canceledStripeSubscriptionId startDate canceledAt cancellationPending cancellationRequestedAt cancellationReason delinquent delinquentSince seasonal serviceMonths notes createdAt updatedAt",
  jobs: "id customerId servicePlanId type serviceType serviceCode catalogVersion description priceCents status scheduledDate scheduledStartTime scheduledEndTime routeId routeOrder etaMinutes technicianId startedAt applicationEndAt completedAt paidAt paidPaymentIntentId noAccessReason noAccessAt noAccessNote noAccessPhotoKey rebookedFromJobId notPerformedReason cancelDisposition cancelDispositionCents capacityMinutes paymentPendingIntentId capacityTechnicianId notPerformedAt notPerformedNote notPerformedPhotoKey propertyClass dispatchDriveMinutes dispatchRouteCheckedAt enRouteAt trackToken trackLat trackLng trackAt trackEndsAt packetVersion packetChangedAt packetAckVersion packetAckAt notes accessInstructions hazardNotes prepInstructions prepConfirmed paymentExpectation createdAt updatedAt",
  invoices: "id customerId jobId servicePlanId description amountCents status method stripeInvoiceId stripePaymentIntentId pendingDebitIntentId postCancelNoticeSentAt issuedAt paidAt failureReason dueDate terms poNumber dunningAttempts nextDunningAt lastDunningAt ownerSub ownerEmail settledBy settledByEmail settleNote depositedAt depositedBy depositedByEmail depositNote refundedAmountCents refundedAt refundReason stripeRefundId voidedAt voidReason createdBy createdByEmail refundedBy refundedByEmail voidedBy voidedByEmail createdAt updatedAt",
  agreements: "id customerId title status sentAt signedAt signerName signerEmail pdfKey createdAt updatedAt",
  serviceReports: "id jobId customerId technicianId serviceDate applicationStartAt applicationEndAt reEntryIntervalHours inspectionOnly servicesPerformed productsUsed targetPests areasTreated recommendations techNotes geoLat geoLng geoAccuracyM geoCapturedAt status pdfKey photoKeys emailedAt deliveryStatus presenceReviewStatus createdAt updatedAt",
} as const;
const customerFields = "id displayName contactName email phone serviceStreet serviceUnit serviceCity serviceState serviceZip propertyClass billingStreet billingCity billingState billingZip status leadSource leadNotes externalRef contactConsent contactConsentAt contactConsentChannels contactConsentSource contactConsentText contactConsentPolicyVersion convertedAt lastTouchedAt lastAttemptedAt lastReachedAt qualificationStatus bookingLinkSentAt bookingLinkDeliveredAt leadOwnerSub leadOwnerEmail leadOwnerTeam nextAction nextActionAt leadMutationId lostReason lostAt doNotContact doNotContactAt doNotContactBy conversionReviewBookingId notes groupId stripeCustomerId paymentMethodLabel paymentMethodKind portalUserSub portalInvitedAt portalLastLoginAt bookingLinkToken bookingLinkTokenExpiresAt mergedIntoId mergeCounterpartId mergeLeaseNonce mergeLeaseUntil mergeState createdAt updatedAt";
type GraphTransport = { graphql: (input: { query: string; variables: Record<string, unknown>; authMode: "userPool" }) => unknown };
let transport: GraphTransport | null = null;
async function query(document: string, variables: Record<string, unknown>) {
  const result = await (transport ??= generateClient() as unknown as GraphTransport).graphql({ query: document, variables, authMode: "userPool" }) as { data?: { getCustomer?: Record<string, unknown> | null }; errors?: { message: string }[] };
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join("; "));
  if (!result.data || !("getCustomer" in result.data)) throw new Error("The customer response could not be verified.");
  return result.data?.getCustomer ?? null;
}

export async function readCustomerRecord(id: string): Promise<Customer | null> {
  return await query(`query CustomerRecord($id: ID!) { getCustomer(id: $id) { ${customerFields} } }`, { id }) as Customer | null;
}

/** Nested connection resolvers use the existing gsi-Customer.* indexes. The
 * installed SDK's lazy hasMany getters instead call filtered table lists. */
export async function readCustomerPage<K extends CustomerConnection>(id: string, connection: K, nextToken?: string, limit = 25): Promise<RecordPage<ConnectionRows[K]>> {
  const parent = await query(`query CustomerRecordPage($id: ID!, $limit: Int!, $nextToken: String) {
    getCustomer(id: $id) { ${connection}(limit: $limit, nextToken: $nextToken) { items { ${fields[connection]} } nextToken } }
  }`, { id, limit, nextToken });
  if (!parent) throw new Error("The customer record could not be verified.");
  const page = parent[connection] as { items?: (ConnectionRows[K] | null)[] | null; nextToken?: string | null } | null;
  if (!page || !Array.isArray(page.items)) throw new Error("This section could not be read completely.");
  if (page.items.some((row) => row === null)) throw new Error("This section contains an unreadable record. Retry before making changes.");
  if (page.nextToken && page.nextToken === nextToken) throw new Error("This section did not advance. Try again.");
  return { items: page.items as ConnectionRows[K][], nextToken: page.nextToken ?? null };
}

/** Complete customer-scoped metadata is necessary for absence/charge decisions.
 * Each resource finishes independently; heavy record history is separate. */
export async function readCustomerEssentials<K extends "servicePlans" | "jobs" | "invoices">(id: string, connection: K): Promise<ConnectionRows[K][]> {
  const seen = new Set<string>();
  return listAll(async (nextToken) => {
    if (nextToken && seen.has(nextToken)) throw new Error("This section repeated a page. Retry before making changes.");
    if (nextToken) seen.add(nextToken);
    const page = await readCustomerPage(id, connection, nextToken, 100);
    return { data: page.items, nextToken: page.nextToken };
  });
}

export async function readCustomerDocuments(id: string): Promise<unknown> {
  const customer = await query("query CustomerDocuments($id: ID!) { getCustomer(id: $id) { id documents } }", { id });
  if (!customer) throw new Error("Documents could not be verified.");
  return customer.documents;
}

export async function readReportAmendments(reportId: string): Promise<ServiceReportAmendment[]> {
  const history = await listAll((nextToken) => api().models.ServiceReportAmendment.listServiceReportAmendmentByOriginalReportId(
    { originalReportId: reportId }, { limit: 100, nextToken }
  ));
  return history.sort((a, b) => (a.issuedAt ?? "").localeCompare(b.issuedAt ?? ""));
}

export async function readLifecyclePage(customerId: string, nextToken?: string): Promise<RecordPage<CustomerLifecycleEvent>> {
  const page = await api().models.CustomerLifecycleEvent.listCustomerLifecycleEventByCustomerIdAndOccurredAt(
    { customerId }, { limit: 50, nextToken, sortDirection: "DESC" }
  );
  if (page.errors?.length) throw new Error(page.errors.map((error) => error.message).join("; "));
  if (page.nextToken && page.nextToken === nextToken) throw new Error("History did not advance. Try again.");
  return { items: page.data, nextToken: page.nextToken ?? null };
}
