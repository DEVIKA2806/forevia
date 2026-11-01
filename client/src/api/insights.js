import apiRequest from "./client";

// Asks the server to generate insights for the signed-in user. No body and
// no user id are sent: the server works out whose data to use from the
// auth cookie, and the AI provider key never leaves the server.
export function generateInsights() {
  return apiRequest("/api/insights", { method: "POST" });
}
