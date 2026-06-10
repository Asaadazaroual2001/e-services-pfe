import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addComment,
  deleteRequest,
  getMyRequest,
  submitRequest,
  uploadDocument,
} from "../../api/clientApi";
import { downloadRequestDocument, previewRequestDocument } from "../../api/requestDocumentsApi";
import {
  labelHistoryAction,
  labelStatusCode,
  STATUS_LABELS,
  isPreviewableMime,
} from "../../utils/requestUx";
import "../admin/RequestsManagement.css";

const POLL_MS = 30_000;

export default function RequestView() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadRequest = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await getMyRequest(requestId);
      setRequest(res.data);
      setLastSyncedAt(new Date());
    } catch (e) {
      if (!silent) setError("Demande introuvable");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadRequest(false);
  }, [loadRequest]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!request || request.current_status === "DRAFT" || request.current_status === "CLOSED") {
      return undefined;
    }
    pollRef.current = setInterval(() => {
      loadRequest(true);
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [request?.current_status, request?.id, loadRequest]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      await addComment(requestId, newComment);
      setNewComment("");
      await loadRequest();
    } catch (e) {
      alert("Erreur lors de l'ajout du commentaire");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!request || request.current_status !== "DRAFT") return;
    setCommentLoading(true);
    try {
      await submitRequest(requestId, {});
      await loadRequest();
    } catch (e) {
      const msg = e.response?.data?.message || "Erreur lors de la soumission";
      alert(msg);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!request || request.current_status !== "DRAFT") return;
    if (!window.confirm("Supprimer ce brouillon ?")) return;
    try {
      await deleteRequest(requestId);
      navigate("/client/requests");
    } catch (e) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !request) return;
    setDocUploading(true);
    try {
      await uploadDocument(request.id, file);
      await loadRequest();
    } catch (err) {
      alert(err.message || err.response?.data?.message || "Échec de l’envoi du fichier");
    } finally {
      setDocUploading(false);
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      await downloadRequestDocument("client", request.id, doc.id, doc.file_name);
    } catch (e) {
      alert("Téléchargement impossible");
    }
  };

  const handlePreviewDoc = async (doc) => {
    try {
      await previewRequestDocument("client", request.id, doc.id);
    } catch (e) {
      alert("Aperçu impossible");
    }
  };

  if (loading) {
    return (
      <div className="request-details-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="request-details-container">
        <div className="error-message">{error || "Demande introuvable"}</div>
        <button onClick={() => navigate("/client/requests")}>← Retour</button>
      </div>
    );
  }

  const canUploadDocs = request.current_status !== "CLOSED";
  const showPollHint =
    request.current_status !== "DRAFT" && request.current_status !== "CLOSED";

  return (
    <div className="request-details-container">
      <div className="details-header">
        <button className="btn-back" onClick={() => navigate("/client/requests")}>
          ← Retour à la liste
        </button>
        <h2>Suivi — {request.reference}</h2>
        <span className={`status-badge ${STATUS_LABELS[request.current_status]?.class || ""}`}>
          {STATUS_LABELS[request.current_status]?.label || request.current_status}
        </span>
      </div>

      {showPollHint && (
        <p className="request-sync-hint" style={{ color: "#64748b", fontSize: 14, margin: "0 0 12px 0" }}>
          Cette page se met à jour automatiquement environ toutes les 30 secondes.
          {lastSyncedAt ? ` Dernière synchro : ${formatDate(lastSyncedAt.toISOString())}.` : ""}
        </p>
      )}

      <p style={{ color: "#475569", fontSize: 14, margin: "0 0 16px 0" }}>
        Vous recevez un e-mail lors des changements de statut ou lorsqu’un agent laisse un message
        (si votre adresse est renseignée sur le compte).
      </p>

      {request.current_status === "DRAFT" && (
        <div className="details-actions">
          <button className="btn-submit-comment" type="button" onClick={handleSubmit} disabled={commentLoading}>
            {commentLoading ? "Soumission..." : "Soumettre"}
          </button>
          <button className="btn-cancel" type="button" onClick={handleDeleteDraft} disabled={commentLoading}>
            Supprimer
          </button>
        </div>
      )}

      <div className="details-content">
        <div className="details-left">
          <div className="details-section">
            <h3>Demande</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Service:</label>
                <span>{request.service?.name || "N/A"}</span>
              </div>
              <div className="info-item">
                <label>Agence:</label>
                <span>{request.service?.agency?.name || "N/A"}</span>
              </div>
              {request.submitted_at ? (
                <div className="info-item">
                  <label>Date de soumission:</label>
                  <span>{formatDate(request.submitted_at)}</span>
                </div>
              ) : null}
            </div>
          </div>

          {request.field_values && request.field_values.length > 0 && (
            <div className="details-section">
              <h3>Formulaire (champs du service)</h3>
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
                Ces champs sont définis par l’administrateur pour ce type de demande.
              </p>
              <div className="field-values">
                {request.field_values.map((fv) => {
                  const display =
                    fv.value_text ??
                    (fv.value_json !== null && fv.value_json !== undefined ? JSON.stringify(fv.value_json) : "N/A");
                  return (
                    <div key={fv.id} className="field-value-item">
                      <label>{fv.service_field?.label}:</label>
                      <span>{display || "N/A"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="details-section">
            <h3>Pièces jointes</h3>
            {canUploadDocs && (
              <div style={{ marginBottom: 12 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  disabled={docUploading}
                  onChange={handleDocUpload}
                />
                <button
                  type="button"
                  className="btn-submit-comment"
                  disabled={docUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {docUploading ? "Envoi…" : "+ Ajouter un fichier"}
                </button>
                <span style={{ marginLeft: 10, fontSize: 12, color: "#64748b" }}>Max. ~2 Mo</span>
              </div>
            )}
            {request.documents && request.documents.length > 0 ? (
              <div className="documents-list">
                {request.documents.map((doc) => (
                  <div key={doc.id} className="document-item" style={{ alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{doc.file_name}</div>
                      <div className="doc-size">{doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} Ko` : ""}</div>
                      {isPreviewableMime(doc.mime_type) && (
                        <button
                          type="button"
                          className="btn-edit"
                          style={{ marginTop: 6 }}
                          onClick={() => handlePreviewDoc(doc)}
                        >
                          Aperçu
                        </button>
                      )}
                    </div>
                    <button type="button" className="btn-view" onClick={() => handleDownloadDoc(doc)}>
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>Aucun document pour le moment.</p>
            )}
          </div>

          <div className="details-section">
            <h3>Commentaires</h3>
            <div className="add-comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows="3"
                disabled={commentLoading}
              />
              <button className="btn-submit-comment" onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}>
                {commentLoading ? "Envoi..." : "Ajouter le commentaire"}
              </button>
            </div>

            {request.comments && request.comments.length > 0 ? (
              <div className="comments-list">
                {request.comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <strong>{comment.user?.name}</strong>
                      <span className="comment-date">{formatDate(comment.created_at)}</span>
                    </div>
                    <div className="comment-body">{comment.comment}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-comments">Aucun commentaire pour le moment</p>
            )}
          </div>
        </div>

        <div className="details-right">
          <div className="details-section">
            <h3>Historique & étapes</h3>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
              Fil chronologique des actions sur votre demande.
            </p>
            <div className="timeline">
              {request.histories && request.histories.length > 0 ? (
                request.histories.map((history) => (
                  <div key={history.id} className="timeline-item">
                    <div className="timeline-marker" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <strong>{labelHistoryAction(history.action)}</strong>
                        <span className="timeline-date">{formatDate(history.created_at)}</span>
                      </div>
                      <div className="timeline-actor">Par : {history.actor?.name || "—"}</div>
                      {history.from_status && (
                        <div className="timeline-status">
                          {labelStatusCode(history.from_status)} → {labelStatusCode(history.to_status)}
                        </div>
                      )}
                      {history.comment && <div className="timeline-comment">{history.comment}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <p>Aucun historique disponible</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
