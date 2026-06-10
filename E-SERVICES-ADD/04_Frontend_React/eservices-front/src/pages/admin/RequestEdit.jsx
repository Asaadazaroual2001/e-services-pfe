import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getRequest,
    updateRequest,
    assignRequest,
} from "../../api/requestsAdmin";
import { getUsers } from "../../api/adminApi";
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

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'SUBMITTED', label: 'Soumise' },
    { value: 'IN_REVIEW', label: 'En révision' },
    { value: 'NEEDS_INFO', label: 'Info requise' },
    { value: 'APPROVED', label: 'Approuvée' },
    { value: 'REJECTED', label: 'Rejetée' },
    { value: 'CLOSED', label: 'Fermée' },
];

export default function RequestEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    console.log("RequestEdit component rendered. ID:", id);

    const [request, setRequest] = useState(null);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Form fields
    const [currentStatus, setCurrentStatus] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [adminNote, setAdminNote] = useState("");

    // Load request details
    const loadRequest = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getRequest(id);
            const req = response.data;
            setRequest(req);
            setCurrentStatus(req.current_status);
            setAssignedTo(req.assigned_to || "");
            setIsActive(req.is_active);
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

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log("=== FORM SUBMIT TRIGGERED ===");
        console.log("Request ID:", id);
        console.log("Current Status:", currentStatus);
        console.log("Assigned To:", assignedTo);
        console.log("Is Active:", isActive);
        
        const payload = {
            current_status: currentStatus,
            is_active: isActive,
        };
        console.log("SAVE CLICKED - Payload:", payload);
        
        try {
            setSaving(true);
            setError("");
            setSuccessMessage("");

            // Update request
            console.log("Calling updateRequest...");
            const response = await updateRequest(id, payload);
            console.log("UPDATE RESPONSE:", response);

            // Assign agent if changed
            if (assignedTo && assignedTo !== request.assigned_to) {
                console.log("Assigning agent:", assignedTo);
                await assignRequest(id, assignedTo);
            }

            console.log("Redirecting to details page...");
            // Redirect immediately to details page
            navigate(`/admin/requests/${id}`, { replace: true });
        } catch (err) {
            console.error("Error updating request:", err);
            console.error("Error response:", err.response);
            setError(err.response?.data?.message || "Erreur lors de la mise à jour");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        loadRequest();
        loadAgents();
        console.log("=== RequestEdit mounted ===");
        console.log("handleSubmit is defined:", typeof handleSubmit === 'function');
    }, [id]);

    if (loading) {
        return (
            <div className="request-edit-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (error && !request) {
        return (
            <div className="request-edit-container">
                <div className="error-message">{error}</div>
                <button onClick={() => navigate("/admin/requests")}>
                    ← Retour à la liste
                </button>
            </div>
        );
    }

    return (
        <div className="request-edit-container">
            {/* Header */}
            <div className="details-header">
                <button className="btn-back" onClick={() => navigate(`/admin/requests/${id}`)}>
                    ← Retour aux détails
                </button>
                <h2>Modifier la Demande {request?.reference}</h2>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="success-message">
                    {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Edit Form */}
            <div className="edit-form-container">
                <form 
                    onSubmit={(e) => {
                        console.log("🎯 FORM ONSUBMIT EVENT FIRED 🎯");
                        handleSubmit(e);
                    }} 
                    className="edit-form"
                >
                    {/* Request Info (Read-only) */}
                    <div className="form-section">
                        <h3>Informations de la demande</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Référence:</label>
                                <span>{request?.reference}</span>
                            </div>
                            <div className="info-item">
                                <label>Client:</label>
                                <span>
                                    {request?.display_client_name ?? request?.client?.name ?? "—"}
                                </span>
                            </div>
                            <div className="info-item">
                                <label>Service:</label>
                                <span>{request?.service?.name}</span>
                            </div>
                            <div className="info-item">
                                <label>Agence:</label>
                                <span>{request?.service?.agency?.name || "N/A"}</span>
                            </div>
                            <div className="info-item">
                                <label>Date de soumission:</label>
                                <span>
                                    {request?.submitted_at 
                                        ? new Date(request.submitted_at).toLocaleString('fr-FR')
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="form-section">
                        <h3>Modifier</h3>
                        
                        {/* Status */}
                        <div className="form-group">
                            <label htmlFor="status">Statut *</label>
                            <select
                                id="status"
                                value={currentStatus}
                                onChange={(e) => {
                                    console.log("STATUS CHANGED:", e.target.value);
                                    setCurrentStatus(e.target.value);
                                }}
                                required
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <small className="form-help">
                                Attention: Certaines transitions de statut peuvent être restreintes
                            </small>
                        </div>

                        {/* Assigned Agent */}
                        <div className="form-group">
                            <label htmlFor="agent">Agent assigné</label>
                            <select
                                id="agent"
                                value={assignedTo}
                                onChange={(e) => {
                                    console.log("AGENT CHANGED:", e.target.value);
                                    setAssignedTo(e.target.value);
                                }}
                            >
                                <option value="">-- Non assigné --</option>
                                {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Active Status */}
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => {
                                        console.log("ACTIVE CHANGED:", e.target.checked);
                                        setIsActive(e.target.checked);
                                    }}
                                />
                                <span>Demande active</span>
                            </label>
                            <small className="form-help">
                                Les demandes inactives ne sont plus visibles par les clients
                            </small>
                        </div>

                        {/* Admin Note (optional) */}
                        <div className="form-group">
                            <label htmlFor="adminNote">Note administrative (optionnel)</label>
                            <textarea
                                id="adminNote"
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                rows="4"
                                placeholder="Ajouter une note interne..."
                            />
                            <small className="form-help">
                                Cette note sera visible uniquement par les administrateurs
                            </small>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate(`/admin/requests/${id}`)}
                            disabled={saving}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={saving}
                            onClick={(e) => {
                                console.log("=== SAVE BUTTON CLICKED ===");
                                console.log("Button type:", e.currentTarget.type);
                                console.log("Disabled:", e.currentTarget.disabled);
                                console.log("Form:", e.currentTarget.form);
                            }}
                        >
                            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
