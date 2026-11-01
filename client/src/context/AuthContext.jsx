import { createContext, useContext, useEffect, useState } from "react";
import {
  signupRequest,
  loginRequest,
  logoutRequest,
  fetchCurrentUser,
} from "../api/auth";

const AuthContext = createContext(null);

/**
 * The app's single source of authentication state. Deliberately does NOT
 * store a JWT anywhere — the httpOnly cookie is the actual source of
 * truth, and this context just reflects what the backend says about it.
 *
 * `status` has three states:
 *  - "checking"        while the initial GET /api/auth/me is in flight
 *  - "authenticated"    a valid session exists; `user` is populated
 *  - "unauthenticated"  no valid session (no cookie, or an expired/
 *                        invalid one)
 *
 * ProtectedRoute reads `status` to decide whether to show a loading
 * state, render the page, or redirect to /login.
 */
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");

  // On first load, ask the backend "does the cookie in this browser
  // belong to a valid session?" This is what makes a page refresh keep
  // the user logged in — the cookie was already there, we're just
  // confirming it and fetching the user it belongs to.
  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const data = await loginRequest(email, password);
    setUser(data.user);
    setStatus("authenticated");
    return data.user;
  }

  async function signup(name, email, password) {
    const data = await signupRequest(name, email, password);
    setUser(data.user);
    setStatus("authenticated");
    return data.user;
  }

  async function logout() {
    // Await the request even though we clear local state either way —
    // this actually clears the cookie server-side, rather than just
    // hiding the logged-in UI while the cookie (and session) stays valid.
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }

  // Lets the profile page push an updated user object back into auth
  // state after a successful save, so the change is reflected everywhere
  // immediately without a full page reload or a refetch of /auth/me.
  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  const value = { user, status, login, signup, logout, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth };
