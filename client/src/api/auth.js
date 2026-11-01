import apiRequest from "./client";

export function signupRequest(name, email, password) {
  return apiRequest("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function loginRequest(email, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutRequest() {
  return apiRequest("/api/auth/logout", { method: "POST" });
}

export function fetchCurrentUser() {
  return apiRequest("/api/auth/me", { method: "GET" });
}
