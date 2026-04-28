#!/usr/bin/env npx tsx
/**
 * Sync Buildium associations → src/data/properties.json
 *
 * Pulls all active associations from the Buildium API and generates
 * a JSON file that the resident signup page uses for property lookup.
 *
 * Usage:
 *   npx tsx scripts/sync-buildium.ts
 *
 * Environment variables (or defaults below):
 *   BUILDIUM_BASE_URL
 *   BUILDIUM_CLIENT_ID
 *   BUILDIUM_CLIENT_SECRET
 */

const BASE_URL = process.env.BUILDIUM_BASE_URL || "https://api.buildium.com";
const CLIENT_ID =
  process.env.BUILDIUM_CLIENT_ID ||
  "a32ffd58-8115-429e-a623-9a938b94a058";
const CLIENT_SECRET =
  process.env.BUILDIUM_CLIENT_SECRET ||
  "Ssh1fB+e1EYz8gLP/kIKKjHRedMkuf+KuCen6kZz2ZU=";

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type BuildiumAssociation = {
  Id: number;
  Name: string;
  IsActive: boolean;
  Address?: {
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    State?: string;
    PostalCode?: string;
    Country?: string;
  };
};

type PropertyEntry = {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function fetchAssociations(): Promise<BuildiumAssociation[]> {
  const all: BuildiumAssociation[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const url = `${BASE_URL}/v1/associations?status=Active&limit=${limit}&offset=${offset}`;
    console.log(`Fetching ${url}`);

    const resp = await fetch(url, {
      headers: {
        "x-buildium-client-id": CLIENT_ID,
        "x-buildium-client-secret": CLIENT_SECRET,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      throw new Error(
        `Buildium API error: ${resp.status} ${resp.statusText} — ${await resp.text()}`,
      );
    }

    const data = (await resp.json()) as BuildiumAssociation[];
    all.push(...data);

    if (data.length < limit) break;
    offset += limit;
  }

  return all;
}

async function main() {
  console.log("Syncing Buildium associations...\n");

  const associations = await fetchAssociations();
  console.log(`Found ${associations.length} active associations\n`);

  const properties: PropertyEntry[] = associations
    .filter((a) => a.IsActive && a.Name)
    .map((a) => ({
      id: a.Id,
      name: a.Name,
      slug: toSlug(a.Name),
      address: [a.Address?.AddressLine1, a.Address?.AddressLine2]
        .filter(Boolean)
        .join(", "),
      city: a.Address?.City ?? "",
      state: a.Address?.State ?? "",
      zip: a.Address?.PostalCode ?? "",
    }));

  // Dedupe slugs — append ID if collision
  const slugCounts: Record<string, number> = {};
  for (const p of properties) {
    slugCounts[p.slug] = (slugCounts[p.slug] ?? 0) + 1;
  }
  for (const p of properties) {
    if (slugCounts[p.slug] > 1) {
      p.slug = `${p.slug}-${p.id}`;
    }
  }

  const outPath = resolve(__dirname, "../src/data/properties.json");
  writeFileSync(outPath, JSON.stringify(properties, null, 2) + "\n");

  console.log(`Wrote ${properties.length} properties to ${outPath}`);
  console.log("\nSample entries:");
  properties.slice(0, 5).forEach((p) => {
    console.log(`  ${p.slug} → ${p.name} (${p.city}, ${p.state})`);
  });
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
