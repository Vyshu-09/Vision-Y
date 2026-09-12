import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { dashboardPath, type Role } from "../types";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="ui-shell flex min-h-svh items-center justify-center text-muted">
        Loading session…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}
