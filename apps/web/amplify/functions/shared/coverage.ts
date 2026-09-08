/**
 * What a plan covers, from the catalog service id and nothing else.
 *
 * Every generated artifact that lists covered pests (the agreement grid, the
 * quote PDF's coverage strip, and anything added later) reads this module, so
 * a display label can never silently widen or narrow a plan's coverage. The
 * two seasonal plans are exact: the mosquito plan treats mosquitoes only, the
 * mosquito-and-tick plan mosquitoes and ticks only, and neither includes
 * fleas. A one-time job has no plan and therefore no coverage grid.
 *
 * Pure: shared by the Lambdas and tests.
 */
import type { CatalogServiceId } from "./serviceCatalog";

/** The pests a GENERAL recurring plan covers, as printed on the agreement.
 *  Excludes wood-destroying organisms (termites, carpenter ants) and the pests
 *  BuzzKill does not service; never add either here. */
export const GENERAL_PLAN_COVERED_PESTS: readonly string[] = [
  "American Roach",
  "Argentine Ants",
  "Box Elders",
  "Centipedes",
  "Clover Mites",
  "Crickets",
  "Earwigs",
  "Hornets",
  "Mice / Rats",
  "Millipedes",
  "Odorous Ants",
  "Oriental Roaches",
  "Silverfish",
  "Sow Bugs",
  "Spiders",
  "Wasps",
];

/** Agreement-grid names for a plan, or undefined for a one-time job. */
export function coveredPestsFor(
  serviceId: string | null | undefined,
  recurring: boolean
): string[] | undefined {
  if (!recurring) return undefined;
  switch (serviceId) {
    case "MOSQUITO":
      return ["Mosquitoes"];
    case "MOSQUITO_TICK":
      return ["Mosquitoes", "Ticks"];
    default:
      return [...GENERAL_PLAN_COVERED_PESTS];
  }
}

/** Keys into the quote PDF's pest-art set (pestArt.ts). */
export type CoverageArtKey =
  | "ants"
  | "spiders"
  | "cockroaches"
  | "wasps"
  | "rodents"
  | "mosquitoes"
  | "ticks"
  | "fleas";

/**
 * The pictures the quote PDF's "Pests We Protect Against" strip shows for a
 * service. Seasonal plans show exactly their treated pests; general plans the
 * common lineup; services with no pest art show nothing.
 */
export function quoteCoverageArtFor(
  serviceId: CatalogServiceId | string | null | undefined
): CoverageArtKey[] {
  switch (serviceId) {
    case "MOSQUITO":
      return ["mosquitoes"];
    case "MOSQUITO_TICK":
      return ["mosquitoes", "ticks"];
    case "WASP_NEST":
      return ["wasps"];
    case "RODENT":
      return ["rodents"];
    case "ROACH":
      return ["cockroaches"];
    case "GENERAL_PEST":
    case "COMMERCIAL_PEST":
    case "HOA_COMMON_AREA":
      return ["ants", "spiders", "cockroaches", "wasps", "rodents"];
    default:
      // Termite, wildlife, or an unknown id: no pest pictures rather than a
      // guess from the label.
      return [];
  }
}
