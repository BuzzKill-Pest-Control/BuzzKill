export const CUSTOMER_SEARCH_METRIC_NAMESPACE = "BuzzKill/CustomerSearch";
export const CUSTOMER_SEARCH_RECORD_FAILURE_METRIC = "RecordFailures";

/** Low-cardinality EMF only: never attach event images, identities, keys or exception text. */
export function emitCustomerSearchRecordFailures(count: number): void {
  const configured = process.env.AWS_LAMBDA_FUNCTION_NAME ?? "";
  const functionName = /^[A-Za-z0-9_-]{1,64}$/.test(configured) ? configured : "customer-search-indexer";
  // Raw stdout preserves top-level EMF even if Lambda's console log format becomes JSON.
  process.stdout.write(`${JSON.stringify({
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [{
        Namespace: CUSTOMER_SEARCH_METRIC_NAMESPACE, Dimensions: [["FunctionName"]],
        Metrics: [{ Name: CUSTOMER_SEARCH_RECORD_FAILURE_METRIC, Unit: "Count" }],
      }],
    },
    FunctionName: functionName,
    [CUSTOMER_SEARCH_RECORD_FAILURE_METRIC]: count,
  })}\n`);
}
