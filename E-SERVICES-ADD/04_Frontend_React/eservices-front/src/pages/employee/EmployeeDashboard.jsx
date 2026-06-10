import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../../api/employeeApi";
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

function clientAndServiceMeta(clientName, serviceName) {
  const c = clientName != null && String(clientName).trim() !== "" ? String(clientName).trim() : "";
  const s = serviceName != null && String(serviceName).trim() !== "" ? String(serviceName).trim() : "";
  if (c && s) return `${c} • ${s}`;
  if (s) return s;
  if (c) return c;
  return "—";
}

export default function EmployeeDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getDashboard();
        setDashboard(res);
      } catch (e) {
        setError("Erreur lors du chargement du dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Chargement...</div>;
  if (error) return <div style={{ padding: 20, color: "crimson" }}>{error}</div>;

  const stats = dashboard?.stats || {};
  const recent = dashboard?.recent_requests || [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Statistiques</h2>
        <p style={{ color: "#64748b", marginTop: 8 }}>
          Aperçu des demandes par statut.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {Object.entries(STATUS_LABELS).map(([status, meta]) => (
          <div
            key={status}
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900, color: "#1e293b" }}>{meta.label}</div>
              <span className={`status-badge ${meta.class}`}>{status}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 950, color: "#f97316", marginTop: 10 }}>
              {stats[status] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>Demandes récentes</h3>
        {recent.length === 0 ? (
          <div style={{ color: "#64748b" }}>Aucune demande récente.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {recent.map((r) => (
              <Link
                key={r.id}
                to={`/employee/requests/${r.id}`}
                style={{
                  textDecoration: "none",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, color: "#1e293b" }}>{r.reference}</div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {clientAndServiceMeta(r.client_name, r.service_name)}
                  </div>
                </div>
                <span className={`status-badge ${STATUS_LABELS[r.current_status]?.class || ""}`}>
                  {STATUS_LABELS[r.current_status]?.label || r.current_status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

