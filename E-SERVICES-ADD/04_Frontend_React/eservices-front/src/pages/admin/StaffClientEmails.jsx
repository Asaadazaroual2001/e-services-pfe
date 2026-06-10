import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listStaffClientEmails, sendStaffClientEmail } from "../../api/staffEmailsApi";
import { listRequests } from "../../api/requestsAdmin";
import {
  STAFF_EMAIL_PRESET_ORDER,
  getStaffEmailPresetLabel,
  buildStaffEmailPreset,
  mergeMotifIntoBody,
  STAFF_EMAIL_MOTIF_PLACEHOLDER,
} from "../../utils/staffEmailPresets";
import "./RequestsManagement.css";
import "./StaffClientEmails.css";

const emptyForm = {
  recipient_name: "",
  recipient_email: "",
  recipient_cin: "",
  subject: "",
  body: "",
  request_id: "",
  message_preset: "",
  excuse: "",
};

/** Message lisible pour l’échec du GET /api/staff/client-emails (ex. table absente, 403, réseau). */
function staffEmailsListErrorMessage(err) {
  if (!err?.response) {
    return "Impossible de joindre l’API. Vérifiez que le serveur Laravel tourne et que VITE_API_BASE_URL est correct (ex. http://localhost:8000).";
  }
  const status = err.response.status;
  const data = err.response.data;
  const msg = typeof data?.message === "string" ? data.message : "";
  const blob = [msg, typeof data === "string" ? data : JSON.stringify(data ?? {})].join(" ");
  if (status === 401) {
    return "Session expirée. Reconnectez-vous.";
  }
  if (status === 403) {
    return "Accès refusé. Seuls admin, agent et responsable peuvent consulter cet historique.";
  }
  if (status === 404) {
    return "Route API introuvable. Mettez à jour le backend ou vérifiez l’URL (GET /api/staff/client-emails).";
  }
  if (status >= 500) {
    if (/staff_client_emails|n'existe pas|does not exist|Undefined table|42P01/i.test(blob)) {
      return "La base de données n’est pas à jour : la table des e-mails manque. Exécutez sur le projet API : php artisan migrate";
    }
    return msg || "Erreur serveur lors du chargement de l’historique.";
  }
  return msg || "Impossible de charger l’historique des e-mails.";
}

export default function StaffClientEmails() {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ last_page: 1 });

  const [requests, setRequests] = useState([]);
  /** Ligne sélectionnée pour la modale « détail e-mail » (corps complet, métadonnées). */
  const [emailDetail, setEmailDetail] = useState(null);

  const loadList = async (p = 1) => {
    setLoading(true);
    setListError("");
    try {
      const res = await listStaffClientEmails({ page: p, per_page: 15 });
      setRows(res.data || []);
      setPagination({
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      });
      setPage(p);
    } catch (e) {
      setListError(staffEmailsListErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList(1);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await listRequests({ per_page: 100, page: 1 });
        setRequests(res.data || []);
      } catch {
        setRequests([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!emailDetail) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setEmailDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emailDetail]);

  const applyPreset = (presetKey, requestRow) => {
    if (!presetKey || !STAFF_EMAIL_PRESET_ORDER.includes(presetKey)) {
      return;
    }
    const built = buildStaffEmailPreset(presetKey, requestRow || null);
    if (!built) {
      return;
    }
    setForm((p) => ({
      ...p,
      message_preset: presetKey,
      subject: built.subject,
      body: built.body,
      excuse: "",
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSendError("");
    setSendOk("");
    setSending(true);
    try {
      const bodyFinal = mergeMotifIntoBody(form.body, form.excuse);
      const payload = {
        recipient_name: form.recipient_name.trim(),
        recipient_email: form.recipient_email.trim(),
        recipient_cin: form.recipient_cin.trim(),
        subject: form.subject.trim(),
        body: bodyFinal,
      };
      if (form.request_id) {
        payload.request_id = Number(form.request_id);
      }
      await sendStaffClientEmail(payload);
      setSendOk("E-mail envoyé et enregistré.");
      setForm(emptyForm);
      await loadList(1);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Envoi impossible.";
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString("fr-FR") : "—");

  return (
    <div className="requests-management staff-client-emails-page">
      <div className="requests-header">
        <div className="header-left">
          <h2>E-mails clients</h2>
          <p className="requests-count staff-email-intro">
            Envoyez un message au client (nom, e-mail et CIN obligatoires). L’historique liste tous les
            envois selon vos droits. Les notifications automatiques (soumission, acceptation, etc.)
            continuent en parallèle.
          </p>
        </div>
      </div>

      <div className="staff-emails-grid">
        <form onSubmit={handleSend} className="staff-email-send-form">
          <h3 className="staff-email-section-heading staff-email-send-form__title">
            Nouvel envoi
          </h3>
          {sendOk ? <div className="success-banner">{sendOk}</div> : null}
          {sendError ? <div className="error-message staff-email-form-error">{sendError}</div> : null}

          <div className="filter-group">
            <label>Demande liée (optionnel)</label>
            <select
              value={form.request_id}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  setForm((p) => ({
                    ...p,
                    request_id: "",
                  }));
                  return;
                }
                const r = requests.find((x) => String(x.id) === id);
                if (!r) {
                  setForm((p) => ({ ...p, request_id: id }));
                  return;
                }
                const presetFromStatus =
                  r.current_status && STAFF_EMAIL_PRESET_ORDER.includes(r.current_status)
                    ? r.current_status
                    : "";
                const built = presetFromStatus ? buildStaffEmailPreset(presetFromStatus, r) : null;
                setForm((p) => ({
                  ...p,
                  request_id: id,
                  recipient_name: (r.client_name || "").trim(),
                  recipient_email: (r.recipient_hint_email || "").trim(),
                  recipient_cin: (r.recipient_hint_cin || "").trim(),
                  excuse: "",
                  message_preset: presetFromStatus,
                  ...(built
                    ? { subject: built.subject, body: built.body }
                    : {}),
                }));
              }}
            >
              <option value="">— Aucune —</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reference} —{" "}
                  {r.client_name || r.recipient_hint_email || r.client_email || "Client"}
                </option>
              ))}
            </select>
            <p className="staff-email-help-text">
              En choisissant une demande, le nom, l&apos;e-mail et le CIN se remplissent automatiquement
              quand l&apos;information est connue (compte client ou champs du formulaire). Sinon, complétez à la
              main.
            </p>
          </div>

          <div className="filter-group">
            <label>Modèle selon le statut (sujet + message)</label>
            <select
              value={form.message_preset}
              onChange={(e) => {
                const key = e.target.value;
                if (!key) {
                  setForm((p) => ({ ...p, message_preset: "", excuse: "" }));
                  return;
                }
                const r = requests.find((x) => String(x.id) === String(form.request_id));
                applyPreset(key, r || null);
              }}
            >
              <option value="">— Personnalisé (sans modèle) —</option>
              {STAFF_EMAIL_PRESET_ORDER.map((k) => (
                <option key={k} value={k}>
                  {getStaffEmailPresetLabel(k)}
                </option>
              ))}
            </select>
            <p className="staff-email-help-text">
              Choisissez un statut pour préremplir le sujet et le corps. Les infos (nom, référence, service)
              viennent de la demande sélectionnée si possible. Sinon, le texte utilise des libellés
              génériques.
            </p>
          </div>

          <div className="filter-group">
            <label>Nom du destinataire *</label>
            <input
              required
              value={form.recipient_name}
              onChange={(e) => setForm((p) => ({ ...p, recipient_name: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>E-mail du destinataire *</label>
            <input
              type="email"
              required
              value={form.recipient_email}
              onChange={(e) => setForm((p) => ({ ...p, recipient_email: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>CIN du destinataire *</label>
            <input
              required
              value={form.recipient_cin}
              onChange={(e) => setForm((p) => ({ ...p, recipient_cin: e.target.value }))}
              placeholder="Carte d’identité nationale"
            />
          </div>
          <div className="filter-group">
            <label>Sujet *</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Message *</label>
            <textarea
              required
              rows={10}
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            />
            {form.body.includes(STAFF_EMAIL_MOTIF_PLACEHOLDER) ? (
              <div className="filter-group staff-email-excuse-group">
                <label>Motif / excuses (optionnel)</label>
                <textarea
                  rows={4}
                  value={form.excuse}
                  onChange={(e) => setForm((p) => ({ ...p, excuse: e.target.value }))}
                  placeholder="Ex. motif du rejet, excuses, précisions pour le client…"
                />
                <p className="staff-email-help-text">
                  Ce texte remplace <code>[[MOTIF]]</code> dans le message à l&apos;envoi. Vous pouvez aussi
                  éditer directement le message ci-dessus.
                </p>
              </div>
            ) : null}
          </div>
          <button type="submit" className="btn-submit-comment" disabled={sending}>
            {sending ? "Envoi…" : "Envoyer l’e-mail"}
          </button>
        </form>

        <div className="staff-email-history-panel">
          <div className="staff-email-history-header">
            <h3 className="staff-email-section-heading">
              Historique des envois
            </h3>
            <span className="staff-email-history-hint">
              Cliquez sur une ligne ou sur « Détails » pour afficher nom, sujet, message complet, etc.
            </span>
          </div>
          {listError ? <div className="error-message">{listError}</div> : null}
          {loading ? (
            <p className="staff-email-loading">Chargement…</p>
          ) : (
            <div className="requests-table-container">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expéditeur</th>
                    <th>Destinataire</th>
                    <th>CIN</th>
                    <th>Demande</th>
                    <th className="staff-email-col-details">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr className="requests-table__empty-row">
                      <td colSpan={6} className="no-data">
                        Aucun e-mail enregistré.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="staff-email-history-row requests-table__data-row"
                        onClick={() => setEmailDetail(row)}
                        title="Cliquer pour voir le détail de l’e-mail"
                      >
                        <td data-label="Date">{formatDate(row.created_at)}</td>
                        <td data-label="Expéditeur">{row.sender?.name || "—"}</td>
                        <td data-label="Destinataire">
                          <div>{row.recipient_name}</div>
                          <div className="staff-email-recipient-email">{row.recipient_email}</div>
                        </td>
                        <td data-label="CIN">{row.recipient_cin}</td>
                        <td data-label="Demande">{row.request?.reference || "—"}</td>
                        <td className="staff-email-col-details" data-label="Détails">
                          <button
                            type="button"
                            className="btn-view staff-email-details-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmailDetail(row);
                            }}
                          >
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {pagination.last_page > 1 ? (
            <div className="pagination">
              <button type="button" disabled={page <= 1} onClick={() => loadList(page - 1)}>
                Précédent
              </button>
              <span className="pagination-info">
                Page {pagination.current_page} / {pagination.last_page}
              </span>
              <button
                type="button"
                disabled={page >= pagination.last_page}
                onClick={() => loadList(page + 1)}
              >
                Suivant
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {emailDetail ? (
        <div className="modal-overlay" onClick={() => setEmailDetail(null)} role="presentation">
          <div
            className="modal-content staff-client-email-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-email-detail-title"
          >
            <div className="modal-header">
              <h3 id="staff-email-detail-title">Détail de l&apos;e-mail</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEmailDetail(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="modal-body staff-email-detail-body">
              <dl className="staff-email-detail-meta">
                <dt>Date</dt>
                <dd>{formatDate(emailDetail.created_at)}</dd>
                <dt>Expéditeur</dt>
                <dd>
                  {emailDetail.sender?.name || "—"}
                  {emailDetail.sender?.email ? (
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      {" "}
                      &lt;{emailDetail.sender.email}&gt;
                    </span>
                  ) : null}
                </dd>
                <dt>Destinataire</dt>
                <dd>
                  {emailDetail.recipient_name}
                  <div style={{ fontSize: 13, color: "#64748b" }}>{emailDetail.recipient_email}</div>
                </dd>
                <dt>CIN</dt>
                <dd>{emailDetail.recipient_cin || "—"}</dd>
                <dt>Sujet</dt>
                <dd className="staff-email-detail-subject">{emailDetail.subject}</dd>
                <dt>Demande liée</dt>
                <dd>
                  {emailDetail.request?.id ? (
                    <Link to={`/admin/requests/${emailDetail.request.id}`}>
                      {emailDetail.request.reference || `Demande #${emailDetail.request.id}`}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </dl>
              <div className="staff-email-detail-message-block">
                <div className="staff-email-detail-message-label">Message</div>
                <pre className="staff-email-detail-message">
                  {emailDetail.body ?? "—"}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setEmailDetail(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
