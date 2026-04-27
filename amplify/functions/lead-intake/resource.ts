import { defineFunction, secret } from "@aws-amplify/backend";

/**
 * Lead-intake proxy.
 *
 * Receives a JSON form payload from the marketing site, validates it,
 * and creates a customer (in lead status, active = -3) in FieldRoutes.
 *
 * Credentials are sourced from Amplify secrets. Set them with:
 *
 *   npx ampx sandbox secret set FIELDROUTES_KEY
 *   npx ampx sandbox secret set FIELDROUTES_TOKEN
 *   npx ampx sandbox secret set FIELDROUTES_SUBDOMAIN
 *
 * (or via the Amplify Console for production / branch deployments).
 */
export const leadIntake = defineFunction({
  name: "lead-intake",
  entry: "./handler.ts",
  timeoutSeconds: 15,
  environment: {
    FIELDROUTES_KEY: secret("FIELDROUTES_KEY"),
    FIELDROUTES_TOKEN: secret("FIELDROUTES_TOKEN"),
    FIELDROUTES_SUBDOMAIN: secret("FIELDROUTES_SUBDOMAIN"),
    // Optional: set to "1" to skip the FieldRoutes call and just echo
    // the would-be payload back to the client. Useful when iterating
    // on field mappings.
    LEAD_INTAKE_DRY_RUN: "0",
  },
});
