import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    getUsers,
    deleteUser,
    getRoles,
    getAgencies,
    createAgency,
    updateAgency,
    deleteAgency,
} from "../../api/adminApi";
import AddUserModal from "../../components/admin/AddUserModal";
import EditUserModal from "../../components/admin/EditUserModal";
import "../../components/admin/Modal.css";
import "./UsersManagement.css";
import "./StaffAndAgenciesManagement.css";

const STAFF_ROLE_NAMES = new Set([
    "admin",
    "responsable",
    "agent",
    "reception",
    "director",
]);

function getUserRoles(user) {
    const rs = user?.roles;
    if (Array.isArray(rs) && rs.length > 0) {
        return rs.map((r) => r?.name).filter(Boolean);
    }
    const primaryRole = user?.role || "";
    return primaryRole ? [primaryRole] : [];
}

function formatRoleLabel(roleName) {
    if (!roleName) return "";
    if (roleName === "client") return "Client";
    return roleName.charAt(0).toUpperCase() + roleName.slice(1);
}

function filterResponsableCandidates(users, agencyIdForEdit) {
    return (users || []).filter((u) => {
        const names = getUserRoles(u);
        if (!names.includes("responsable")) return false;
        if (agencyIdForEdit == null) {
            return u.agency_id == null;
        }
        return (
            u.agency_id == null ||
            Number(u.agency_id) === Number(agencyIdForEdit)
        );
    });
}

const emptyAgencyForm = {
    name: "",
    code: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    description: "",
    is_active: true,
    responsable_user_id: "",
};

export default function StaffAndAgenciesManagement() {
    const [tab, setTab] = useState("agencies");

    const [agencies, setAgencies] = useState([]);
    const [agenciesLoading, setAgenciesLoading] = useState(false);
    const [agenciesError, setAgenciesError] = useState("");
    const [agencyModalOpen, setAgencyModalOpen] = useState(false);
    const [agencySaving, setAgencySaving] = useState(false);
    const [editingAgency, setEditingAgency] = useState(null);
    const [agencyForm, setAgencyForm] = useState(emptyAgencyForm);
    const [responsableOptions, setResponsableOptions] = useState([]);
    const [agencySearchTerm, setAgencySearchTerm] = useState("");
    const [agencyStatusFilter, setAgencyStatusFilter] = useState("");
    const [agencyCityFilter, setAgencyCityFilter] = useState("");
    const [agencyCityOptions, setAgencyCityOptions] = useState([]);
    const agencySearchMountRef = useRef(true);

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [filterAgencyId, setFilterAgencyId] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({});

    const staffRoles = useMemo(
        () => (roles || []).filter((r) => STAFF_ROLE_NAMES.has(r.name)),
        [roles]
    );

    const loadAgencies = async (overrides = null) => {
        try {
            setAgenciesLoading(true);
            setAgenciesError("");
            const search =
                overrides && Object.prototype.hasOwnProperty.call(
                    overrides,
                    "search"
                )
                    ? overrides.search
                    : agencySearchTerm;
            const status =
                overrides && Object.prototype.hasOwnProperty.call(
                    overrides,
                    "status"
                )
                    ? overrides.status
                    : agencyStatusFilter;
            const city =
                overrides && Object.prototype.hasOwnProperty.call(
                    overrides,
                    "city"
                )
                    ? overrides.city
                    : agencyCityFilter;

            const params = {};
            if (search && String(search).trim()) {
                params.search = String(search).trim();
            }
            if (status === "active" || status === "inactive") {
                params.status = status;
            }
            if (city && String(city).trim()) {
                params.city = String(city).trim();
            }
            const data = await getAgencies(params);
            const list = Array.isArray(data) ? data : [];
            setAgencies(list);
            setAgencyCityOptions((prev) => {
                const next = new Set(prev);
                list.forEach((a) => {
                    const c = a.city && String(a.city).trim();
                    if (c) next.add(c);
                });
                return Array.from(next).sort((a, b) =>
                    a.localeCompare(b, "fr", { sensitivity: "base" })
                );
            });
        } catch (err) {
            console.error(err);
            setAgenciesError(
                err.response?.data?.message ||
                    "Impossible de charger les agences."
            );
        } finally {
            setAgenciesLoading(false);
        }
    };

    const loadUsers = async (page = 1) => {
        try {
            setLoading(true);
            setError("");
            const params = {
                page,
                per_page: 10,
                search: searchTerm,
                role: selectedRole,
                employees_only: 1,
            };
            if (filterAgencyId) {
                params.agency_id = filterAgencyId;
            }
            const response = await getUsers(params);
            setUsers(response.data || []);
            setPagination({
                current_page: response.current_page,
                last_page: response.last_page,
                total: response.total,
                per_page: response.per_page,
            });
            setCurrentPage(page);
        } catch (err) {
            console.error(err);
            if (err.message === "Network Error") {
                setError(
                    "Impossible de se connecter au serveur. Vérifiez que l’API Laravel est disponible."
                );
            } else if (err.response?.status === 401) {
                setError("Non authentifié. Veuillez vous reconnecter.");
            } else if (err.response?.status === 403) {
                setError("Accès refusé.");
            } else {
                setError(
                    err.response?.data?.message ||
                        "Erreur lors du chargement du personnel."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const loadRoles = async () => {
        try {
            const rolesData = await getRoles();
            setRoles(rolesData || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadRoles();
        loadAgencies();
    }, []);

    useEffect(() => {
        if (tab !== "agencies") return;
        if (agencySearchMountRef.current) {
            agencySearchMountRef.current = false;
            return;
        }
        const t = setTimeout(() => loadAgencies(), 300);
        return () => clearTimeout(t);
    }, [agencySearchTerm, agencyStatusFilter, agencyCityFilter, tab]);

    useEffect(() => {
        if (tab !== "staff") return;
        const t = setTimeout(() => {
            setCurrentPage(1);
            loadUsers(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm, selectedRole, filterAgencyId, tab]);

    const loadResponsableCandidates = async (agencyIdForEdit, agencyRow = null) => {
        try {
            const res = await getUsers({ employees_only: 1, per_page: 200 });
            const list = res.data || [];
            let filtered = filterResponsableCandidates(list, agencyIdForEdit);
            if (
                agencyRow?.responsable_user_id &&
                agencyRow?.responsable &&
                !filtered.some((u) => u.id === agencyRow.responsable_user_id)
            ) {
                filtered = [
                    {
                        id: agencyRow.responsable_user_id,
                        name: agencyRow.responsable.name,
                        email: agencyRow.responsable.email,
                        agency_id: agencyRow.id,
                        roles: [{ name: "responsable" }],
                    },
                    ...filtered,
                ];
            }
            setResponsableOptions(filtered);
        } catch {
            setResponsableOptions([]);
        }
    };

    const openNewAgency = async () => {
        setEditingAgency(null);
        setAgencyForm(emptyAgencyForm);
        setAgencyModalOpen(true);
        await loadResponsableCandidates(null);
    };

    const openEditAgency = async (a) => {
        setEditingAgency(a);
        setAgencyForm({
            name: a.name || "",
            code: a.code || "",
            address: a.address || "",
            city: a.city || "",
            phone: a.phone || "",
            email: a.email || "",
            description: a.description || "",
            is_active: !!a.is_active,
            responsable_user_id:
                a.responsable_user_id != null && a.responsable_user_id !== ""
                    ? String(a.responsable_user_id)
                    : "",
        });
        setAgencyModalOpen(true);
        await loadResponsableCandidates(a.id, a);
    };

    const handleAgencyField = (e) => {
        const { name, value, type, checked } = e.target;
        setAgencyForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const submitAgency = async (e) => {
        e.preventDefault();
        if (!agencyForm.name.trim()) {
            alert("Le nom de l’agence est obligatoire.");
            return;
        }
        setAgencySaving(true);
        try {
            const payload = {
                name: agencyForm.name.trim(),
                code: agencyForm.code.trim() || null,
                address: agencyForm.address.trim() || null,
                city: agencyForm.city.trim() || null,
                phone: agencyForm.phone.trim() || null,
                email: agencyForm.email.trim() || null,
                description: agencyForm.description.trim() || null,
                is_active: !!agencyForm.is_active,
                responsable_user_id:
                    agencyForm.responsable_user_id === "" ||
                    agencyForm.responsable_user_id == null
                        ? null
                        : parseInt(agencyForm.responsable_user_id, 10),
            };
            if (editingAgency) {
                await updateAgency(editingAgency.id, payload);
            } else {
                await createAgency(payload);
            }
            setAgencyModalOpen(false);
            await loadAgencies();
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                (err.response?.data?.errors &&
                    Object.values(err.response.data.errors).flat()[0]) ||
                "Erreur lors de l’enregistrement.";
            alert(msg);
        } finally {
            setAgencySaving(false);
        }
    };

    const handleDeleteAgency = async (a) => {
        if (
            !window.confirm(
                `Supprimer l’agence « ${a.name} » ? (Impossible si employés ou services y sont liés.)`
            )
        ) {
            return;
        }
        try {
            await deleteAgency(a.id);
            await loadAgencies();
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                "Suppression impossible (agence encore utilisée ou erreur serveur).";
            alert(msg);
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (
            !window.confirm(
                `Êtes-vous sûr de vouloir supprimer l’employé « ${userName} » ?`
            )
        ) {
            return;
        }
        try {
            await deleteUser(userId);
            await loadUsers(currentPage);
        } catch (err) {
            alert("Erreur lors de la suppression.");
            console.error(err);
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        loadUsers(1);
    };

    const handleResetStaffFilters = () => {
        setSearchTerm("");
        setSelectedRole("");
        setFilterAgencyId("");
        setCurrentPage(1);
        loadUsers(1);
    };

    const handleAgencySearch = () => {
        loadAgencies();
    };

    const handleResetAgencySearch = () => {
        setAgencySearchTerm("");
        setAgencyStatusFilter("");
        setAgencyCityFilter("");
        loadAgencies({ search: "", status: "", city: "" });
    };

    const hasAgencyFilters =
        agencySearchTerm.trim() ||
        agencyStatusFilter ||
        agencyCityFilter;

    return (
        <div className="users-management staff-agencies-page">
            <div className="staff-agencies-tabs">
                <button
                    type="button"
                    className={tab === "agencies" ? "tab active" : "tab"}
                    onClick={() => setTab("agencies")}
                >
                    Agences
                </button>
                <button
                    type="button"
                    className={tab === "staff" ? "tab active" : "tab"}
                    onClick={() => setTab("staff")}
                >
                    Employés
                </button>
            </div>

            {tab === "agencies" && (
                <>
                    <div className="users-header">
                        <div className="header-left">
                            <h2>Agences</h2>
                            <p className="users-count">
                                {agencies.length} agence(s)
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-add-user"
                            onClick={openNewAgency}
                        >
                            <span className="btn-icon">+</span>
                            Nouvelle agence
                        </button>
                    </div>

                    <div className="users-filters">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Rechercher par nom, code ou ville…"
                                value={agencySearchTerm}
                                onChange={(e) =>
                                    setAgencySearchTerm(e.target.value)
                                }
                                onKeyPress={(e) =>
                                    e.key === "Enter" && handleAgencySearch()
                                }
                            />
                            <button
                                type="button"
                                className="search-btn"
                                onClick={handleAgencySearch}
                            >
                                Rechercher
                            </button>
                        </div>
                        <div className="role-filter">
                            <select
                                value={agencyStatusFilter}
                                onChange={(e) =>
                                    setAgencyStatusFilter(e.target.value)
                                }
                                aria-label="Filtrer par statut"
                            >
                                <option value="">Tous les statuts</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="role-filter">
                            <select
                                value={agencyCityFilter}
                                onChange={(e) =>
                                    setAgencyCityFilter(e.target.value)
                                }
                                aria-label="Filtrer par ville"
                            >
                                <option value="">Toutes les villes</option>
                                {agencyCityOptions.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            className="reset-btn"
                            onClick={handleResetAgencySearch}
                        >
                            Réinitialiser
                        </button>
                    </div>

                    {agenciesError && (
                        <div className="error-message">{agenciesError}</div>
                    )}
                    {agenciesLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                            <p>Chargement…</p>
                        </div>
                    ) : (
                        <div className="users-table-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Nom</th>
                                        <th>Code</th>
                                        <th>Ville</th>
                                        <th>Contact</th>
                                        <th>Employés</th>
                                        <th>Responsable</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agencies.length === 0 ? (
                                        <tr className="users-table__empty-row">
                                            <td
                                                colSpan="8"
                                                className="no-data"
                                            >
                                                {hasAgencyFilters
                                                    ? "Aucune agence ne correspond aux filtres."
                                                    : "Aucune agence. Créez-en une pour l’associer aux employés."}
                                            </td>
                                        </tr>
                                    ) : (
                                        agencies.map((a) => (
                                            <tr key={a.id} className="users-table__data-row">
                                                <td data-label="Nom">
                                                    <strong>{a.name}</strong>
                                                </td>
                                                <td data-label="Code">{a.code || "—"}</td>
                                                <td data-label="Ville">{a.city || "—"}</td>
                                                <td data-label="Contact">
                                                    <div className="agency-contact-cell">
                                                        {a.phone && (
                                                            <div>{a.phone}</div>
                                                        )}
                                                        {a.email && (
                                                            <div>{a.email}</div>
                                                        )}
                                                        {!a.phone &&
                                                            !a.email &&
                                                            "—"}
                                                    </div>
                                                </td>
                                                <td data-label="Employés">{a.users_count ?? "—"}</td>
                                                <td data-label="Responsable">
                                                    {a.responsable?.name || (
                                                        <em>—</em>
                                                    )}
                                                </td>
                                                <td data-label="Statut">
                                                    {a.is_active ? (
                                                        <span className="role-badge role-admin">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="role-badge role-client">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td data-label="Actions">
                                                    <div className="action-buttons">
                                                        <button
                                                            type="button"
                                                            className="btn-edit"
                                                            onClick={() =>
                                                                openEditAgency(
                                                                    a
                                                                )
                                                            }
                                                        >
                                                            Modifier
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-delete"
                                                            onClick={() =>
                                                                handleDeleteAgency(
                                                                    a
                                                                )
                                                            }
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {tab === "staff" && (
                <>
                    <div className="users-header">
                        <div className="header-left">
                            <h2>Employés</h2>
                            <p className="users-count">
                                {pagination.total != null
                                    ? `${pagination.total} employé(s) (hors clients)`
                                    : ""}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-add-user"
                            onClick={() => setShowAddModal(true)}
                        >
                            <span className="btn-icon">+</span>
                            Ajouter un employé
                        </button>
                    </div>

                    <div className="users-filters">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Rechercher par nom ou email…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) =>
                                    e.key === "Enter" && handleSearch()
                                }
                            />
                            <button
                                type="button"
                                className="search-btn"
                                onClick={handleSearch}
                            >
                                Rechercher
                            </button>
                        </div>
                        <div className="role-filter">
                            <select
                                value={filterAgencyId}
                                onChange={(e) =>
                                    setFilterAgencyId(e.target.value)
                                }
                            >
                                <option value="">Toutes les agences</option>
                                {agencies.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="role-filter">
                            <select
                                value={selectedRole}
                                onChange={(e) =>
                                    setSelectedRole(e.target.value)
                                }
                            >
                                <option value="">Tous les rôles</option>
                                {staffRoles.map((role) => (
                                    <option key={role.id} value={role.name}>
                                        {role.label || role.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            className="reset-btn"
                            onClick={handleResetStaffFilters}
                        >
                            Réinitialiser
                        </button>
                    </div>

                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                            <p>Chargement du personnel…</p>
                        </div>
                    ) : (
                        <>
                            <div className="users-table-container">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Nom</th>
                                            <th>Email</th>
                                            <th>Agence</th>
                                            <th>Rôles</th>
                                            <th>Création</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr className="users-table__empty-row">
                                                <td
                                                    colSpan="6"
                                                    className="no-data"
                                                >
                                                    Aucun employé ne correspond
                                                    aux filtres.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((user) => (
                                                <tr key={user.id} className="users-table__data-row">
                                                    <td data-label="Nom">
                                                        <div className="user-cell">
                                                            <div className="user-avatar">
                                                                {user.name
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                            <span>
                                                                {user.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td data-label="Email">{user.email}</td>
                                                    <td data-label="Agence">
                                                        {user.agency
                                                            ? user.agency.name
                                                            : "—"}
                                                    </td>
                                                    <td data-label="Rôles">
                                                        <div className="roles-list">
                                                            {Array.from(
                                                                new Set(
                                                                    getUserRoles(
                                                                        user
                                                                    )
                                                                )
                                                            ).map((role) => (
                                                                <span
                                                                    key={role}
                                                                    className={`role-badge role-${role}`}
                                                                >
                                                                    {formatRoleLabel(
                                                                        role
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td data-label="Créé le">
                                                        {new Date(
                                                            user.created_at
                                                        ).toLocaleDateString(
                                                            "fr-FR"
                                                        )}
                                                    </td>
                                                    <td data-label="Actions">
                                                        <div className="action-buttons">
                                                            <button
                                                                type="button"
                                                                className="btn-edit"
                                                                onClick={() =>
                                                                    handleEditUser(
                                                                        user
                                                                    )
                                                                }
                                                            >
                                                                Modifier
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-delete"
                                                                onClick={() =>
                                                                    handleDeleteUser(
                                                                        user.id,
                                                                        user.name
                                                                    )
                                                                }
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.last_page > 1 && (
                                <div className="pagination">
                                    <button
                                        type="button"
                                        disabled={currentPage === 1}
                                        onClick={() =>
                                            loadUsers(currentPage - 1)
                                        }
                                    >
                                        Précédent
                                    </button>
                                    <span className="pagination-info">
                                        Page {currentPage} sur{" "}
                                        {pagination.last_page}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={
                                            currentPage ===
                                            pagination.last_page
                                        }
                                        onClick={() =>
                                            loadUsers(currentPage + 1)
                                        }
                                    >
                                        Suivant
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {agencyModalOpen && (
                <div
                    className="modal-overlay"
                    onClick={() =>
                        !agencySaving && setAgencyModalOpen(false)
                    }
                >
                    <div
                        className="modal-content agency-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>
                                {editingAgency
                                    ? "Modifier l’agence"
                                    : "Nouvelle agence"}
                            </h3>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() =>
                                    !agencySaving && setAgencyModalOpen(false)
                                }
                            >
                                ×
                            </button>
                        </div>
                        <form
                            className="modal-form"
                            onSubmit={submitAgency}
                        >
                            <div className="form-group">
                                <label htmlFor="ag-name">Nom *</label>
                                <input
                                    id="ag-name"
                                    name="name"
                                    value={agencyForm.name}
                                    onChange={handleAgencyField}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ag-code">Code</label>
                                <input
                                    id="ag-code"
                                    name="code"
                                    value={agencyForm.code}
                                    onChange={handleAgencyField}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ag-city">Ville</label>
                                <input
                                    id="ag-city"
                                    name="city"
                                    value={agencyForm.city}
                                    onChange={handleAgencyField}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ag-address">Adresse</label>
                                <textarea
                                    id="ag-address"
                                    name="address"
                                    rows={2}
                                    value={agencyForm.address}
                                    onChange={handleAgencyField}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ag-phone">Téléphone</label>
                                <input
                                    id="ag-phone"
                                    name="phone"
                                    value={agencyForm.phone}
                                    onChange={handleAgencyField}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ag-email">Email</label>
                                <input
                                    id="ag-email"
                                    name="email"
                                    type="email"
                                    value={agencyForm.email}
                                    onChange={handleAgencyField}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ag-desc">Description</label>
                                <textarea
                                    id="ag-desc"
                                    name="description"
                                    rows={3}
                                    value={agencyForm.description}
                                    onChange={handleAgencyField}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ag-responsable">
                                    Responsable d’agence
                                </label>
                                <select
                                    id="ag-responsable"
                                    name="responsable_user_id"
                                    value={agencyForm.responsable_user_id}
                                    onChange={handleAgencyField}
                                >
                                    <option value="">— Aucun —</option>
                                    {responsableOptions.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                            {u.email ? ` (${u.email})` : ""}
                                        </option>
                                    ))}
                                </select>
                                <small className="form-help agency-modal__help">
                                    Rôle « responsable », sans autre agence ou déjà sur cette agence.
                                    Requis pour créer des services rattachés à l’agence.
                                </small>
                            </div>
                            <div className="form-group checkbox-row">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={agencyForm.is_active}
                                        onChange={handleAgencyField}
                                    />
                                    <span>Agence active</span>
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    disabled={agencySaving}
                                    onClick={() => setAgencyModalOpen(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={agencySaving}
                                >
                                    {agencySaving
                                        ? "Enregistrement…"
                                        : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddModal && (
                <AddUserModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onUserAdded={() => {
                        loadUsers(currentPage);
                        setShowAddModal(false);
                    }}
                    roles={staffRoles}
                    agencies={agencies}
                />
            )}

            {showEditModal && selectedUser && (
                <EditUserModal
                    isOpen={showEditModal}
                    user={selectedUser}
                    roles={staffRoles}
                    agencies={agencies}
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
