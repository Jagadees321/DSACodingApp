import client from "prom-client";

client.collectDefaultMetrics();

export const submissionCounter = new client.Counter({
  name: "submission_total",
  help: "Total submissions by status",
  labelNames: ["status"],
});

export const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Request duration in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [10, 25, 50, 100, 200, 500, 1000, 2000],
});

export async function metricsText() {
  return client.register.metrics();
}

