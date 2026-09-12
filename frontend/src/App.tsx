import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ChatPage } from "./pages/Chat";
import { CircularsPage } from "./pages/Circulars";
import { DashboardPage } from "./pages/Dashboard";
import { HistoryPage } from "./pages/History";
import { LoginPage } from "./pages/Login";
import { NotificationsPage } from "./pages/Notifications";
import { PoliciesPage } from "./pages/Policies";
import { ProfilePage } from "./pages/Profile";
import { dashboardPath, type Role } from "./types";

function HomeRedirect() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="ui-shell flex min-h-svh items-center justify-center text-muted">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPath(user.role)} replace />;
}

function AppIndex() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPath(user.role)} replace />;
}

function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-display text-3xl text-navy">Access Denied</p>
        <p className="mt-2 text-muted">
          Your {user.role.replace("_", " ")} account cannot open this page.
        </p>
        <Link to={dashboardPath(user.role)} className="ui-btn ui-btn-primary mt-6 inline-flex">
          Back to your dashboard
        </Link>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<AppIndex />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="chat"
            element={
              <RoleGate roles={["student", "faculty", "staff"]}>
                <ChatPage />
              </RoleGate>
            }
          />
          <Route path="policies" element={<PoliciesPage />} />
          <Route
            path="circulars"
            element={
              <RoleGate roles={["student", "faculty", "staff"]}>
                <CircularsPage />
              </RoleGate>
            }
          />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="history"
            element={
              <RoleGate roles={["student", "faculty", "staff"]}>
                <HistoryPage />
              </RoleGate>
            }
          />
          <Route
            path="admin"
            element={
              <RoleGate roles={["super_admin"]}>
                <Navigate to="/app/dashboard" replace />
              </RoleGate>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
