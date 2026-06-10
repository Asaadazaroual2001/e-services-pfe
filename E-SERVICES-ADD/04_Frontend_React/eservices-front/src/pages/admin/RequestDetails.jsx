import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getRequest,
    approveRequest,
    rejectRequest,
    markRequestViewed,
    assignRequest,
    addComment,
} from "../../api/requestsAdmin";
import { getUsers } from "../../api/adminApi";
import { downloadRequestDocument, previewRequestDocument } from "../../api/requestDocumentsApi";
import { labelHistoryAction, labelStatusCode, isPreviewableMime } from "../../utils/requestUx";
import "./RequestsManagement.css";

const STATUS_LABELS = {
    DRAFT: { label: "Brouillon", class: "draft" },
    SUBMITTED: { label: "Soumise", class: "submitted" },
    IN_REVIEW: { label: "En révision", class: "in-review" },
    NEEDS_INFO: { label: "Info requise", class: "needs-info" },
    APPROVED: { label: "Approuvée", class: "approved" },
    REJECTED: { label: "Rejetée", class: "rejected" },
    CLOSED: { label: "Fermée", class: "closed" },
};

export default function RequestDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Assignment modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState("");

    // Approve/Reject modal
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState(""); // "approve" or "reject"
    const [actionComment, setActionComment] = useState("");

    // Comment state
    const [newComment, setNewComment] = useState("");
    const [commentLoading, setCommentLoading] = useState(false);

    // Load request details
    const loadRequest = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getRequest(id);
            setRequest(response.data);

            // Mark as viewed
            if (response.data && !response.data.is_viewed) {
                await markRequestViewed(id);
            }
        } catch (err) {
            console.error("Error loading request:", err);
            setError("Erreur lors du chargement de la demande");
        } finally {
            setLoading(false);
        }
    };

    // Load agents for assignment
    const loadAgents = async () => {
        try {
            const response = await getUsers({ role: "agent", per_page: 100 });
            setAgents(response.data || []);
        } catch (err) {
            console.error("Error loading agents:", err);
        }
    };

    // Handle assignment
    const handleAssign = async () => {
        if (!selectedAgent) {
            alert("Veuillez sélectionner un agent");
            return;
        }

        try {
            setActionLoading(true);
            await assignRequest(id, selectedAgent);
            setShowAssignModal(false);
            await loadRequest();
        } catch (err) {
            alert("Erreur lors de l'assignation");
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle approve/reject
    const handleAction = async () => {
        try {
            setActionLoading(true);

            if (actionType === "approve") {
                await approveRequest(id, actionComment || null);
            } else if (actionType === "reject") {
                await rejectRequest(id, actionComment || null);
            }

            setShowActionModal(false);
            setActionComment("");
            await loadRequest();
        } catch (err) {
            alert(`Erreur lors de ${actionType === "approve" ? "l'approbation" : "du rejet"}`);
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle add comment
    const handleAddComment = async () => {
        if (!newComment.trim()) {
            alert("Veuillez saisir un commentaire");
            return;
        }

        try {
            setCommentLoading(true);
            await addComment(id, newComment);
            setNewComment("");
            await loadRequest(); // Reload to get updated comments and history
        } catch (err) {
            alert("Erreur lors de l'ajout du commentaire");
            console.error(err);
        } finally {
            setCommentLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('fr-FR');
    };

    useEffect(() => {
        loadRequest();
        loadAgents();
    }, [id]);

    if (loading) {
        return (
            <div className="request-details-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="request-details-container">
                <div className="error-message">{error || "Demande introuvable"}</div>
                <button onClick={() => navigate("/admin/requests")}>
                    ← Retour à la liste
                </button>
            </div>
        );
    }

    return (
        <div className="request-details-container">
            {/* Header */}
            <div className="details-header">
                <button className="btn-back" onClick={() => navigate("/admin/requests")}>
                    ← Retour à la liste
                </button>
                <h2>Demande {request.reference}</h2>
                <span className={`status-badge ${STATUS_LABELS[request.current_status]?.class || ''}`}>
                    {STATUS_LABELS[request.current_status]?.label || request.current_status}
                </span>
            </div>

            {/* Actions */}
            <div className="details-actions">
                <button
                    className="btn-edit"
                    onClick={() => navigate(`/admin/requests/${id}/edit`)}
                >
                    ✏️ Modifier
                </button>
                
                <button
                    className="btn-assign"
                    onClick={() => setShowAssignModal(true)}
                >
                    {request.assigned_to ? "Réassigner" : "Assigner"}
                </button>

                {request.current_status === "IN_REVIEW" && (
                    <>
                        <button
                            className="btn-approve"
                            onClick={() => {
                                setActionType("approve");
                                setShowActionModal(true);
                            }}
                        >
                            Approuver
                        </button>
                        <button
                            className="btn-reject"
                            onClick={() => {
                                setActionType("reject");
                                setShowActionModal(true);
                            }}
                        >
                            Rejeter
                        </button>
                    </>
                )}
            </div>

            <div className="details-content">
                {/* Left Column - Info */}
                <div className="details-left">
                    {/* Client Info */}
                    <div className="details-section">
                        <h3>Informations Client</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Nom:</label>
                                <span>
                                    {request.display_client_name ??
                                        request.client?.name ??
                                        "—"}
                                </span>
                            </div>
                            <div className="info-item">
                                <label>Email:</label>
                                <span>{request.client?.email}</span>
                            </div>
                        </div>
                    </div>

                    {/* Service Info */}
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

                    {/* Assignment Info */}
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

                    {/* Field Values */}
                    {request.field_values && request.field_values.length > 0 && (
                        <div className="details-section">
                            <h3>Valeurs des champs</h3>
                            <div className="field-values">
                                {request.field_values.map((fv) => (
                                    <div key={fv.id} className="field-value-item">
                                        <label>{fv.service_field?.label}:</label>
                                        <span>{fv.value_text || JSON.stringify(fv.value_json) || "N/A"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents */}
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
                                                    onClick={() =>
                                                        previewRequestDocument("admin", request.id, doc.id)
                                                    }
                                                >
                                                    Aperçu
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-view"
                                            onClick={() =>
                                                downloadRequestDocument(
                                                    "admin",
                                                    request.id,
                                                    doc.id,
                                                    doc.file_name
                                                )
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

                    {/* Comments */}
                    <div className="details-section">
                        <h3>Commentaires administratifs</h3>
                        
                        {/* Add Comment Form */}
                        <div className="add-comment-form">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Ajouter un commentaire..." rows="3"
                                disabled={commentLoading}
                            />
                            <button
                                className="btn-submit-comment"
                                onClick={handleAddComment}
                                disabled={commentLoading || !newComment.trim()}
                            >
                                {commentLoading ? "Envoi..." : "Ajouter le commentaire"}
                            </button>
                        </div>

                        {/* Comments List */}
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

                {/* Right Column - Timeline */}
                <div className="details-right">
                    <div className="details-section">
                        <h3>Historique</h3>
                        <div className="timeline">
                            {request.histories && request.histories.length > 0 ? (
                                request.histories.map((history) => (
                                    <div key={history.id} className="timeline-item">
                                        <div className="timeline-marker"></div>
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
                                            {history.comment && (
                                                <div className="timeline-comment">{history.comment}</div>
                                            )}
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

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Assigner la demande</h3>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <label>Sélectionner un agent:</label>
                            <select
                                value={selectedAgent}
                                onChange={(e) => setSelectedAgent(e.target.value)}
                            >
                                <option value="">-- Choisir --</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowAssignModal(false)}
                                disabled={actionLoading}
                            >
                                Annuler
                            </button>
                            <button
                                className="btn-submit"
                                onClick={handleAssign}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Assignation..." : "Assigner"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve/Reject Modal */}
            {showActionModal && (
                <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{actionType === "approve" ? "Approuver" : "Rejeter"} la demande</h3>
                            <button className="modal-close" onClick={() => setShowActionModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <label>Commentaire (optionnel):</label>
                            <textarea
                                value={actionComment}
                                onChange={(e) => setActionComment(e.target.value)}
                                rows="4"
                                placeholder="Ajouter un commentaire..."
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowActionModal(false)}
                                disabled={actionLoading}
                            >
                                Annuler
                            </button>
                            <button
                                className={actionType === "approve" ? "btn-approve" : "btn-reject"}
                                onClick={handleAction}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? "En cours..."
                                    : (actionType === "approve" ? "Approuver" : "Rejeter")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
