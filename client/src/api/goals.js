import apiRequest from "./client";

// Goals for the signed-in user. The server decides whose goals these are
// from the auth cookie; no user id is ever sent from here.

export function fetchGoals() {
  return apiRequest("/api/goals", { method: "GET" });
}

export function createGoal(values) {
  return apiRequest("/api/goals", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateGoal(id, values) {
  return apiRequest(`/api/goals/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function deleteGoal(id) {
  return apiRequest(`/api/goals/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
