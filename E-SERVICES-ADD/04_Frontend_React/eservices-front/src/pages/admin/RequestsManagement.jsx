import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { listRequests, toggleRequestActive } from "../../api/requestsAdmin";
import { listServices } from "../../api/services";
import "./RequestsManagement.css";

const STATUS_LABELS = {
    DRAFT: { label: "Brouillon", class: "draft" },
    SUBMITTED: { label: "Soumise", class: "submitted" },
    IN_REVIEW: { label: "En révision", class: "in-review" },
    NEEDS_INFO: { label: "Info requise", class: "needs-info" },
    APPROVED: { label: "Approuvée", class: "approved" },
    REJECTED: { label: "Rejetée", class: "rejected" },
    CLOSED: { label: "Fermée", class: "closed" },
};

const EMPTY_REQUEST_FILTERS = {
    status: "",
    service_id: "",
    is_active: "",
    is_viewed: "",
    search: "",
    date_from: "",
    date_to: "",
};

/** Applique ?status=, ?is_active=, ?is_viewed= depuis l’URL ; si un paramètre est absent, le filtre correspondant est réinitialisé. */
function applySearchToFilters(prev, search) {
    const p = new URLSearchParams(search);
    const next = { ...prev };
    if (p.has("status")) {
        next.status = p.get("status") || "";
    } else {
        next.status = "";
    }
    if (p.has("is_active")) {
        const v = p.get("is_active");
        if (v === "1" || v === "true") {
            next.is_active = "1";
        } else if (v === "0" || v === "false") {
            next.is_active = "0";
        } else {
            next.is_active = "";
        }
    } else {
        next.is_active = "";
    }
    if (p.has("is_viewed")) {
        const v = p.get("is_viewed");
        if (v === "1" || v === "true") {
            next.is_viewed = "1";
        } else if (v === "0" || v === "false") {
            next.is_viewed = "0";
        } else {
            next.is_viewed = "";
        }
    } else {
        next.is_viewed = "";
    }
    return next;
}

export default function RequestsManagement() {
    const location = useLocation();
    const { hasRole } = useAuth();
    const isResponsableAgencyView = hasRole("responsable") && !hasRole("admin");
    const isAgentAgencyView = hasRole("agent") && !hasRole("admin") && !hasRole("responsable");

    const [requests, setRequests] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters
    const [filters, setFilters] = useState(() => ({ ...EMPTY_REQUEST_FILTERS }));

    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({});

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    /** @param explicitFilters passé depuis l’URL ou la réinitialisation pour éviter un état React en retard */
    const loadRequests = async (page = 1, explicitFilters) => {
        const source = explicitFilters !== undefined ? explicitFilters : filtersRef.current;
        try {
            setLoading(true);
            setError("");

            const params = {
                page,
                per_page: 15,
                ...source,
            };

            Object.keys(params).forEach((key) => {
                if (params[key] === "" || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await listRequests(params);

            setRequests(response.data || []);
            setPagination({
                current_page: response.current_page,
                last_page: response.last_page,
                total: response.total,
                per_page: response.per_page,
            });
            setCurrentPage(page);
        } catch (err) {
            console.error("Error loading requests:", err);
            setError("Erreur lors du chargement des demandes: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Load services for filter
    const loadServices = async () => {
        try {
            const response = await listServices({ per_page: 100 });
            setServices(response.data || []);
        } catch (err) {
            console.error("Error loading services:", err);
        }
    };

    // Toggle active status
    const handleToggleActive = async (requestId) => {
        try {
            await toggleRequestActive(requestId);
            await loadRequests(currentPage);
        } catch (err) {
            alert("Erreur lors du changement de statut");
            console.error(err);
        }
    };

    // Handle filter change
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Apply filters
    const handleApplyFilters = () => {
        setCurrentPage(1);
        loadRequests(1);
    };

    // Reset filters
    const handleResetFilters = () => {
        const cleared = { ...EMPTY_REQUEST_FILTERS };
        setFilters(cleared);
        filtersRef.current = cleared;
        setCurrentPage(1);
        loadRequests(1, cleared);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    useEffect(() => {
        loadServices();
    }, []);

    useEffect(() => {
        setFilters((prev) => {
            const next = applySearchToFilters(prev, location.search);
            loadRequests(1, next);
            return next;
        });
    }, [location.search]);

    return (
        <div className="requests-management">
            {/* Header */}
            <div className="requests-header">
                <div className="header-left">
                    <h2>Gestion des Demandes</h2>
                    <p className="requests-count">
                        {pagination.total ? `${pagination.total} demande(s) trouvée(s)` : ''}
                        {isResponsableAgencyView ? (
                            <span className="requests-scope-hint">
                                Affichage limité aux demandes dont le service appartient à une agence dont vous êtes
                                responsable (même périmètre que le tableau de bord).
                            </span>
                        ) : null}
                        {isAgentAgencyView ? (
                            <span className="requests-scope-hint">
                                Affichage limité aux demandes des services rattachés à votre agence (agent), comme sur le
                                tableau de bord.
                            </span>
                        ) : null}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="requests-filters">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Statut</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">Tous</option>
                            {Object.keys(STATUS_LABELS).map(status => (
                                <option key={status} value={status}>
                                    {STATUS_LABELS[status].label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Service</label>
                        <select name="service_id" value={filters.service_id} onChange={handleFilterChange}>
                            <option value="">Tous</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Actif</label>
                        <select name="is_active" value={filters.is_active} onChange={handleFilterChange}>
                            <option value="">Tous</option>
                            <option value="1">Actif</option>
                            <option value="0">Inactif</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Vue</label>
                        <select name="is_viewed" value={filters.is_viewed} onChange={handleFilterChange}>
                            <option value="">Toutes</option>
                            <option value="1">Oui (déjà consultée)</option>
                            <option value="0">Non (pas encore consultée)</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Date début</label>
                        <input
                            type="date"
                            name="date_from"
                            value={filters.date_from}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Date fin</label>
                        <input
                            type="date"
                            name="date_to"
                            value={filters.date_to}
                            onChange={handleFilterChange}
                        />
                    </div>
                </div>

                <div className="filters-row">
                    <div className="filter-group search-group">
                        <label>Recherche</label>
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Référence ou nom du service…"
                        />
                    </div>

                    <div className="filter-actions">
                        <button type="button" className="btn-apply" onClick={handleApplyFilters}>
                            Appliquer
                        </button>
                        <button type="button" className="btn-reset" onClick={handleResetFilters}>
                            Réinitialiser
                        </button>
                    </div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Chargement des demandes...</p>
                </div>
            ) : (
                <>
                    {/* Table */}
                    <div className="requests-table-container">
                        <table className="requests-table">
                            <thead>
                                <tr>
                                    <th>Référence</th>
                                    <th>Client</th>
                                    <th>Service</th>
                                    <th>Agence</th>
                                    <th>Statut</th>
                                    <th>Agent assigné</th>
                                    <th>Date création</th>
                                    <th>Vue</th>
                                    <th>Actif</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr className="requests-table__empty-row">
                                        <td colSpan="10" className="no-data">
                                            Aucune demande trouvée
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map(request => (
                                        <tr key={request.id} className="requests-table__data-row">
                                            <td data-label="Référence">
                                                <Link
                                                    to={`/admin/requests/${request.id}`}
                                                    className="reference-link"
                                                >
                                                    {request.reference}
                                                </Link>
                                            </td>
                                            <td data-label="Client">
                                                <div className="client-cell">
                                                    <div className="client-name">
                                                        {request.client_name != null &&
                                                        String(request.client_name).trim() !== ""
                                                            ? request.client_name
                                                            : "—"}
                                                    </div>
                                                    {request.client_email != null &&
                                                    String(request.client_email).trim() !== "" ? (
                                                        <div className="client-email">{request.client_email}</div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td data-label="Service">
                                                {request.service_name != null &&
                                                String(request.service_name).trim() !== ""
                                                    ? request.service_name
                                                    : "—"}
                                            </td>
                                            <td data-label="Agence">
                                                {request.agency_name != null &&
                                                String(request.agency_name).trim() !== ""
                                                    ? request.agency_name
                                                    : "—"}
                                            </td>
                                            <td data-label="Statut">
                                                <span className={`status-badge ${STATUS_LABELS[request.current_status]?.class || ''}`}>
                                                    {STATUS_LABELS[request.current_status]?.label || request.current_status}
                                                </span>
                                            </td>
                                            <td data-label="Agent assigné">{request.assigned_agent_name || '—'}</td>
                                            <td className="date-cell" data-label="Création">
                                                {formatDate(request.created_at)}
                                            </td>
                                            <td data-label="Vue">
                                                {request.is_viewed ? (
                                                    <span className="viewed-badge">✓</span>
                                                ) : (
                                                    <span className="not-viewed-badge">—</span>
                                                )}
                                            </td>
                                            <td data-label="Actif">
                                                <button
                                                    type="button"
                                                    className={`active-toggle ${request.is_active ? 'active' : 'inactive'}`}
                                                    onClick={() => handleToggleActive(request.id)}
                                                    title="Cliquer pour changer"
                                                >
                                                    {request.is_active ? '✓' : '✗'}
                                                </button>
                                            </td>
                                            <td data-label="Actions">
                                                <div className="action-buttons">
                                                    <Link
                                                        to={`/admin/requests/${request.id}`}
                                                        className="btn-view"
                                                        title="Voir détails"
                                                    >
                                                        👁 Voir
                                                    </Link>
                                                    <Link
                                                        to={`/admin/requests/${request.id}/edit`}
                                                        className="btn-edit-link"
                                                        title="Modifier"
                                                    >
                                                        ✏️ Modifier
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="pagination">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => loadRequests(currentPage - 1)}
                            >
                                Précédent
                            </button>

                            <span className="pagination-info">
                                Page {currentPage} sur {pagination.last_page}
                            </span>

                            <button
                                type="button"
                                disabled={currentPage === pagination.last_page}
                                onClick={() => loadRequests(currentPage + 1)}
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
