import apiRequest from "./client";

export function fetchProfile() {
  return apiRequest("/api/user/profile", { method: "GET" });
}

export function updateProfile(name) {
  return apiRequest("/api/user/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}
