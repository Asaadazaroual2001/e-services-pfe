import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { listServices, deleteService, toggleServiceActive } from "../../api/services";
import { getAgencies } from "../../api/adminApi";
import "./ServicesManagement.css";

/** Rafraîchissement silencieux de la liste (publication / échéances / portail). */
const SERVICES_AUTO_REFRESH_MS = 30_000;

function publicDemandUrl(serviceId) {
    return `${window.location.origin}/demande/${serviceId}`;
}

/** Même règles que le backend : acceptsNewRequestsFromClients / openForClientRequests */
function clientPortalOpen(service) {
    if (!service?.is_active) return false;
    const now = Date.now();
    if (service.published_at && new Date(service.published_at).getTime() > now) return false;
    if (service.request_deadline_at && new Date(service.request_deadline_at).getTime() < now) return false;
    return true;
}

function clientPortalStatus(service) {
    if (!service?.is_active) {
        return {
            label: "Inactif",
            className: "portal-manual",
            title:
                "Service désactivé dans la configuration (le portail client est fermé). Cliquez pour réactiver la fiche.",
        };
    }
    const now = Date.now();
    if (service.published_at && new Date(service.published_at).getTime() > now) {
        return {
            label: "Non publié",
            className: "portal-not-published",
            title:
                "Avant la date de publication, le formulaire reste fermé côté client. Cliquez pour désactiver la fiche si besoin.",
        };
    }
    if (service.request_deadline_at && new Date(service.request_deadline_at).getTime() < now) {
        return {
            label: "Clôturé",
            className: "portal-deadline",
            title:
                "Après la date limite, le portail n’accepte plus de demandes. Cliquez pour désactiver la fiche si besoin.",
        };
    }
    return {
        label: "Ouvert",
        className: "portal-open",
        title: "Le formulaire est accessible sur le portail client. Cliquez pour désactiver la fiche.",
    };
}

function publicationCell(service) {
    if (!service.published_at) {
        return <span className="service-publication-immediate">Immédiat</span>;
    }
    const t = new Date(service.published_at);
    const pending = t.getTime() > Date.now();
    return (
        <span
            className={pending ? "service-publication-pending" : "service-publication-ok"}
            title={service.published_at}
        >
            {t.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            {pending ? " · programmé" : ""}
        </span>
    );
}

function deadlineCell(service) {
    if (!service.request_deadline_at) {
        return <span className="service-deadline-none">Sans limite</span>;
    }
    const end = new Date(service.request_deadline_at);
    const expired = end.getTime() < Date.now();
    return (
        <span className={expired ? "service-deadline-expired" : "service-deadline-ok"} title={service.request_deadline_at}>
            {end.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            {expired ? " · expiré" : ""}
        </span>
    );
}

export default function ServicesManagement() {
    const { hasRole, hasAnyRole } = useAuth();
    const isAdmin = hasRole("admin");
    const canManageServices = hasAnyRole(["admin", "responsable"]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copiedId, setCopiedId] = useState(null);
    
    // États pour les filtres et recherche
    const [searchTerm, setSearchTerm] = useState("");
    const [filterActive, setFilterActive] = useState("");
    const [filterAgency, setFilterAgency] = useState("");
    const [agencies, setAgencies] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        if (!isAdmin) return;
        getAgencies({ active_only: 1 })
            .then((data) => setAgencies(Array.isArray(data) ? data : []))
            .catch(() => setAgencies([]));
    }, [isAdmin]);

    // Charger les services (silent: pas de spinner ni reset d’erreur — pour auto-refresh)
    const loadServices = useCallback(
        async (page = 1, opts = {}) => {
            const silent = opts.silent === true;
            try {
                if (!silent) {
                    setLoading(true);
                    setError("");
                }
                const params = {
                    page,
                    per_page: 10,
                    search: searchTerm,
                };
                if (isAdmin && filterAgency) {
                    params.agency_id = filterAgency;
                }

                if (filterActive === "portal") {
                    params.open_for_requests = 1;
                } else if (filterActive !== "") {
                    params.is_active = filterActive;
                }

                const response = await listServices(params);

                setServices(response.data || []);
                setPagination({
                    current_page: response.current_page,
                    last_page: response.last_page,
                    total: response.total,
                    per_page: response.per_page,
                });
                setCurrentPage(page);
            } catch (err) {
                console.error("Error loading services:", err);

                if (err.response?.status === 401) {
                    setError("Non authentifié. Veuillez vous reconnecter.");
                } else if (!silent) {
                    if (err.message === "Network Error") {
                        setError(
                            "Impossible de se connecter au serveur. Vérifiez que Laravel tourne sur http://localhost:8000"
                        );
                    } else if (err.response?.status === 403) {
                        setError("Accès refusé. Vous n'avez pas les permissions d'administrateur.");
                    } else {
                        setError(
                            "Erreur lors du chargement des services: " +
                                (err.response?.data?.message || err.message)
                        );
                    }
                }
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        [searchTerm, filterActive, filterAgency, isAdmin]
    );

    // Supprimer un service
    const handleDeleteService = async (serviceId, serviceName) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le service "${serviceName}" ?`)) {
            return;
        }

        try {
            await deleteService(serviceId);
            await loadServices(currentPage);
        } catch (err) {
            alert("Erreur lors de la suppression du service");
            console.error(err);
        }
    };

    // Basculer le statut actif/inactif
    const handleToggleActive = async (serviceId) => {
        try {
            await toggleServiceActive(serviceId);
            await loadServices(currentPage);
        } catch (err) {
            alert("Erreur lors du changement de statut");
            console.error(err);
        }
    };

    // Gérer la recherche
    const handleSearch = () => {
        setCurrentPage(1);
        loadServices(1);
    };

    // Reset des filtres
    const handleResetFilters = () => {
        setSearchTerm("");
        setFilterActive("");
        setFilterAgency("");
        setCurrentPage(1);
        loadServices(1);
    };

    const copyPublicLink = async (serviceId) => {
        const url = publicDemandUrl(serviceId);
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(serviceId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            window.prompt("Copiez ce lien :", url);
        }
    };

    // Effet pour recherche automatique quand les filtres changent
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            setCurrentPage(1);
            loadServices(1);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, filterActive, filterAgency, isAdmin, loadServices]);

    // Actualisation automatique (statuts portail / dates) tant que la page est ouverte
    useEffect(() => {
        if (!canManageServices) return;

        const refresh = () => {
            if (document.visibilityState !== "visible") return;
            loadServices(currentPage, { silent: true });
        };

        const intervalId = setInterval(refresh, SERVICES_AUTO_REFRESH_MS);
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                loadServices(currentPage, { silent: true });
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [canManageServices, currentPage, loadServices]);

    return (
        <div className="services-management">
            {/* Header avec bouton d'ajout */}
            <div className="services-header">
                <div className="header-left">
                    <h2>Gestion des Services</h2>
                    <p className="services-count">
                        {pagination.total ? `${pagination.total} service(s) trouvé(s)` : ''}
                    </p>
                </div>
                {canManageServices ? (
                    <Link to="/admin/services/new" className="btn-add-service">
                        <span className="btn-icon">+</span>
                        Ajouter un service
                    </Link>
                ) : null}
            </div>

            {canManageServices ? (
                <div className="services-config-hint">
                    <strong>Modèles de demande :</strong> chaque service peut avoir son propre formulaire
                    (texte, fichiers, listes, dates…). Utilisez le bouton « Champs » sur une ligne du tableau
                    pour le configurer — le portail client affichera dynamiquement ces champs.
                </div>
            ) : null}

            {/* Filtres et recherche */}
            <div className="services-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button type="button" className="search-btn" onClick={handleSearch}>
                        Rechercher
                    </button>
                </div>
                
                <div className="status-filter">
                    <select
                        value={filterActive}
                        onChange={(e) => setFilterActive(e.target.value)}
                    >
                        <option value="">Tous les statuts</option>
                        <option value="portal">Ouverts (portail client)</option>
                        <option value="1">Fiche activée (config.)</option>
                        <option value="0">Fiche désactivée (config.)</option>
                    </select>
                </div>

                {isAdmin ? (
                    <div className="status-filter">
                        <select
                            value={filterAgency}
                            onChange={(e) => setFilterAgency(e.target.value)}
                        >
                            <option value="">Toutes les agences</option>
                            {agencies.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                <button type="button" className="reset-btn" onClick={handleResetFilters}>
                    Réinitialiser
                </button>
            </div>

            {/* Messages d'erreur */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Chargement des services...</p>
                </div>
            ) : (
                <>
                    {/* Table des services */}
                    <div className="services-table-container">
                        <table className="services-table">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Agence</th>
                                    <th>Description</th>
                                    <th>Champs</th>
                                    <th>Publication</th>
                                    <th>Limite demandes</th>
                                    <th>Lien public (demande)</th>
                                    <th>Portail client</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.length === 0 ? (
                                    <tr className="services-table__empty-row">
                                        <td colSpan="9" className="no-data">
                                            Aucun service trouvé
                                        </td>
                                    </tr>
                                ) : (
                                    services.map((service) => {
                                        const portal = clientPortalStatus(service);
                                        return (
                                        <tr key={service.id} className="services-table__data-row">
                                            <td data-label="Nom">
                                                <div className="service-name">
                                                    <strong>{service.name}</strong>
                                                </div>
                                            </td>
                                            <td data-label="Agence">
                                                {service.agency?.name || (
                                                    <em>—</em>
                                                )}
                                            </td>
                                            <td data-label="Description">
                                                <div className="service-description">
                                                    {service.description || <em>Aucune description</em>}
                                                </div>
                                            </td>
                                            <td data-label="Champs">
                                                <span className="fields-count">
                                                    {service.fields_count || 0} champ(s)
                                                </span>
                                            </td>
                                            <td data-label="Publication">{publicationCell(service)}</td>
                                            <td data-label="Limite">{deadlineCell(service)}</td>
                                            <td data-label="Lien public">
                                                {clientPortalOpen(service) ? (
                                                    <div className="public-demand-cell">
                                                        <a
                                                            href={publicDemandUrl(service.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-public-demand"
                                                        >
                                                            Ouvrir le formulaire
                                                        </a>
                                                        <button
                                                            type="button"
                                                            className="btn-copy-public-link"
                                                            onClick={() => copyPublicLink(service.id)}
                                                        >
                                                            {copiedId === service.id ? "Copié !" : "Copier le lien"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="public-link-inactive">
                                                        {!service.is_active
                                                            ? "— (fiche désactivée)"
                                                            : service.published_at &&
                                                                new Date(service.published_at).getTime() > Date.now()
                                                              ? "— (pas encore publié)"
                                                              : service.request_deadline_at &&
                                                                  new Date(service.request_deadline_at).getTime() <
                                                                      Date.now()
                                                                ? "— (échéance dépassée)"
                                                                : "—"}
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="Portail client">
                                                <button
                                                    type="button"
                                                    className={`status-badge status-badge--portal ${portal.className}`}
                                                    onClick={() => handleToggleActive(service.id)}
                                                    title={portal.title}
                                                >
                                                    {portal.label}
                                                </button>
                                            </td>
                                            <td data-label="Actions">
                                                <div className="action-buttons">
                                                    <Link
                                                        to={`/admin/services/${service.id}/fields`}
                                                        className="btn-fields"
                                                        title="Gérer les champs"
                                                    >
                                                        Champs
                                                    </Link>
                                                    <Link
                                                        to={`/admin/services/${service.id}/edit`}
                                                        className="btn-edit"
                                                        title="Modifier"
                                                    >
                                                        Modifier
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn-delete"
                                                        onClick={() => handleDeleteService(service.id, service.name)}
                                                        title="Supprimer"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })
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
                                onClick={() => loadServices(currentPage - 1)}
                            >
                                Précédent
                            </button>
                            
                            <span className="pagination-info">
                                Page {currentPage} sur {pagination.last_page}
                            </span>
                            
                            <button
                                type="button"
                                disabled={currentPage === pagination.last_page}
                                onClick={() => loadServices(currentPage + 1)}
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
