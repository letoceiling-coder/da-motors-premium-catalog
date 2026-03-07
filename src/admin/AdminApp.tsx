import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "@/admin/auth";
import { AdminLayout } from "@/admin/layouts/AdminLayout";
import { AdminLoginPage } from "@/admin/pages/AdminLoginPage";
import { AdminDashboardPage } from "@/admin/pages/AdminDashboardPage";
import { AdminBotPage } from "@/admin/pages/AdminBotPage";
import { AdminBroadcastPage } from "@/admin/pages/AdminBroadcastPage";
import { AdminUsersPage } from "@/admin/pages/AdminUsersPage";

function RequireAdminAuth() {
  const { currentUser } = useAdminAuth();
  if (!currentUser) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

function RedirectIfAuthed() {
  const { currentUser } = useAdminAuth();
  if (currentUser) return <Navigate to="/admin/dashboard" replace />;
  return <AdminLoginPage />;
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<RedirectIfAuthed />} />

        <Route element={<RequireAdminAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="bot" element={<AdminBotPage />} />
            <Route path="broadcast" element={<AdminBroadcastPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}

