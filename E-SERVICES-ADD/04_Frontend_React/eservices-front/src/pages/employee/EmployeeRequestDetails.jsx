import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  approveRequest,
  addComment as addEmployeeComment,
  getRequest,
  rejectRequest,
  requestInfo,
  startReview,
  takeRequest,
} from "../../api/employeeApi";
import { downloadRequestDocument, previewRequestDocument } from "../../api/requestDocumentsApi";
import { labelHistoryAction, labelStatusCode, isPreviewableMime } from "../../utils/requestUx";
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

export default function EmployeeRequestDetails() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(""); // approve | reject | requestInfo
  const [actionComment, setActionComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const loadRequest = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getRequest(requestId);
      setRequest(res.data);
    } catch (e) {
      setError("Erreur lors du chargement de la demande");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const isAssignedToMe = request && user ? request.assigned_to === user.id : false;

  const handleTake = async () => {
    try {
      await takeRequest(requestId);
      await loadRequest();
    } catch (e) {
      alert("Erreur lors de la prise en charge");
    }
  };

  const handleStartReview = async () => {
    try {
      await startReview(requestId);
      await loadRequest();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors du démarrage de la révision");
    }
  };

  const openActionModal = (type) => {
    setActionType(type);
    setActionComment("");
    setActionModalOpen(true);
  };

  const handleAction = async () => {
    if (!request) return;

    if ((actionType === "reject" || actionType === "requestInfo") && !actionComment.trim()) {
      alert("Le commentaire est requis.");
      return;
    }

    setActionLoading(true);
    try {
      if (actionType === "approve") {
        await approveRequest(requestId, actionComment || null);
      } else if (actionType === "reject") {
        await rejectRequest(requestId, actionComment);
      } else if (actionType === "requestInfo") {
        await requestInfo(requestId, actionComment);
      }

      setActionModalOpen(false);
      setActionComment("");
      await loadRequest();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      await addEmployeeComment(requestId, newComment);
      setNewComment("");
      await loadRequest();
    } catch (e) {
      alert("Erreur lors de l'ajout du commentaire");
    } finally {
      setCommentLoading(false);
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
        <button onClick={() => navigate("/employee/requests")}>← Retour</button>
      </div>
    );
  }

  const status = request.current_status;
  // `isAssignedToMe` is computed above (UI-level restriction; backend will still enforce).

  return (
    <div className="request-details-container">
      <div className="details-header">
        <button className="btn-back" onClick={() => navigate("/employee/requests")}>
          ← Retour à la liste
        </button>
        <h2>Demande {request.reference}</h2>
        <span className={`status-badge ${STATUS_LABELS[status]?.class || ""}`}>
          {STATUS_LABELS[status]?.label || status}
        </span>
      </div>

      <div className="details-actions">
        {request.assigned_to ? (
          <span style={{ color: "#64748b", fontWeight: 700 }}>
            Assigné à : {request.assigned_agent?.name || "—"}
          </span>
        ) : (
          <span style={{ color: "#f97316", fontWeight: 900 }}>Non assigné</span>
        )}

        {!isAssignedToMe && (
          <button className="btn-assign" type="button" onClick={handleTake}>
            Prendre
          </button>
        )}

        {isAssignedToMe && (status === "SUBMITTED" || status === "NEEDS_INFO") && (
          <button className="btn-submit" type="button" onClick={handleStartReview}>
            Démarrer la révision
          </button>
        )}

        {isAssignedToMe && status === "IN_REVIEW" && (
          <>
            <button className="btn-approve" type="button" onClick={() => openActionModal("approve")} disabled={actionLoading}>
              Approuver
            </button>
            <button className="btn-reject" type="button" onClick={() => openActionModal("reject")} disabled={actionLoading}>
              Rejeter
            </button>
            <button className="btn-edit" type="button" onClick={() => openActionModal("requestInfo")} disabled={actionLoading}>
              Demander info
            </button>
          </>
        )}
      </div>

      <div className="details-content">
        <div className="details-left">
          <div className="details-section">
            <h3>Informations Client</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Nom:</label>
                <span>{request.display_client_name ?? request.client?.name ?? "—"}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{request.client?.email}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Service</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Nom:</label>
                <span>{request.service?.name}</span>
              </div>
              <div className="info-item">
                <label>Description:</label>
                <span>{request.service?.description || "N/A"}</span>
              </div>
              <div className="info-item">
                <label>Agence:</label>
                <span>{request.service?.agency?.name || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Assignation</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Agent assigné:</label>
                <span>{request.assigned_agent?.name || "Non assigné"}</span>
              </div>
              <div className="info-item">
                <label>Date soumission:</label>
                <span>{formatDate(request.submitted_at)}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Valeurs des champs</h3>
            {request.field_values && request.field_values.length > 0 ? (
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
            ) : (
              <p style={{ color: "#64748b" }}>Aucune valeur.</p>
            )}
          </div>

          <div className="details-section">
            <h3>Pièces jointes</h3>
            {request.documents && request.documents.length > 0 ? (
              <div className="documents-list">
                {request.documents.map((doc) => (
                  <div key={doc.id} className="document-item" style={{ alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <span>{doc.file_name}</span>
                      <span className="doc-size">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} Ko` : ""}
                      </span>
                      {isPreviewableMime(doc.mime_type) && (
                        <button
                          type="button"
                          className="btn-edit"
                          style={{ marginLeft: 8 }}
                          onClick={() => previewRequestDocument("employee", request.id, doc.id)}
                        >
                          Aperçu
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-view"
                      onClick={() =>
                        downloadRequestDocument("employee", request.id, doc.id, doc.file_name)
                      }
                    >
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>Aucun document.</p>
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
            <h3>Historique</h3>
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

      {actionModalOpen && (
        <div className="modal-overlay" onClick={() => setActionModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {actionType === "approve"
                  ? "Approuver"
                  : actionType === "reject"
                    ? "Rejeter"
                    : "Demander des informations"}
              </h3>
              <button className="modal-close" type="button" onClick={() => setActionModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <label>{actionType === "approve" ? "Commentaire (optionnel):" : "Commentaire:"}</label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows="4"
                placeholder="Ajouter un commentaire..."
                disabled={actionLoading}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" type="button" onClick={() => setActionModalOpen(false)} disabled={actionLoading}>
                Annuler
              </button>
              <button
                className={
                  actionType === "approve"
                    ? "btn-approve"
                    : actionType === "reject"
                      ? "btn-reject"
                      : "btn-submit"
                }
                type="button"
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? "En cours..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

