import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RoleSelection from "./pages/RoleSelection";
import AdminDashboard from "./pages/AdminDashboard";
import TeamDashboard from "./pages/TeamDashboard";
import ClaimDetail from "./pages/ClaimDetail";
import UploadClaim from "./pages/UploadClaim";
import SettlementAudit from "./pages/SettlementAudit";

function ProtectedAdmin({ children }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function ProtectedHandler({ children }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { role, team } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<RoleSelection />} />
      <Route
        path="/admin"
        element={
          <ProtectedAdmin>
            <AdminDashboard />
          </ProtectedAdmin>
        }
      />
      <Route
        path="/team/:teamName"
        element={
          <ProtectedHandler>
            <TeamDashboard />
          </ProtectedHandler>
        }
      />
      <Route
        path="/claim/:claimId"
        element={
          <ProtectedHandler>
            <ClaimDetail />
          </ProtectedHandler>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedHandler>
            <UploadClaim />
          </ProtectedHandler>
        }
      />
      <Route
        path="/admin/settlement-audit"
        element={
          <ProtectedAdmin>
            <SettlementAudit />
          </ProtectedAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
