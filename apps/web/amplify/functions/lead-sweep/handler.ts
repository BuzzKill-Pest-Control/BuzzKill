import { assertBusinessActionsEnabled } from "../shared/migrationPreview";
import { sweepLeads } from "../shared/leadSweep";

export const handler = async () => {
  assertBusinessActionsEnabled();
  return sweepLeads();
};
