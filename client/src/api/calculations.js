import apiRequest from "./client";

// Deterministic metrics for the signed-in user. The server works out who
// that is from the auth cookie; no user id is sent from here.
export function fetchCalculationSummary() {
  return apiRequest("/api/calculations/summary", { method: "GET" });
}
