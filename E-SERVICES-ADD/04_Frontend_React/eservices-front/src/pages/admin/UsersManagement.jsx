import React, { useState, useEffect } from "react";
import { getClientsDirectory, deleteUser, getRoles } from "../../api/adminApi";
import AddUserModal from "../../components/admin/AddUserModal";
import EditUserModal from "../../components/admin/EditUserModal";
import "./UsersManagement.css";

export default function UsersManagement() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // États pour les modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    // États pour les filtres et recherche
    const [searchTerm, setSearchTerm] = useState("");
    /** "" = tous | account = inscrits | request_only = sans compte (demande publique) */
    const [sourceFilter, setSourceFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({});

    // Charger l’annuaire clients (comptes + contacts issus de demandes publiques)
    const loadUsers = async (page = 1) => {
        try {
            setLoading(true);
            setError(""); // Reset error
            const params = {
                page,
                per_page: 10,
                search: searchTerm,
                ...(sourceFilter ? { source: sourceFilter } : {}),
            };

            const response = await getClientsDirectory(params);
            
            // Laravel paginate retourne {data: [], current_page, last_page, etc.}
            setUsers(response.data || []);
            setPagination({
                current_page: response.current_page,
                last_page: response.last_page,
                total: response.total,
                per_page: response.per_page,
            });
            setCurrentPage(page);
        } catch (err) {
            console.error("Error loading users:", err);
            console.error("Error response:", err.response);
            
            if (err.message === "Network Error") {
                setError("Impossible de se connecter au serveur. Vérifiez que Laravel tourne sur http://localhost:8000");
            } else if (err.response?.status === 401) {
                setError("Non authentifié. Veuillez vous reconnecter.");
            } else if (err.response?.status === 403) {
                setError("Accès refusé. Vous n'avez pas les permissions d'administrateur.");
            } else {
                setError("Erreur lors du chargement des clients: " + (err.response?.data?.message || err.message));
            }
        } finally {
            setLoading(false);
        }
    };

    // Charger les rôles
    const loadRoles = async () => {
        try {
            console.log("Loading roles...");
            const rolesData = await getRoles();
            console.log("Roles loaded:", rolesData);
            setRoles(rolesData || []);
        } catch (err) {
            console.error("Erreur lors du chargement des rôles:", err);
            if (err.message === "Network Error") {
                setError("Impossible de se connecter au serveur. Vérifiez que Laravel tourne sur http://localhost:8000");
            }
        }
    };

    // Supprimer un compte client
    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Supprimer le compte client « ${userName} » ?`)) {
            return;
        }

        try {
            await deleteUser(userId);
            await loadUsers(currentPage);
        } catch (err) {
            alert("Erreur lors de la suppression du compte");
            console.error(err);
        }
    };

    // Ouvrir le modal d'édition
    const handleEditUser = (user) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    // Gérer la recherche
    const handleSearch = () => {
        setCurrentPage(1);
        loadUsers(1);
    };

    // Reset des filtres
    const handleResetFilters = () => {
        setSearchTerm("");
        setSourceFilter("");
        setCurrentPage(1);
        loadUsers(1);
    };

    // Effet pour charger les rôles au montage
    useEffect(() => {
        loadRoles();
    }, []);

    // Effet pour recherche automatique quand les filtres changent
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            setCurrentPage(1);
            loadUsers(1);
        }, 300); // Attendre 300ms après la dernière frappe

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, sourceFilter]);

    return (
        <div className="users-management">
            {/* Header avec bouton d'ajout */}
            <div className="users-header">
                <div className="header-left">
                    <h2>Gestion des clients</h2>
                    <p className="users-count">
                        {pagination.total
                            ? `${pagination.total} fiche(s) — inscrits et non inscrits (demandes publiques)`
                            : ""}
                    </p>
                </div>
                <button
                    type="button"
                    className="btn-add-user"
                    onClick={() => setShowAddModal(true)}
                >
                    <span className="btn-icon">+</span>
                    Ajouter un client
                </button>
            </div>

            {/* Filtres et recherche */}
            <div className="users-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Rechercher par nom, e-mail ou CIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button type="button" className="search-btn" onClick={handleSearch}>
                        Rechercher
                    </button>
                </div>

                <div className="client-source-filter">
                    <select
                        id="client-source-filter"
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        aria-label="Type d’inscription : tous, inscrits sur le site, ou non inscrits (demande publique)"
                    >
                        <option value="">Tous (inscrits + non inscrits)</option>
                        <option value="account">Inscrits — compte sur le site</option>
                        <option value="request_only">Non inscrits — demande publique uniquement</option>
                    </select>
                </div>
                
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
                    <p>Chargement des clients...</p>
                </div>
            ) : (
                <>
                    {/* Table des clients */}
                    <div className="users-table-container">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Email</th>
                                    <th>Inscription</th>
                                    <th>CIN</th>
                                    <th>Nb. demandes</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr className="users-table__empty-row">
                                        <td colSpan="7" className="no-data">
                                            Aucun client trouvé
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((row) => {
                                        const rowKey =
                                            row.source === "request_only"
                                                ? `guest:${row.email}`
                                                : `user:${row.id}`;
                                        const initial = (row.name && row.name.charAt(0)) ? row.name.charAt(0).toUpperCase() : "?";
                                        return (
                                        <tr key={rowKey} className="users-table__data-row">
                                            <td data-label="Nom">
                                                <div className="user-cell">
                                                    <div className="user-avatar">
                                                        {initial}
                                                    </div>
                                                    <span>{row.name}</span>
                                                </div>
                                            </td>
                                            <td data-label="Email">{row.email}</td>
                                            <td data-label="Inscription">
                                                {row.source === "request_only" ? (
                                                    <span
                                                        className="client-inscription-pill client-inscription-pill--guest"
                                                        title="Aucun compte : nom et e-mail issus du formulaire de la demande"
                                                    >
                                                        Non inscrit
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="client-inscription-pill client-inscription-pill--registered"
                                                        title="Compte créé sur le site (peut se connecter)"
                                                    >
                                                        Inscrit
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="CIN">
                                                {row.cin ? (
                                                    <span className="users-table__cin">{row.cin}</span>
                                                ) : (
                                                    <span className="users-table__cin-na">—</span>
                                                )}
                                            </td>
                                            <td data-label="Nb. demandes">
                                                <span className="users-table__request-count">
                                                    {typeof row.requests_count === "number" ? row.requests_count : 0}
                                                </span>
                                            </td>
                                            <td data-label="Date">
                                                {row.created_at
                                                    ? new Date(row.created_at).toLocaleDateString("fr-FR")
                                                    : "—"}
                                            </td>
                                            <td data-label="Actions">
                                                <div className="action-buttons">
                                                    {row.source === "account" && row.id != null ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn-edit"
                                                                onClick={() => handleEditUser(row)}
                                                                title="Modifier"
                                                            >
                                                                Modifier
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-delete"
                                                                onClick={() => handleDeleteUser(row.id, row.name)}
                                                                title="Supprimer"
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="users-table__no-actions">—</span>
                                                    )}
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
                                onClick={() => loadUsers(currentPage - 1)}
                            >
                                Précédent
                            </button>
                            
                            <span className="pagination-info">
                                Page {currentPage} sur {pagination.last_page}
                            </span>
                            
                            <button
                                type="button"
                                disabled={currentPage === pagination.last_page}
                                onClick={() => loadUsers(currentPage + 1)}
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            {showAddModal && (
                <AddUserModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onUserAdded={() => {
                        loadUsers(currentPage);
                        setShowAddModal(false);
                    }}
                    roles={roles}
                />
            )}
            
            {showEditModal && selectedUser && (
                <EditUserModal
                    isOpen={showEditModal}
                    user={selectedUser}
                    roles={roles}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    onUserUpdated={() => {
                        loadUsers(currentPage);
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}
        </div>
    );
}