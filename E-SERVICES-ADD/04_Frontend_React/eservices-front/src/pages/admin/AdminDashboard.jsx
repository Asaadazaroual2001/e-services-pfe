import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getAdminDashboardSummary } from "../../api/adminApi";
import "./AdminDashboard.css";
import "./RequestsManagement.css";

const REQUEST_STATUS_META = [
    { key: "DRAFT", label: "Brouillon", className: "draft" },
    { key: "SUBMITTED", label: "Soumise", className: "submitted" },
    { key: "IN_REVIEW", label: "En révision", className: "in-review" },
    { key: "NEEDS_INFO", label: "Info requise", className: "needs-info" },
    { key: "APPROVED", label: "Approuvée", className: "approved" },
    { key: "REJECTED", label: "Rejetée", className: "rejected" },
    { key: "CLOSED", label: "Fermée", className: "closed" },
];

function AnimatedNumber({ value, duration = 900, className = "" }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const raw = Number(value);
        const safeEnd = Number.isFinite(raw) ? raw : 0;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) {
            setDisplayValue(safeEnd);
            return;
        }

        let rafId = null;
        const start = 0;
        const end = safeEnd;
        const startTime = performance.now();

        const tick = (now) => {
            const progress = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round(start + (end - start) * eased));

            if (progress < 1) rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [value, duration]);

    const formatted = useMemo(() => {
        return new Intl.NumberFormat("fr-FR").format(displayValue);
    }, [displayValue]);

    return <span className={className}>{formatted}</span>;
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Agence + service sur une ligne (demandes récentes). */
function agencyAndServiceMeta(agencyName, serviceName) {
    const a = agencyName != null && String(agencyName).trim() !== "" ? String(agencyName).trim() : "";
    const s = serviceName != null && String(serviceName).trim() !== "" ? String(serviceName).trim() : "";
    if (a && s) return `${a} • ${s}`;
    if (s) return s;
    if (a) return a;
    return "—";
}

export default function AdminDashboard() {
    const { hasRole } = useAuth();
    const isResponsableView = hasRole("responsable") && !hasRole("admin");
    const isAgentAgencyView = hasRole("agent") && !hasRole("admin") && !hasRole("responsable");
    const isLimitedAgencyDashboard = isResponsableView || isAgentAgencyView;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [agenciesTotal, setAgenciesTotal] = useState(0);
    const [employeesTotal, setEmployeesTotal] = useState(0);
    const [servicesTotal, setServicesTotal] = useState(0);

    const [requestsByStatus, setRequestsByStatus] = useState({});
    const [requestsUnviewedTotal, setRequestsUnviewedTotal] = useState(0);

    const [recentRequests, setRecentRequests] = useState([]);
    const [agencyNames, setAgencyNames] = useState([]);

    const requestsTotal = useMemo(() => {
        return Object.values(requestsByStatus).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }, [requestsByStatus]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError("");

            try {
                const res = await getAdminDashboardSummary();
                const d = res?.data;
                if (!d) {
                    throw new Error("Réponse tableau de bord invalide");
                }

                setServicesTotal(Number(d.services_total ?? 0));
                setRequestsByStatus(d.requests_by_status || {});
                setRequestsUnviewedTotal(Number(d.requests_unviewed_by_staff ?? 0));
                setRecentRequests(Array.isArray(d.recent_requests) ? d.recent_requests : []);

                if (isLimitedAgencyDashboard) {
                    setAgenciesTotal(0);
                    setEmployeesTotal(0);
                    setAgencyNames(Array.isArray(d.agency_names) ? d.agency_names : []);
                } else {
                    setAgenciesTotal(Number(d.agencies_total ?? 0));
                    setEmployeesTotal(Number(d.employees_total ?? 0));
                    setAgencyNames([]);
                }
            } catch (e) {
                console.error("Admin dashboard load error:", e);
                setError(
                    e?.response?.data?.message ||
                        e?.message ||
                        "Erreur lors du chargement du tableau de bord."
                );
            } finally {
                setLoading(false);
            }
        })();
    }, [isLimitedAgencyDashboard]);

    return (
        <div className="admin-dashboard">
            {loading ? (
                <div className="admin-dashboard-loading">
                    <div className="loading-spinner" aria-hidden="true" />
                    <p>Chargement des statistiques...</p>
                </div>
            ) : error ? (
                <div className="admin-dashboard-error">{error}</div>
            ) : (
                <>
                    <div className="admin-dashboard-hero">
                        <div>
                            <h2 className="admin-dashboard-title">Tableau de bord</h2>
                            <p className="admin-dashboard-subtitle">
                                {isAgentAgencyView
                                    ? "Vue agent d’agence : compteurs limités à votre agence et aux demandes des services rattachés (comme « Gestion des demandes »)."
                                    : isResponsableView
                                      ? "Chiffres limités aux services des agences dont vous êtes responsable — identiques à la liste « Gestion des demandes »."
                                      : "Statistiques globales du site (agences, services, demandes)."}
                            </p>
                            {isAgentAgencyView && agencyNames.length === 0 ? (
                                <p className="admin-dashboard-subtitle" style={{ marginTop: 8, color: "#b45309" }}>
                                    Aucune agence n’est associée à votre compte : contactez un administrateur pour renseigner votre agence.
                                </p>
                            ) : null}
                            {isLimitedAgencyDashboard && agencyNames.length > 0 ? (
                                <p className="admin-dashboard-subtitle" style={{ marginTop: 8, fontWeight: 600 }}>
                                    Agence{agencyNames.length > 1 ? "s" : ""} : {agencyNames.join(" · ")}
                                </p>
                            ) : null}
                        </div>
                        <div className="admin-dashboard-updated">
                            <div className="updated-pill">Mise à jour automatique</div>
                        </div>
                    </div>

                    <div className="admin-dashboard-stats-grid">
                        {!isLimitedAgencyDashboard ? (
                            <>
                                <Link
                                    to="/admin/roles"
                                    className="kpi-card kpi-agencies kpi-stat-link"
                                    aria-label="Voir la gestion des agences"
                                >
                                    <div className="kpi-label">Agences</div>
                                    <div className="kpi-value">
                                        <AnimatedNumber value={agenciesTotal} className="kpi-number" />
                                    </div>
                                    <div className="kpi-footer">Nombre d&apos;agences enregistrées</div>
                                </Link>

                                <Link
                                    to="/admin/users"
                                    className="kpi-card kpi-employees kpi-stat-link"
                                    aria-label="Voir la gestion des employés"
                                >
                                    <div className="kpi-label">Employés</div>
                                    <div className="kpi-value">
                                        <AnimatedNumber value={employeesTotal} className="kpi-number" />
                                    </div>
                                    <div className="kpi-footer">Agent, responsable, directeur</div>
                                </Link>
                            </>
                        ) : null}

                        <Link
                            to="/admin/services"
                            className="kpi-card kpi-services kpi-stat-link"
                            aria-label="Voir la gestion des services"
                        >
                            <div className="kpi-label">Services</div>
                            <div className="kpi-value">
                                <AnimatedNumber value={servicesTotal} className="kpi-number" />
                            </div>
                            <div className="kpi-footer">
                                {isResponsableView
                                    ? "Rattachés à vos agences"
                                    : isAgentAgencyView
                                      ? "Formulaires de votre agence"
                                      : "Total des formulaires"}
                            </div>
                        </Link>

                        <Link
                            to="/admin/requests"
                            className="kpi-card kpi-requests kpi-stat-link"
                            aria-label="Voir toutes les demandes"
                        >
                            <div className="kpi-label">Demandes</div>
                            <div className="kpi-value">
                                <AnimatedNumber value={requestsTotal} className="kpi-number" />
                            </div>
                            <div className="kpi-footer">
                                {isLimitedAgencyDashboard
                                    ? "Sur les services de votre périmètre"
                                    : "Somme des statuts"}
                            </div>
                        </Link>

                        <Link
                            to="/admin/requests?is_viewed=0"
                            className="kpi-card kpi-stat-link"
                            aria-label="Voir les demandes pas encore consultées par un employé"
                        >
                            <div className="kpi-label">Demandes pas encore consultées</div>
                            <div className="kpi-value">
                                <AnimatedNumber value={requestsUnviewedTotal} className="kpi-number" />
                            </div>
                            <div className="kpi-footer">
                                Soumises, actives, jamais ouvertes par un employé (filtre « non consultées »).
                            </div>
                        </Link>
                    </div>

                    <div className="admin-dashboard-section">
                        <div className="section-header">
                            <h3 className="section-title">Répartition par statut</h3>
                            <span className="section-hint">
                                {requestsTotal > 0
                                    ? isLimitedAgencyDashboard
                                        ? "Cliquez sur un statut pour filtrer la liste des demandes (votre périmètre)."
                                        : "Cliquez sur un statut pour ouvrir la liste filtrée."
                                    : ""}
                            </span>
                        </div>

                        <div className="status-grid">
                            {REQUEST_STATUS_META.map((s) => (
                                <Link
                                    key={s.key}
                                    to={`/admin/requests?status=${encodeURIComponent(s.key)}`}
                                    className="status-card status-stat-link"
                                    aria-label={`Voir les demandes au statut ${s.label}`}
                                >
                                    <div className="status-card-top">
                                        <span className={`status-badge ${s.className}`}>{s.label}</span>
                                    </div>
                                    <div className="status-count">
                                        <AnimatedNumber
                                            value={requestsByStatus[s.key] ?? 0}
                                            className="status-count-number"
                                        />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="admin-dashboard-section">
                        <div className="section-header">
                            <h3 className="section-title">Demandes récentes</h3>
                            <span className="section-hint">
                                {isLimitedAgencyDashboard
                                    ? "Dernières demandes sur votre périmètre"
                                    : "Dernières demandes enregistrées"}
                            </span>
                        </div>

                        <div className="recent-list">
                            {recentRequests.length === 0 ? (
                                <div className="recent-empty">Aucune demande récente.</div>
                            ) : (
                                recentRequests.map((r) => {
                                    const meta = REQUEST_STATUS_META.find((s) => s.key === r.current_status);
                                    return (
                                        <Link
                                            key={r.id}
                                            to={`/admin/requests/${r.id}`}
                                            className="recent-item"
                                        >
                                            <div className="recent-left">
                                                <div className="recent-reference">{r.reference}</div>
                                                <div className="recent-meta">
                                                    {agencyAndServiceMeta(r.agency_name, r.service_name)}
                                                </div>
                                                <div className="recent-date">{formatDate(r.created_at)}</div>
                                            </div>
                                            <div className="recent-right">
                                                <span
                                                    className={`status-badge ${meta?.className || "draft"}`}
                                                    title={r.current_status}
                                                >
                                                    {meta?.label || r.current_status}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

