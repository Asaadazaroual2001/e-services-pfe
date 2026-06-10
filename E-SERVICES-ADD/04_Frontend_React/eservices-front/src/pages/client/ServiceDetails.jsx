import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getService } from "../../api/clientApi";

function Block({ title, value }) {
  if (!value) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 950, color: "#1e293b", marginBottom: 6 }}>{title}</div>
      <div style={{ whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

export default function ServiceDetails() {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getService(serviceId);
        setService(res?.data || null);
      } catch (e) {
        setError("Erreur lors du chargement des détails du service.");
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId]);

  const fields = useMemo(() => service?.fields || [], [service]);

  if (loading) return <div style={{ padding: 20 }}>Chargement...</div>;
  if (error || !service)
    return (
      <div style={{ padding: 20, color: "crimson" }}>
        {error || "Service introuvable"}
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => navigate("/client/services")}>
            ← Retour
          </button>
        </div>
      </div>
    );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => navigate("/client/services")} style={{ marginBottom: 12 }}>
          ← Retour
        </button>
        <h2 style={{ margin: 0 }}>{service.name}</h2>
        {service.description && (
          <div style={{ marginTop: 10, color: "#64748b", fontWeight: 600, lineHeight: 1.4 }}>
            {service.description}
          </div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <Block title="Instructions" value={service.instructions} />
        <Block title="Procédure (étapes)" value={service.procedure_steps} />
        <Block title="Documents requis" value={service.required_documents} />
        <Block title="Critères d'éligibilité" value={service.eligibility_criteria} />
        <Block title="Délai estimé" value={service.estimated_duration} />
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 950, color: "#1e293b", marginBottom: 10 }}>Champs de la demande</div>

        {fields.length === 0 ? (
          <div style={{ color: "#64748b" }}>Aucun champ configuré pour ce service.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {fields.map((f) => (
              <div
                key={f.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 14,
                  background: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 950, color: "#1e293b" }}>{f.label}</div>
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #cbd5e1",
                      background: "white",
                      color: "#475569",
                      fontWeight: 900,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.required ? "Requis" : "Optionnel"}
                  </div>
                </div>
                <div style={{ marginTop: 8, color: "#64748b" }}>
                  Type: <span style={{ color: "#334155", fontWeight: 700 }}>{f.type}</span>
                </div>
                {f.type === "select" && f.options_json?.length ? (
                  <div style={{ marginTop: 8, color: "#334155" }}>
                    Options: {f.options_json.join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => navigate(`/client/services/${service.id}/request`)}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "none",
            background: "#3b82f6",
            color: "white",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          Créer une demande
        </button>
      </div>
    </div>
  );
}

