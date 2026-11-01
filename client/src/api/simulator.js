import apiRequest from "./client";

// Runs a what-if scenario on the server and returns current vs what-if
// results. This is a calculation only: nothing is saved, and the server
// works out whose saved profile to compare against from the auth cookie.
// No user id is sent from here.
export function simulateScenario(scenario) {
  return apiRequest("/api/calculations/simulate", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}
