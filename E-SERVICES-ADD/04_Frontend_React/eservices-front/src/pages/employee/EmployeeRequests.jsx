import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { listRequests, takeRequest } from "../../api/employeeApi";
import "../admin/RequestsManagement.css";

const STATUS_LABELS = {
  DRAFT: { label: "Brouillon", class: "draft" },
  SUBMITTED: { label: "Soumise", class: "submitted" },
  IN_REVIEW: { label: "En révision", class: "in-review" },
  NEEDS_INFO: { label: "Info requise", class: "needs-info" },
  APPROVED: { label: "Approuvée", class: "approved" },
  REJECTED: { label: "Rejetée", class: "rejected" },
  CLOSED: { label: "Fermée", class: "closed" },
};

export default function EmployeeRequests() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    assigned: "",
    search: "",
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const loadRequests = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        per_page: 15,
        ...filters,
      };

      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === null) delete params[k];
      });

      const res = await listRequests(params);
      setRequests(res?.data || []);
      setPagination({
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      });
    } catch (e) {
      setError("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const handleTake = async (requestId) => {
    try {
      await takeRequest(requestId);
      await loadRequests(pagination.current_page);
    } catch (e) {
      alert("Erreur lors de la prise en charge");
    }
  };

  if (loading) {
    return (
      <div className="requests-management">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) return <div style={{ color: "crimson", padding: 20 }}>{error}</div>;

  const statusKeys = Object.keys(STATUS_LABELS);

  return (
    <div className="requests-management">
      <div className="requests-header">
        <div className="header-left">
          <h2>Demandes</h2>
          <p className="requests-count">
            {pagination.total ? `${pagination.total} demande(s)` : ""}
          </p>
        </div>
      </div>

      <div className="requests-filters">
        <div className="filter-group">
          <label>Statut</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="">Tous</option>
            {statusKeys.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s].label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Assignation</label>
          <select
            value={filters.assigned}
            onChange={(e) => setFilters((p) => ({ ...p, assigned: e.target.value }))}
          >
            <option value="">Tous</option>
            <option value="assigned">Assignées</option>
            <option value="unassigned">Non assignées</option>
          </select>
        </div>

        <div className="filter-group search-box-full">
          <label>Recherche</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Référence ou client..."
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn-submit-comment" type="button" onClick={() => loadRequests(1)}>
            Appliquer
          </button>
          <button
            className="btn-cancel"
            type="button"
            onClick={() => {
              setFilters({ status: "", assigned: "", search: "" });
              loadRequests(1);
            }}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="requests-table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Client</th>
              <th>Service</th>
              <th>Agence</th>
              <th>Statut</th>
              <th>Assigné</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  Aucune demande trouvée
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const canTake = !req.assigned_to || req.assigned_to !== user?.id;
                return (
                  <tr key={req.id}>
                    <td>
                      <Link className="request-reference-link" to={`/employee/requests/${req.id}`}>
                        {req.reference}
                      </Link>
                    </td>
                    <td>
                        {req.client_name != null && String(req.client_name).trim() !== ""
                            ? req.client_name
                            : "—"}
                    </td>
                    <td>
                      {req.service_name != null && String(req.service_name).trim() !== ""
                        ? req.service_name
                        : "—"}
                    </td>
                    <td>
                      {req.agency_name != null && String(req.agency_name).trim() !== ""
                        ? req.agency_name
                        : "—"}
                    </td>
                    <td>
                      <span className={`status-badge ${STATUS_LABELS[req.current_status]?.class || ""}`}>
                        {STATUS_LABELS[req.current_status]?.label || req.current_status}
                      </span>
                    </td>
                    <td>{req.assigned_agent_name || "—"}</td>
                    <td>{formatDate(req.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <Link className="btn-view" to={`/employee/requests/${req.id}`}>
                          👁 Voir
                        </Link>
                        {canTake && (
                          <button
                            className="btn-edit-link"
                            type="button"
                            onClick={() => handleTake(req.id)}
                            style={{ cursor: "pointer" }}
                            title="Prendre la demande"
                          >
                            Prendre
                          </button>
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

      {pagination.last_page > 1 && (
        <div className="pagination">
          <button disabled={pagination.current_page === 1} onClick={() => loadRequests(pagination.current_page - 1)}>
            Précédent
          </button>
          <span className="pagination-info">
            Page {pagination.current_page} sur {pagination.last_page}
          </span>
          <button
            disabled={pagination.current_page === pagination.last_page}
            onClick={() => loadRequests(pagination.current_page + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

