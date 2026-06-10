// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import {
  RequireAuth,
  RequireClient,
  RequireEmployee,
  RequireStaff,
  RequireAdminStaff,
  RequireDashboardAccess,
  RequireSettingsAccess,
  RequireServiceAccess,
  RequireRequestAccess,
  StaffDefaultRedirect,
} from "./routes/Guards";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./components/admin/AdminLayout";
import UsersManagement from "./pages/admin/UsersManagement";
import ServicesManagement from "./pages/admin/ServicesManagement";
import ServiceForm from "./pages/admin/ServiceForm";
import ServiceFieldsManagement from "./pages/admin/ServiceFieldsManagement";
import RequestsManagement from "./pages/admin/RequestsManagement";
import RequestDetails from "./pages/admin/RequestDetails";
import RequestEdit from "./pages/admin/RequestEdit";
import StaffClientEmails from "./pages/admin/StaffClientEmails";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StaffAndAgenciesManagement from "./pages/admin/StaffAndAgenciesManagement";
import SettingsPage from "./pages/admin/SettingsPage";
import ClientLayout from "./pages/client/ClientLayout";
import ServicesList from "./pages/client/ServicesList";
import CreateRequest from "./pages/client/CreateRequest";
import MyRequests from "./pages/client/MyRequests";
import RequestView from "./pages/client/RequestView";
import ClientProfile from "./pages/client/ClientProfile";
import ServiceDetails from "./pages/client/ServiceDetails";
import EmployeeLayout from "./pages/employee/EmployeeLayout";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeRequests from "./pages/employee/EmployeeRequests";
import EmployeeRequestDetails from "./pages/employee/EmployeeRequestDetails";
import ContactPage from "./pages/ContactPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

function HomeRedirect() {
  const { loading, isAuth, hasRole, user } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  if (hasRole("admin")) return <Navigate to="/admin" replace />;
  if (user?.roles?.includes("responsable")) return <Navigate to="/admin/dashboard" replace />;
  if (user?.roles?.includes("agent")) return <Navigate to="/admin/dashboard" replace />;

  const legacyEmployeeRoles = ["director", "reception"];
  if (legacyEmployeeRoles.some((r) => user?.roles?.includes(r))) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  if (hasRole("client")) return <Navigate to="/client/services" replace />;

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Formulaire de demande public (sans compte) */}
          <Route path="/demande/:serviceId" element={<CreateRequest publicGuestMode={true} />} />

          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route element={<RequireClient />}>
            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<Navigate to="/client/services" replace />} />
              <Route path="services" element={<ServicesList />} />
              <Route path="services/:serviceId/request" element={<CreateRequest />} />
              <Route path="services/:serviceId/details" element={<ServiceDetails />} />
              <Route path="requests" element={<MyRequests />} />
              <Route path="requests/:requestId" element={<RequestView />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>
          </Route>

          <Route element={<RequireEmployee />}>
            <Route path="/employee" element={<EmployeeLayout />}>
              <Route index element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="requests" element={<EmployeeRequests />} />
              <Route path="requests/:requestId" element={<EmployeeRequestDetails />} />
            </Route>
          </Route>

          <Route element={<RequireStaff />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<StaffDefaultRedirect />} />

              <Route element={<RequireDashboardAccess />}>
                <Route path="dashboard" element={<AdminDashboard />} />
              </Route>

              <Route element={<RequireAdminStaff />}>
                <Route path="users" element={<UsersManagement />} />
                <Route path="roles" element={<StaffAndAgenciesManagement />} />
              </Route>

              <Route element={<RequireSettingsAccess />}>
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route element={<RequireServiceAccess />}>
                <Route path="services" element={<ServicesManagement />} />
                <Route path="services/new" element={<ServiceForm />} />
                <Route path="services/:id/edit" element={<ServiceForm />} />
                <Route path="services/:id/fields" element={<ServiceFieldsManagement />} />
              </Route>

              <Route element={<RequireRequestAccess />}>
                <Route path="requests" element={<RequestsManagement />} />
                <Route path="requests/:id" element={<RequestDetails />} />
                <Route path="requests/:id/edit" element={<RequestEdit />} />
                <Route path="client-emails" element={<StaffClientEmails />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
