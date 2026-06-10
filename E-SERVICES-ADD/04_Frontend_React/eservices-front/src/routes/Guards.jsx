// src/routes/Guards.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const STAFF_ROLES = ["admin", "responsable", "agent"];

export function RequireAuth() {
    const { isAuth, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Ancien accès admin réservé au rôle nommé "admin" uniquement */
export function RequireAdmin() {
    const { isAuth, loading, hasRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    return hasRole("admin") ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

/** Espace d’administration partagé : admin, responsable d’agence, agent d’agence */
export function RequireStaff() {
    const { isAuth, loading, hasAnyRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    return hasAnyRole(STAFF_ROLES) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

/** Sous-partie réservée à l’administrateur (clients, agences & rôles) */
export function RequireAdminStaff() {
    const { isAuth, loading, hasRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!hasRole("admin")) {
        return <Navigate to="/admin" replace />;
    }
    return <Outlet />;
}

/** Tableau de bord : admin (global), responsable ou agent d’agence (périmètre agence) */
export function RequireDashboardAccess() {
    const { isAuth, loading, hasAnyRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!hasAnyRole(["admin", "responsable", "agent"])) {
        return <Navigate to="/admin" replace />;
    }
    return <Outlet />;
}

/** Paramètres : admin (complet) ou responsable (vue limitée) */
export function RequireSettingsAccess() {
    const { isAuth, loading, hasAnyRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!hasAnyRole(["admin", "responsable"])) {
        return <Navigate to="/admin" replace />;
    }
    return <Outlet />;
}

/** Gestion des services : admin + responsable d’agence */
export function RequireServiceAccess() {
    const { isAuth, loading, hasAnyRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!hasAnyRole(["admin", "responsable"])) {
        return <Navigate to="/admin/requests" replace />;
    }
    return <Outlet />;
}

/** Gestion des demandes : admin + agent + responsable d’agence */
export function RequireRequestAccess() {
    const { isAuth, loading, hasAnyRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!hasAnyRole(["admin", "agent", "responsable"])) {
        return <Navigate to="/admin/services" replace />;
    }
    return <Outlet />;
}

export function RequireClient() {
    const { isAuth, loading, hasRole } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    return hasRole("client") ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

/** Portail employé classique (réception / directeur) — sans agent ni responsable */
export function RequireEmployee() {
    const { isAuth, loading, user } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;

    const allowedRoles = ["director", "reception"];
    const isEmployee = allowedRoles.some((r) => user?.roles?.includes(r));

    return isEmployee ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

/** Redirection /admin selon le rôle (index route) */
export function StaffDefaultRedirect() {
    const { loading, hasRole, user } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (hasRole("admin")) return <Navigate to="/admin/dashboard" replace />;
    if (user?.roles?.includes("responsable")) return <Navigate to="/admin/dashboard" replace />;
    if (user?.roles?.includes("agent")) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
}
