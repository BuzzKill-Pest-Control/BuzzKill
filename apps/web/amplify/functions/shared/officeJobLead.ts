import { casTransactionalUpdate, type LockCondition } from "./atomicLock";
import { isMidMerge } from "./customerMerge";
import { dataClient } from "./dataClient";
import { acquireLeadLifecycleClaim, releaseLeadLifecycleClaim } from "./leadClaim";
import { appendLeadActivity, type LeadActor } from "./leadLifecycle";
import { isLeadOpen } from "./leadStage";
import { openOwnedWork, resolveOwnedWork, workItemId } from "./ownedWork";

/** A saved office job is a customer commitment, just like an office-created
 * plan. It ends sales follow-up without claiming payment or starting billing.
 * Called only when the job was created from a LEAD. Once the job exists, a
 * partial conversion must return its id with a warning, never invite a second
 * job creation by reporting the whole operation as failed.
 */
export async function settleLeadForOfficeJob(input: {
  customerId: string;
  jobId: string;
  actor: LeadActor;
}): Promise<{ warning?: string }> {
  const mutationId = `office-job:${input.jobId}`;
  let holder: string | undefined;
  try {
    const claim = await acquireLeadLifecycleClaim(input.customerId, mutationId);
    if (!claim.won) throw new Error("Another lead action is still in progress.");
    holder = claim.holder;
    const client = await dataClient();
    const assertFollowupClosed = async () => {
      const followup = await client.models.WorkItem.get({
        id: workItemId("LEAD_FOLLOWUP", input.customerId),
      });
      if (followup.errors?.length || (followup.data && followup.data.status !== "RESOLVED")) {
        throw new Error("The lead follow-up is still open or could not be verified.");
      }
    };
    const current = await client.models.Customer.get({ id: input.customerId });
    if (current.errors?.length || !current.data) throw new Error("The lead could not be verified.");
    const customer = current.data;
    if (isMidMerge(customer) || !["LEAD", "ACTIVE"].includes(customer.status)) {
      throw new Error("The customer changed or is being merged; verify the saved job before settling the lead.");
    }

    if (customer.conversionReviewBookingId) {
      throw new Error("Resolve the pending paid-booking identity decision before completing lead cleanup.");
    }
    // Lost/DNC dispositions own their own follow-up cleanup. A manual job
    // must not resolve a newer obligation on a deliberately closed lead, or
    // mark recovery complete while that disposition's cleanup is unfinished.
    if (customer.status === "LEAD" && !isLeadOpen(customer)) {
      await assertFollowupClosed();
      return {};
    }

    if (customer.status === "LEAD") {
      // Audit first with a job-specific key, so a retry can adopt the same
      // immutable evidence without manufacturing another sale or job.
      await appendLeadActivity({
        customerId: input.customerId,
        channel: "LIFECYCLE",
        outcome: "NOTE",
        note: `Office job ${input.jobId} is saved. Completing its lead follow-up; payment and billing remain unchanged.`,
        actor: input.actor,
        mutationId,
        preserveOriginalActor: true,
      });
      const guards: LockCondition[] = [
        { kind: "fieldEquals", field: "status", value: "LEAD" },
        { kind: "fieldMissingOrNull", field: "mergeCounterpartId" },
        ...(["leadMutationId", "doNotContact", "lostReason", "conversionReviewBookingId", "nextAction", "nextActionAt"] as const).map((field): LockCondition => {
          const value = customer[field];
          return value == null
            ? { kind: "fieldMissingOrNull", field }
            : { kind: "fieldEquals", field, value };
        }),
      ];
      const updated = await casTransactionalUpdate("Customer", input.customerId, {
        status: "ACTIVE",
        convertedAt: customer.convertedAt ?? new Date().toISOString(),
        nextAction: null,
        nextActionAt: null,
        leadMutationId: mutationId,
      }, guards, [{
        model: "Job",
        id: input.jobId,
        conditions: [
          { kind: "fieldEquals", field: "customerId", value: input.customerId },
          { kind: "fieldNotIn", field: "status", values: ["CANCELED"] },
        ],
      }]);
      if (!updated.ok) throw new Error("The job or lead changed before its conversion could be saved.");
    }
    // A concurrent conversion may have won before our claim. ACTIVE is
    // already settled. Only a stale sales follow-up remains to be discharged.
    const verified = await client.models.Customer.get({ id: input.customerId });
    if (verified.errors?.length || !verified.data || isLeadOpen(verified.data) || isMidMerge(verified.data) || verified.data.conversionReviewBookingId) {
      throw new Error("The lead's closed state could not be confirmed.");
    }
    await resolveOwnedWork({
      kind: "LEAD_FOLLOWUP",
      dedupeKey: input.customerId,
      note: `Office job ${input.jobId} saved; no further sales follow-up is needed. Payment remains unchanged.`,
    });
    await assertFollowupClosed();
    return {};
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const recovery = await openOwnedWork({
      kind: "LEAD_LIFECYCLE_RECOVERY",
      dedupeKey: mutationId,
      title: "Saved office job needs lead follow-up cleanup",
      detail: `Job ${input.jobId} is already saved for customer ${input.customerId}. ${detail} Do not create the job again. Payment and billing have not been changed.`,
      customerId: input.customerId,
      relatedId: mutationId,
      sourceUrl: `/customers/${input.customerId}`,
      resolutionAction: "Choose Finish lead cleanup to retry safely using the saved job. Do not add another job or record payment unless it actually occurred.",
      ownerTeam: "SALES",
    }).catch(() => null);
    return {
      warning: "Job saved, but the lead follow-up could not be closed. Do not add the job again. " +
        (recovery ? "A recovery item is in shared work." : "Recovery work could not be recorded; verify the lead and its follow-up manually."),
    };
  } finally {
    if (holder) {
      await releaseLeadLifecycleClaim(input.customerId, holder).catch((error) => {
        console.error("Could not release saved-job lead claim", input.customerId, error);
      });
    }
  }
}
