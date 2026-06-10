import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getService,
  createRequest,
  updateRequest,
  submitRequest as submitClientRequest,
  uploadDocument,
  addComment,
  createGuestRequest,
  updateGuestRequest,
  submitGuestRequest,
  uploadGuestDocument,
  addGuestComment,
} from "../../api/clientApi";
import { useAuth } from "../../auth/AuthContext";
import CompanyLogo from "../../components/brand/CompanyLogo";

function guestDraftKey(sid) {
  return `eservices_public_draft_${sid}`;
}

/** Explicit colors so inputs stay readable (e.g. public page outside client layout / dark globals). */
const fieldControlStyle = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  caretColor: "#0f172a",
  WebkitTextFillColor: "#0f172a",
};

export default function CreateRequest({ publicGuestMode = false }) {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  const [service, setService] = useState(null);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [initialComment, setInitialComment] = useState("");

  const [request, setRequest] = useState(null); // saved draft (optional)
  const [guestToken, setGuestToken] = useState(null);
  const [submittedInfo, setSubmittedInfo] = useState(null); // { reference } for public flow
  const [draftNotice, setDraftNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(null);
  /** Erreur chargement GET /api/services/:id (message API : pas encore publié, échéance, etc.) */
  const [serviceLoadError, setServiceLoadError] = useState(null);

  useEffect(() => {
    if (!publicGuestMode) {
      refresh().catch(() => {});
    }
    // refresh is stable enough for UX; omit from deps to avoid re-running every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh identity changes each AuthProvider render
  }, [publicGuestMode]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setServiceLoadError(null);
        setErrors(null);
        const res = await getService(serviceId);
        setService(res.data);

        // Initialize values so inputs are controlled.
        const init = {};
        const initFiles = {};
        (res.data?.fields || []).forEach((f) => {
          init[f.id] = f.type === "select" ? "" : "";
          if (f.type === "file") {
            initFiles[f.id] = null;
          }
        });
        setValues(init);
        setFiles(initFiles);

        if (publicGuestMode) {
          try {
            const raw = sessionStorage.getItem(guestDraftKey(serviceId));
            if (raw) {
              const o = JSON.parse(raw);
              if (o?.id && o?.token && Number(o.serviceId) === Number(serviceId)) {
                setRequest({ id: o.id });
                setGuestToken(o.token);
              }
            }
          } catch (_) {
            /* ignore */
          }
        }
      } catch (e) {
        const data = e.response?.data;
        const msg =
          typeof data?.message === "string"
            ? data.message
            : e.response?.status === 404
              ? "Ce service n’existe pas ou le lien n’est plus valide."
              : "Impossible de charger ce formulaire. Vérifiez votre connexion ou réessayez plus tard.";
        setServiceLoadError({ message: msg, code: data?.code });
        setService(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId, publicGuestMode]);

  const fields = useMemo(() => service?.fields || [], [service]);

  const computeMissingRequired = () => {
    const missing = [];

    const requiredFields = fields.filter((f) => f.required);
    requiredFields.forEach((sf) => {
      if (sf.type === "file") {
        const file = files[sf.id];
        if (!file) missing.push(sf.label);
        return;
      }

      const v = values[sf.id];
      if (sf.type === "select") {
        if (!v) {
          missing.push(sf.label);
          return;
        }
        if (Array.isArray(sf.options_json) && sf.options_json.length > 0 && !sf.options_json.includes(v)) {
          missing.push(sf.label);
        }
        return;
      }

      if (sf.type === "number") {
        if (v === null || v === undefined || String(v).trim() === "") {
          missing.push(sf.label);
          return;
        }
        const n = Number(v);
        if (Number.isNaN(n)) missing.push(sf.label);
        return;
      }

      if (sf.type === "date") {
        const s = v ? String(v).trim() : "";
        if (!s) {
          missing.push(sf.label);
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          missing.push(sf.label);
          return;
        }
        const dt = new Date(s);
        if (Number.isNaN(dt.getTime())) missing.push(sf.label);
        return;
      }

      if (v === null || v === undefined || String(v).trim() === "") missing.push(sf.label);
    });

    return missing;
  };

  const buildFieldValues = () => {
    return fields.map((field) => {
      let value = null;
      if (field.type !== "file") {
        value = values[field.id];
        if (value === "" || value === undefined) value = null;
      }
      return {
        service_field_id: field.id,
        value,
      };
    });
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    setErrors(null);
    setDraftNotice("");
    try {
      const fieldValues = buildFieldValues();

      if (publicGuestMode) {
        let savedReq;
        let token = guestToken;

        if (!request || !token) {
          const saved = await createGuestRequest({
            service_id: Number(serviceId),
            field_values: fieldValues,
          });
          token = saved.public_submission_token;
          savedReq = saved.data;
          setGuestToken(token);
          setRequest(savedReq);
          sessionStorage.setItem(
            guestDraftKey(serviceId),
            JSON.stringify({ id: savedReq.id, token, serviceId: Number(serviceId) })
          );
        } else {
          const saved = await updateGuestRequest(request.id, token, { field_values: fieldValues });
          savedReq = saved.data;
          setRequest(savedReq);
        }

        const selectedFiles = fields
          .filter((f) => f.type === "file")
          .map((f) => files[f.id])
          .filter(Boolean);
        for (const file of selectedFiles) {
          await uploadGuestDocument(savedReq.id, token, file);
        }

        setDraftNotice(
          "Brouillon enregistré. Revenez sur ce lien plus tard (même navigateur) pour continuer votre demande."
        );
        return;
      }

      const payload = {
        service_id: Number(serviceId),
        field_values: fieldValues,
      };

      let saved;
      if (!request) {
        saved = await createRequest(payload);
      } else {
        saved = await updateRequest(request.id, payload);
      }

      const savedReq = saved.data;
      setRequest(savedReq);

      const selectedFiles = fields
        .filter((f) => f.type === "file")
        .map((f) => files[f.id])
        .filter(Boolean);
      for (const file of selectedFiles) {
        await uploadDocument(savedReq.id, file);
      }

      navigate(`/client/requests/${savedReq.id}`);
    } catch (err) {
      setErrors(err.response?.data?.errors || err.response?.data || { general: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors(null);
    try {
      const missing = computeMissingRequired();
      if (missing.length > 0) {
        setErrors({
          general: "Veuillez compléter les champs requis avant la soumission.",
          required_missing: missing,
        });
        setSubmitting(false);
        return;
      }

      if (!publicGuestMode && user && !String(user?.cin || "").trim()) {
        setErrors({
          general: "Votre CIN est obligatoire. Complétez Mon profil avant de soumettre.",
        });
        setSubmitting(false);
        navigate("/client/profile");
        return;
      }

      const fieldValues = buildFieldValues();

      if (publicGuestMode) {
        let savedReq;
        let token = guestToken;

        if (!request || !token) {
          const saved = await createGuestRequest({
            service_id: Number(serviceId),
            field_values: fieldValues,
          });
          token = saved.public_submission_token;
          savedReq = saved.data;
          setGuestToken(token);
          setRequest(savedReq);
          sessionStorage.setItem(
            guestDraftKey(serviceId),
            JSON.stringify({ id: savedReq.id, token, serviceId: Number(serviceId) })
          );
        } else {
          const saved = await updateGuestRequest(request.id, token, { field_values: fieldValues });
          savedReq = saved.data;
        }

        const selectedFiles = fields
          .filter((f) => f.type === "file")
          .map((f) => files[f.id])
          .filter(Boolean);
        for (const file of selectedFiles) {
          await uploadGuestDocument(savedReq.id, token, file);
        }

        const submittedRes = await submitGuestRequest(savedReq.id, token, {
          field_values: fieldValues,
        });
        setRequest(submittedRes.data);

        if (initialComment.trim()) {
          await addGuestComment(savedReq.id, token, initialComment.trim());
        }

        sessionStorage.removeItem(guestDraftKey(serviceId));
        setSubmittedInfo({ reference: submittedRes.data?.reference || savedReq.reference });
        return;
      }

      const payload = {
        service_id: Number(serviceId),
        field_values: fieldValues,
      };

      let saved;
      if (!request) {
        saved = await createRequest(payload);
      } else {
        saved = await updateRequest(request.id, payload);
      }

      const savedReq = saved.data;
      setRequest(savedReq);

      const selectedFiles = fields
        .filter((f) => f.type === "file")
        .map((f) => files[f.id])
        .filter(Boolean);
      for (const file of selectedFiles) {
        await uploadDocument(savedReq.id, file);
      }

      const submittedRes = await submitClientRequest(savedReq.id, { field_values: fieldValues });
      setRequest(submittedRes.data);

      if (initialComment.trim()) {
        await addComment(savedReq.id, initialComment.trim());
      }

      navigate(`/client/requests/${savedReq.id}`);
    } catch (err) {
      if (err.response?.data?.requires_profile) {
        navigate("/client/profile");
        setSubmitting(false);
        return;
      }
      setErrors(err.response?.data?.errors || err.response?.data || { general: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const profileIncomplete = !publicGuestMode && !!user && !String(user?.cin || "").trim();

  if (loading) return <div style={{ padding: 20 }}>Chargement...</div>;

  if (serviceLoadError) {
    return (
      <div style={{ maxWidth: 520, margin: "48px auto", padding: 24, color: "#0f172a" }}>
        <p style={{ margin: "0 0 16px", lineHeight: 1.55, color: "#b45309", fontSize: 16 }}>
          {serviceLoadError.message}
        </p>
        <button
          type="button"
          onClick={() => navigate(publicGuestMode ? "/" : "/client/services")}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Retour
        </button>
      </div>
    );
  }

  if (publicGuestMode && submittedInfo) {
    return (
      <div style={{ maxWidth: 640, margin: "48px auto", padding: 24, textAlign: "center" }}>
        <h2 style={{ color: "#15803d" }}>Demande envoyée</h2>
        <p style={{ color: "#334155", fontSize: 16 }}>
          Merci. Votre demande a été enregistrée sous la référence :
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{submittedInfo.reference}</p>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Conservez cette référence. Vous n&apos;avez pas besoin de compte pour avoir soumis cette
          demande.
        </p>
      </div>
    );
  }

  if (!service) {
    return (
      <div style={{ padding: 20, color: "crimson" }}>
        Impossible d’afficher ce formulaire.
        <button
          type="button"
          onClick={() => navigate(publicGuestMode ? "/" : "/client/services")}
          style={{ marginLeft: 12 }}
        >
          Retour
        </button>
      </div>
    );
  }

  const statusBar = (
    <div style={{ marginBottom: 16, color: "#64748b" }}>
      {service.description || ""}
    </div>
  );

  const detailBlock = (title, value) => {
    if (!value) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, color: "#1e293b", marginBottom: 6 }}>{title}</div>
        <div style={{ whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.5 }}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", color: "#0f172a" }}>
      {publicGuestMode ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <CompanyLogo variant="inline" alt="E-Services" />
          <div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Demande en ligne</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Aucune connexion requise</div>
          </div>
        </div>
      ) : null}
      <div style={{ marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => navigate(publicGuestMode ? "/" : "/client/services")}
          style={{ marginBottom: 12 }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0 }}>{service.name}</h2>
        {service.agency?.name ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 15, color: "#334155", fontWeight: 700 }}>
            Agence : {service.agency.name}
          </p>
        ) : null}
        {statusBar}

        {profileIncomplete ? (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
            }}
          >
            <strong>Profil incomplet :</strong> renseignez votre <strong>CIN</strong> dans{" "}
            <button
              type="button"
              onClick={() => navigate("/client/profile")}
              style={{
                background: "none",
                border: "none",
                color: "#c2410c",
                textDecoration: "underline",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Mon profil
            </button>{" "}
            avant de soumettre une demande.
          </div>
        ) : null}

        <div
          style={{
            marginTop: 12,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontWeight: 950, color: "#f97316", marginBottom: 8 }}>Informations pour le client</div>
          {detailBlock("Instructions", service.instructions)}
          {detailBlock("Procédure (étapes)", service.procedure_steps)}
          {detailBlock("Documents requis", service.required_documents)}
          {detailBlock("Critères d'éligibilité", service.eligibility_criteria)}
          {detailBlock("Délai estimé", service.estimated_duration)}

          <div style={{ marginTop: 12, color: "#64748b", fontWeight: 700 }}>
            Astuce: les champs requis doivent être remplis avant de cliquer sur “Soumettre”.
          </div>
        </div>
      </div>

      {draftNotice ? (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            color: "#065f46",
            marginBottom: 16,
          }}
        >
          {draftNotice}
        </div>
      ) : null}

      {errors && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            marginBottom: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {(() => {
            if (errors.general) return errors.general;
            if (errors.message) return errors.message;
            if (Array.isArray(errors.document) && errors.document[0]) return errors.document[0];
            if (Array.isArray(errors.file) && errors.file[0]) return errors.file[0];
            if (Array.isArray(errors.documents) && errors.documents[0]) return errors.documents[0];

            // Laravel validation returns: { errors: { field: [msg] } }
            const firstArray = Object.values(errors).find((v) => Array.isArray(v) && v.length > 0);
            if (firstArray && firstArray[0]) return firstArray[0];
            return "Vérifiez les champs requis.";
          })()}

          {Array.isArray(errors.document) && errors.document.length > 0 && (
            <div style={{ marginTop: 6 }}>{errors.document.join(", ")}</div>
          )}
          {Array.isArray(errors.file) && errors.file.length > 0 && (
            <div style={{ marginTop: 6 }}>{errors.file.join(", ")}</div>
          )}

          {Array.isArray(errors.documents) && errors.documents.length > 0 && (
            <div style={{ marginTop: 6 }}>{errors.documents.join(", ")}</div>
          )}

          {Object.entries(errors)
            .filter(([k]) => !["general", "message", "success", "error", "document", "file", "required_missing", "documents"].includes(k))
            .slice(0, 5)
            .map(([k, v]) => (
              <div key={k} style={{ marginTop: 6 }}>
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </div>
            ))}

          {errors.error && (
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
              {errors.error}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {errors?.required_missing?.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Champs requis manquants</div>
            {errors.required_missing.map((x) => (
              <div key={x}>- {x}</div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {fields.map((field) => (
            <div key={field.id} style={{ display: "grid", gap: 6 }}>
              <label style={{ fontWeight: 800, color: "#1e293b" }}>
                {field.label}{" "}
                {field.required ? (
                  <span style={{ color: "#ef4444" }}>*</span>
                ) : (
                  <span style={{ color: "#94a3b8" }}> (optionnel)</span>
                )}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  value={values[field.id] || ""}
                  onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
                  rows={4}
                  placeholder={field.placeholder || ""}
                  style={fieldControlStyle}
                />
              ) : field.type === "select" ? (
                <select
                  value={values[field.id] || ""}
                  onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
                  style={fieldControlStyle}
                >
                  <option value="">{field.placeholder || "-- Sélectionner --"}</option>
                  {(field.options_json || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "file" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file =
                        e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                      setFiles((p) => ({ ...p, [field.id]: file }));
                    }}
                    style={fieldControlStyle}
                  />
                  {files[field.id] ? (
                    <div style={{ color: "#334155", fontWeight: 700, fontSize: 12 }}>
                      Fichier sélectionné: {files[field.id].name}
                    </div>
                  ) : null}
                </div>
              ) : (
                <input
                  type={
                    field.type === "number"
                      ? "number"
                      : field.type === "date"
                        ? "date"
                        : field.type === "email"
                          ? "email"
                          : "text"
                  }
                  value={values[field.id] || ""}
                  onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
                  placeholder={field.placeholder || ""}
                  style={fieldControlStyle}
                />
              )}

              {field.description ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                  {field.description}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 950, color: "#1e293b", marginBottom: 8 }}>Commentaire initial</div>
          <textarea
            value={initialComment}
            onChange={(e) => setInitialComment(e.target.value)}
            rows={4}
            placeholder="Ex: Je demande le traitement de ma demande au plus vite..."
            style={{ ...fieldControlStyle, minHeight: 100 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: "white",
              color: "#475569",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Enregistrer en brouillon
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#3b82f6",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Soumettre
          </button>
        </div>
      </form>
    </div>
  );
}

