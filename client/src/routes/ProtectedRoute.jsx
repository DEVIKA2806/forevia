import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./ProtectedRoute.module.css";

/**
 * Guards every authenticated route. `status` comes from AuthContext, which
 * calls GET /api/auth/me once when the app loads:
 *  - "checking"        still waiting on that request — show a loading state
 *  - "unauthenticated"  no valid session — redirect to /login
 *  - "authenticated"    render the requested page via <Outlet />
 *
 * IMPORTANT: this is frontend UX only. It hides pages an unauthenticated
 * visitor shouldn't see, but it is NOT what actually protects any real
 * data — a determined visitor could still call the API directly. The
 * actual protection is the `requireAuth` middleware on the backend, which
 * every endpoint returning real user data must use. This component and
 * that middleware are two separate, independent checks.
 */
function ProtectedRoute() {
  const { status } = useAuth();

  if (status === "checking") {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
