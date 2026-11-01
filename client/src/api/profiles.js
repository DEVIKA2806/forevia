import apiRequest from "./client";

export function fetchHealthProfile() {
  return apiRequest("/api/health-profile", { method: "GET" });
}

export function saveHealthProfile(values) {
  return apiRequest("/api/health-profile", {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function fetchWealthProfile() {
  return apiRequest("/api/wealth-profile", { method: "GET" });
}

export function saveWealthProfile(values) {
  return apiRequest("/api/wealth-profile", {
    method: "PUT",
    body: JSON.stringify(values),
  });
}
