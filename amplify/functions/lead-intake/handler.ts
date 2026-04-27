/**
 * Lead-intake Lambda — proxies the BuzzKill contact form to FieldRoutes.
 *
 * Frontend posts a JSON body like:
 *   {
 *     propertyType: "Residential" | "Commercial",
 *     first, last, email, phone,
 *     addr, city, state, zip,
 *     sqft, units, freq, company
 *   }
 *
 * We validate, map to FieldRoutes' `customer/create` field names, and POST
 * to https://{subdomain}.pestroutes.com/api/customer/create with
 * authenticationKey + authenticationToken on the query string.
 *
 * Lead status is set via active = -3 (FieldRoutes / PestRoutes convention).
 *
 * IMPORTANT: the exact set of accepted field names + required fields for
 * customer/create is tenant-Swagger-defined, not publicly documented. The
 * mapping below is a best-effort starting point. After the first real
 * submission, check CloudWatch logs to see what FieldRoutes returned and
 * adjust `mapToFieldRoutes` if it complains about field names.
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
  propertyType?: "Residential" | "Commercial" | string;
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

// CORS is configured on the Lambda Function URL itself (see
// amplify/backend.ts). AWS adds the Access-Control-* headers to every
// response automatically and handles OPTIONS preflight without invoking
// the function. Setting CORS headers here too produces duplicate
// values that browsers reject — see issue from prod 2026-04-27.

function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayLikeResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function digitsOnly(s: string | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

function mapToFieldRoutes(input: LeadInput): Record<string, string> {
  const isCommercial = input.propertyType === "Commercial";
  const out: Record<string, string> = {
    fname: (input.first ?? "").trim(),
    lname: (input.last ?? "").trim(),
    email: (input.email ?? "").trim(),
    phone1: digitsOnly(input.phone),
    address: (input.addr ?? "").trim(),
    city: (input.city ?? "").trim(),
    state: (input.state ?? "").trim().toUpperCase().slice(0, 2),
    zip: digitsOnly(input.zip).slice(0, 5),
    // Lead status. FieldRoutes / PestRoutes convention: active = -3 == Lead.
    active: "-3",
    // Marketing source — adjust to a real customerSource ID once the
    // tenant has one configured.
    customerSource: "Website",
  };

  if (isCommercial) {
    out.commercialAccount = "1";
    if (input.company && input.company.trim()) {
      out.companyName = input.company.trim();
    }
  }

  // Optional context — sent through as notes so the front office sees
  // square footage / unit count / requested frequency without us
  // guessing the right structured field names.
  const noteParts: string[] = [];
  if (input.sqft) noteParts.push(`Square footage: ${input.sqft}`);
  if (input.units) noteParts.push(`Unit count: ${input.units}`);
  if (input.freq) noteParts.push(`Requested frequency: ${input.freq}`);
  noteParts.push(
    `Property type: ${isCommercial ? "Commercial" : "Residential"}`,
  );
  if (noteParts.length > 0) {
    out.specialScheduling = noteParts.join(" | ");
  }

  return out;
}

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

  const subdomain = process.env.FIELDROUTES_SUBDOMAIN ?? "buzzkill";
  const key = process.env.FIELDROUTES_KEY ?? "";
  const token = process.env.FIELDROUTES_TOKEN ?? "";
  const dryRun = process.env.LEAD_INTAKE_DRY_RUN === "1";

  if (!key || !token) {
    console.error("FieldRoutes credentials missing from environment");
    return jsonResponse(500, {
      error: "Server misconfigured (credentials missing)",
    });
  }

  const payload = mapToFieldRoutes(input);

  if (dryRun) {
    console.log("[dry-run] would-be FieldRoutes payload:", payload);
    return jsonResponse(200, { ok: true, dryRun: true, payload });
  }

  const url = `https://${subdomain}.pestroutes.com/api/customer/create`;
  const body = new URLSearchParams({
    authenticationKey: key,
    authenticationToken: token,
    ...payload,
  });

  let upstreamStatus = 0;
  let upstreamText = "";
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    upstreamStatus = resp.status;
    upstreamText = await resp.text();
  } catch (err) {
    console.error("FieldRoutes fetch failed", err);
    return jsonResponse(502, { error: "Upstream request failed" });
  }

  // FieldRoutes typically returns JSON like
  //   { success: true, customerID: 12345 }
  // or { success: false, errorMessage: "..." }
  // We log the raw body so CloudWatch shows exactly what came back during
  // the first few real submissions — that tells us whether our field
  // mapping is right.
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(upstreamText);
  } catch {
    // not JSON — keep upstreamText for the log line below
  }

  console.log("FieldRoutes response", {
    upstreamStatus,
    body: parsed ?? upstreamText.slice(0, 1000),
  });

  if (upstreamStatus < 200 || upstreamStatus >= 300) {
    return jsonResponse(502, {
      error: "FieldRoutes rejected the request",
      upstreamStatus,
      upstreamBody: parsed ?? upstreamText.slice(0, 500),
    });
  }

  // Success — but FieldRoutes may still report logical failure with HTTP 200.
  if (
    parsed &&
    typeof parsed === "object" &&
    "success" in parsed &&
    (parsed as { success?: unknown }).success === false
  ) {
    return jsonResponse(502, {
      error: "FieldRoutes reported failure",
      upstreamBody: parsed,
    });
  }

  return jsonResponse(200, {
    ok: true,
    upstream: parsed ?? upstreamText.slice(0, 500),
  });
};
