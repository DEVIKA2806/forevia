import apiRequest from "./client";

// Chart and projection data for the signed-in user. The server works out
// whose profiles to use from the auth cookie; no user id is sent from
// here. Calculation only: nothing is saved.
//
//   years         whole years of projection
//   annualReturn  optional ILLUSTRATIVE yearly return on investments, in
//                 percent. Omit (or 0) to assume no returns.
export function fetchProjections({ years, annualReturn } = {}) {
  const params = new URLSearchParams();
  if (years !== undefined) params.set("years", String(years));
  if (annualReturn !== undefined) {
    params.set("annualReturn", String(annualReturn));
  }
  const query = params.toString();
  return apiRequest(
    `/api/calculations/projections${query ? `?${query}` : ""}`,
    { method: "GET" }
  );
}
