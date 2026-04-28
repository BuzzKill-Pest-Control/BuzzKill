/**
 * Lead-intake Lambda — proxies the BuzzKill contact form to FieldRoutes.
 *
 * Two-step flow:
 *   1. POST /api/customer/create  → creates the customer record
 *   2. POST /api/subscription/create → creates a subscription on that
 *      customer with the correct service type, frequency, source, and
 *      convertToLead=1 so it shows up in the Leads pipeline.
 *
 * Frontend posts a JSON body like:
 *   {
 *     propertyType: "Association" | "Residential",
 *     first, last, email, phone,
 *     addr, city, state, zip,
 *     sqft, units, freq, company
 *   }
 */

type Handler = (
  event: APIGatewayLikeEvent,
) => Promise<APIGatewayLikeResponse>;

type APIGatewayLikeEvent = {
  httpMethod?: string;
  requestContext?: { http?: { method?: string } };
  body?: string | null;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
};

type APIGatewayLikeResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type LeadInput = {
  propertyType?: "Association" | "Residential" | string;
  first?: string;
  last?: string;
  email?: string;
  phone?: string;
  addr?: string;
  city?: string;
  state?: string;
  zip?: string;
  sqft?: string;
  units?: string;
  freq?: string;
  company?: string;
};

const REQUIRED_FIELDS: (keyof LeadInput)[] = [
  "first",
  "last",
  "email",
  "phone",
  "addr",
  "city",
  "state",
  "zip",
];

// ── FieldRoutes tenant config ────────────────────────────────────────
// Source IDs (Admin → Preferences → Customer Sources)
const SOURCE_WEBSITE = 10001;

// Service-type IDs by property type × frequency
// (Admin → Preferences → Service Types — the row number is the ID)
const SERVICE_ID_MAP: Record<string, Record<string, number>> = {
  Association: {
    Monthly: 5,       // HOA Monthly (HM)
    "Every 2 Months": 6, // HOA Bi-Monthly (HB)
    "Every 3 Months": 7, // HOA Quarterly (HQ)
  },
  Residential: {
    Monthly: 9,       // Residential Monthly (RM)
    "Every 2 Months": 10, // Residential Bi-Monthly (RB)
    "Every 3 Months": 11, // Residential Quarterly (RQ)
  },
};

// Map form frequency labels → FieldRoutes frequency value (days)
const FREQUENCY_DAYS: Record<string, number> = {
  Monthly: 30,
  "Every 2 Months": 60,
  "Every 3 Months": 90,
};

// ── Helpers ──────────────────────────────────────────────────────────

function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayLikeResponse {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function digitsOnly(s: string | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

/** POST to a FieldRoutes endpoint and return parsed JSON. */
async function frPost(
  subdomain: string,
  key: string,
  token: string,
  endpoint: string,
  params: Record<string, string | number>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const url = `https://${subdomain}.pestroutes.com/api/${endpoint}`;
  const body = new URLSearchParams({
    authenticationKey: key,
    authenticationToken: token,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  let parsed: Record<string, unknown>;
  const text = await resp.text();
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = { _raw: text.slice(0, 1000) };
  }

  return { status: resp.status, body: parsed };
}

// ── Field mapping ────────────────────────────────────────────────────

function buildCustomerPayload(input: LeadInput): Record<string, string> {
  const isAssociation = input.propertyType === "Association";
  const out: Record<string, string> = {
    fname: (input.first ?? "").trim(),
    lname: (input.last ?? "").trim(),
    email: (input.email ?? "").trim(),
    phone1: digitsOnly(input.phone),
    address: (input.addr ?? "").trim(),
    city: (input.city ?? "").trim(),
    state: (input.state ?? "").trim().toUpperCase().slice(0, 2),
    zip: digitsOnly(input.zip).slice(0, 5),
  };

  if (isAssociation) {
    out.commercialAccount = "1";
    if (input.company?.trim()) {
      out.companyName = input.company.trim();
    }
  }

  // Context notes for the front office
  const noteParts: string[] = [];
  if (input.sqft) noteParts.push(`Square footage: ${input.sqft}`);
  if (input.units) noteParts.push(`Unit count: ${input.units}`);
  if (input.freq) noteParts.push(`Requested frequency: ${input.freq}`);
  noteParts.push(
    `Property type: ${isAssociation ? "Association / HOA" : "Residential"}`,
  );
  if (noteParts.length > 0) {
    out.specialScheduling = noteParts.join(" | ");
  }

  return out;
}

function buildSubscriptionPayload(
  input: LeadInput,
  customerID: number,
): Record<string, string | number> {
  const isAssociation = input.propertyType === "Association";
  const freq = input.freq ?? "Monthly";

  const typeMap =
    SERVICE_ID_MAP[isAssociation ? "Association" : "Residential"] ?? {};
  const serviceID = typeMap[freq] ?? typeMap["Monthly"] ?? 5;
  const frequencyDays = FREQUENCY_DAYS[freq] ?? 30;

  return {
    customerID,
    serviceID,
    active: 1,
    frequency: frequencyDays,
    sourceID: SOURCE_WEBSITE,
    convertToLead: 1,
  };
}

// ── Handler ──────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  const method =
    event.httpMethod ?? event.requestContext?.http?.method ?? "POST";

  if (method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  // Parse body
  let raw: string;
  try {
    raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf-8")
      : event.body ?? "";
  } catch {
    return jsonResponse(400, { error: "Invalid body encoding" });
  }

  let input: LeadInput;
  try {
    input = JSON.parse(raw || "{}") as LeadInput;
  } catch {
    return jsonResponse(400, { error: "Body must be JSON" });
  }

  // Validate
  const missing = REQUIRED_FIELDS.filter((k) => !(input[k] ?? "").trim());
  if (missing.length > 0) {
    return jsonResponse(422, { error: "Missing required fields", missing });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.email ?? "").trim())) {
    return jsonResponse(422, { error: "Invalid email" });
  }
  if (digitsOnly(input.phone).length < 7) {
    return jsonResponse(422, { error: "Invalid phone" });
  }

  // Credentials
  const subdomain = process.env.FIELDROUTES_SUBDOMAIN ?? "buzzkill";
  const key = process.env.FIELDROUTES_KEY ?? "";
  const token = process.env.FIELDROUTES_TOKEN ?? "";
  const dryRun = process.env.LEAD_INTAKE_DRY_RUN === "1";

  const isPlaceholder = (s: string) =>
    s.includes("<value will be resolved during runtime>");
  const unresolved: string[] = [];
  if (!key || isPlaceholder(key)) unresolved.push("FIELDROUTES_KEY");
  if (!token || isPlaceholder(token)) unresolved.push("FIELDROUTES_TOKEN");
  if (!subdomain || isPlaceholder(subdomain))
    unresolved.push("FIELDROUTES_SUBDOMAIN");
  if (unresolved.length > 0) {
    console.error("FieldRoutes credentials missing or unresolved", {
      unresolved,
    });
    return jsonResponse(500, {
      error:
        "Server misconfigured: required secrets are not set for this branch.",
      unresolved,
      hint: "Set them in Amplify Console → App settings → Secrets, scoped to this branch, then redeploy.",
    });
  }

  const customerPayload = buildCustomerPayload(input);

  if (dryRun) {
    const subPayload = buildSubscriptionPayload(input, 0);
    console.log("[dry-run] customer payload:", customerPayload);
    console.log("[dry-run] subscription payload:", subPayload);
    return jsonResponse(200, {
      ok: true,
      dryRun: true,
      customerPayload,
      subscriptionPayload: subPayload,
    });
  }

  // ── Step 1: Create customer ──────────────────────────────────────
  let customerResult: { status: number; body: Record<string, unknown> };
  try {
    customerResult = await frPost(
      subdomain,
      key,
      token,
      "customer/create",
      customerPayload,
    );
  } catch (err) {
    const e = err as { name?: string; message?: string; cause?: unknown };
    const cause = e?.cause as { code?: string; message?: string } | undefined;
    console.error("customer/create fetch failed", {
      name: e?.name,
      message: e?.message,
      causeCode: cause?.code,
    });
    return jsonResponse(502, {
      error: "Upstream request failed (customer/create)",
      detail: e?.message ?? String(err),
    });
  }

  console.log("customer/create response", customerResult);

  if (
    customerResult.status < 200 ||
    customerResult.status >= 300 ||
    customerResult.body.success === false
  ) {
    return jsonResponse(502, {
      error: "FieldRoutes rejected customer/create",
      upstreamStatus: customerResult.status,
      upstreamBody: customerResult.body,
    });
  }

  const customerID = Number(customerResult.body.result);
  if (!customerID || isNaN(customerID)) {
    console.error("customer/create returned no customerID", customerResult.body);
    return jsonResponse(502, {
      error: "customer/create succeeded but returned no customer ID",
      upstreamBody: customerResult.body,
    });
  }

  // ── Step 2: Create subscription (as lead) ────────────────────────
  const subPayload = buildSubscriptionPayload(input, customerID);

  let subResult: { status: number; body: Record<string, unknown> };
  try {
    subResult = await frPost(
      subdomain,
      key,
      token,
      "subscription/create",
      subPayload,
    );
  } catch (err) {
    const e = err as { name?: string; message?: string };
    console.error("subscription/create fetch failed", {
      name: e?.name,
      message: e?.message,
    });
    // Customer was created — report partial success
    return jsonResponse(200, {
      ok: true,
      customerID,
      warning: "Customer created but subscription/create failed",
      subscriptionError: e?.message ?? String(err),
    });
  }

  console.log("subscription/create response", subResult);

  if (
    subResult.status < 200 ||
    subResult.status >= 300 ||
    subResult.body.success === false
  ) {
    // Customer was created — report partial success
    return jsonResponse(200, {
      ok: true,
      customerID,
      warning: "Customer created but subscription was rejected",
      upstreamBody: subResult.body,
    });
  }

  const subscriptionID = Number(subResult.body.result);

  // ── Step 3: Set CNT (quantity) on ticket templates ───────────────
  // The base service line item's CNT is the quantity on the ticket
  // item itself, not an addon. We find the ticket templates created
  // by the subscription, get their addon/item lists, and update the
  // base item's quantity via ticket/updateAddOn.
  const isAssociation = input.propertyType === "Association";
  const cnt = Number(digitsOnly(isAssociation ? input.units : input.sqft));
  let ticketWarning: string | undefined;

  if (subscriptionID && cnt > 0) {
    try {
      // Find both Initial (I) and Recurring (R) ticket templates
      for (const tmplType of ["I", "R"] as const) {
        const searchResult = await frPost(subdomain, key, token, "ticket/search", {
          subscriptionIDs: subscriptionID,
          templateType: tmplType,
          includeData: 1,
        });
        console.log(`ticket/search (${tmplType}) response`, searchResult);

        const ticketIDs = searchResult.body.ticketIDs as number[] | undefined;
        const ticketID = ticketIDs?.[0];
        if (!ticketID) {
          console.warn(`No ${tmplType} ticket template found for subscription ${subscriptionID}`);
          continue;
        }

        // Get the existing items on this ticket
        const addonsResult = await frPost(subdomain, key, token, "ticket/getAddons", {
          ticketID,
        });
        console.log(`ticket/getAddons (${tmplType}) response`, addonsResult);

        // Find the base service item (the one with the service charge)
        // The result can be an array or object keyed by itemID
        const items = addonsResult.body;
        let baseItemID: number | undefined;

        if (items && typeof items === "object") {
          // Try array format first
          const arr = Array.isArray(items.result)
            ? items.result
            : Array.isArray(items)
              ? items
              : Object.values(items).filter((v): v is Record<string, unknown> =>
                  typeof v === "object" && v !== null && "itemID" in (v as Record<string, unknown>));

          if (arr.length > 0) {
            // Use the first item — it's typically the base service charge
            const first = arr[0] as Record<string, unknown>;
            baseItemID = Number(first.itemID ?? first.id);
          }
        }

        if (baseItemID && !isNaN(baseItemID)) {
          const updateResult = await frPost(subdomain, key, token, "ticket/updateAddOn", {
            ticketID,
            itemID: baseItemID,
            quantity: cnt,
          });
          console.log(`ticket/updateAddOn (${tmplType}) response`, updateResult);

          if (updateResult.body.success === false) {
            console.warn(`updateAddOn (${tmplType}) rejected`, updateResult.body);
          }
        } else {
          console.warn(`No base item found on ${tmplType} ticket ${ticketID}`);
        }
      }
    } catch (err) {
      const e = err as { message?: string };
      ticketWarning = `Ticket quantity update failed: ${e?.message ?? String(err)}`;
      console.error(ticketWarning);
    }
  }

  // ── Step 4: Create contract and email to customer ─────────────────
  // contract/create generates the default agreement for the subscription
  // and emailCustomer=1 sends the signing link to the customer.
  let contractWarning: string | undefined;
  let contractID: number | undefined;

  if (subscriptionID) {
    try {
      const contractResult = await frPost(subdomain, key, token, "contract/create", {
        subscriptionID,
        emailCustomer: 1,
        notifyCustomerOnSignedAgreement: 1,
      });
      console.log("contract/create response", contractResult);

      if (contractResult.body.success === false) {
        contractWarning = `contract/create rejected: ${JSON.stringify(contractResult.body)}`;
        console.warn(contractWarning);
      } else {
        contractID = Number(contractResult.body.result) || undefined;
      }
    } catch (err) {
      const e = err as { message?: string };
      contractWarning = `contract/create failed: ${e?.message ?? String(err)}`;
      console.error(contractWarning);
    }
  }

  return jsonResponse(200, {
    ok: true,
    customerID,
    subscriptionID: subscriptionID || undefined,
    contractID,
    ...(ticketWarning ? { ticketWarning } : {}),
    ...(contractWarning ? { contractWarning } : {}),
    upstream: {
      customer: customerResult.body,
      subscription: subResult.body,
    },
  });
};
