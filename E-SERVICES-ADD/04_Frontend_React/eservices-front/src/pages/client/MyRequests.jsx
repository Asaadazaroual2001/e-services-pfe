import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listMyRequests, listServices } from "../../api/clientApi";
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

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    service_id: "",
    search: "",
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
  });

  const loadServices = async () => {
    const res = await listServices({ per_page: 100 });
    const items = res?.data ? res.data : res;
    setServices(items || []);
  };

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

      const res = await listMyRequests(params);
      setRequests(res?.data || []);
      setPagination({
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
        per_page: res.per_page,
      });
    } catch (e) {
      setError("Erreur lors du chargement de vos demandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadServices();
      await loadRequests(1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusKeys = useMemo(() => Object.keys(STATUS_LABELS), []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const handleApplyFilters = () => loadRequests(1);

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

  if (error) {
    return <div style={{ color: "crimson", padding: 20 }}>{error}</div>;
  }

  return (
    <div className="requests-management">
      <div className="requests-header">
        <div className="header-left">
          <h2>Mes demandes & suivi</h2>
          <p className="requests-count">
            {pagination.total ? `${pagination.total} demande(s)` : ""}
          </p>
          <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 0 0", maxWidth: 560 }}>
            Ouvrez une demande pour voir l’historique des étapes, les pièces jointes et les messages. Les
            mises à jour importantes sont aussi envoyées par e-mail.
          </p>
        </div>
      </div>

      <div className="requests-filters">
        <div className="filter-group">
          <label>Statut</label>
          <select
            name="status"
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
          <label>Service</label>
          <select
            name="service_id"
            value={filters.service_id}
            onChange={(e) => setFilters((p) => ({ ...p, service_id: e.target.value }))}
          >
            <option value="">Tous</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ gridColumn: "1 / -1" }}>
          <label>Recherche</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Référence ou service..."
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-submit-comment" onClick={handleApplyFilters} type="button">
            Appliquer
          </button>
          <button
            className="btn-cancel"
            onClick={() => {
              setFilters({ status: "", service_id: "", search: "" });
              loadRequests(1);
            }}
            type="button"
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
              <th>Service</th>
              <th>Agence</th>
              <th>Statut</th>
              <th>Création</th>
              <th>Dernière maj</th>
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
              requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <Link className="request-reference-link" to={`/client/requests/${req.id}`}>
                      {req.reference}
                    </Link>
                  </td>
                  <td>{req.service_name}</td>
                  <td>{req.agency_name || "—"}</td>
                  <td>
                    <span className={`status-badge ${STATUS_LABELS[req.current_status]?.class || ""}`}>
                      {STATUS_LABELS[req.current_status]?.label || req.current_status}
                    </span>
                  </td>
                  <td>{formatDate(req.created_at)}</td>
                  <td>{formatDate(req.updated_at)}</td>
                  <td>
                    <Link className="btn-view" to={`/client/requests/${req.id}`}>
                      Suivi détaillé
                    </Link>
                  </td>
                </tr>
              ))
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

