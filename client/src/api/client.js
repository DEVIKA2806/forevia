// Base URL of the backend API. Read from an environment variable rather
// than hardcoded, so it can point somewhere other than localhost once the
// frontend and backend are deployed separately (see client/.env.example).
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Thin wrapper around fetch for talking to the Forevia API. Centralizing
 * this in one place means every request handles credentials, JSON
 * headers, and error parsing the same way, instead of each page
 * duplicating fetch boilerplate.
 *
 * `credentials: "include"` is required for auth: it tells the browser to
 * send the httpOnly JWT cookie along with the request, and to store any
 * cookie the server sets in the response (e.g. after login/signup).
 * Without it, the cookie-based auth in Phase 4 simply wouldn't work.
 */
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    // fetch only rejects when the request never got an answer (server
    // down, no connection, blocked). Its own message is "Failed to
    // fetch", which forms would otherwise show to the user as is.
    const error = new Error(
      "We couldn't reach the server. Check your connection and try again."
    );
    error.status = 0;
    error.fieldErrors = null;
    throw error;
  }

  // Every endpoint in this app returns JSON, even on error — but guard
  // against an empty body (e.g. a network-level failure) just in case.
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && data.message) || "Something went wrong. Please try again.";
    const error = new Error(message);
    error.status = response.status;
    // Field-level validation errors, when the endpoint returns them
    // (e.g. { message, errors: { age: "..." } }), so forms can show the
    // message next to the offending field instead of only at the top.
    error.fieldErrors = (data && data.errors) || null;
    throw error;
  }

  return data;
}

export default apiRequest;
