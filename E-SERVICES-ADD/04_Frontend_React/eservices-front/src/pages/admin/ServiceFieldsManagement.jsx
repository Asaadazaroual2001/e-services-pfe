import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getService, listFields, createField, updateField, deleteField } from "../../api/services";
import "./ServicesManagement.css";

const FIELD_TYPES = [
    { value: 'text', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Liste déroulante' },
    { value: 'textarea', label: 'Zone de texte' },
    { value: 'file', label: 'Fichier' },
];

export default function ServiceFieldsManagement() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [service, setService] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // États pour le formulaire d'ajout/édition
    const [showForm, setShowForm] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [formData, setFormData] = useState({
        key: "",
        label: "",
        placeholder: "",
        type: "text",
        required: false,
        description: "",
        options_json: [],
        order: 0,
    });
    const [optionsInput, setOptionsInput] = useState("");

    // Ajout rapide (1er page: nombre de champs, 2ème page: formulaire dynamique)
    const [quickCount, setQuickCount] = useState(1);
    const [quickMode, setQuickMode] = useState(false);
    const [quickDraftFields, setQuickDraftFields] = useState([]);
    const [quickError, setQuickError] = useState("");

    // Charger le service et ses champs
    useEffect(() => {
        loadServiceAndFields();
    }, [id]);

    const loadServiceAndFields = async () => {
        try {
            setLoading(true);
            setError("");
            
            // Charger le service
            const serviceResponse = await getService(id);
            setService(serviceResponse.data);
            
            // Charger les champs
            const fieldsResponse = await listFields(id);
            setFields(fieldsResponse.data || []);
            
        } catch (err) {
            console.error("Error loading service and fields:", err);
            setError("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOpenForm = (field = null) => {
        if (field) {
            // Mode édition
            setEditingField(field);
            setFormData({
                key: field.key,
                label: field.label,
                placeholder: field.placeholder || "",
                type: field.type,
                required: field.required,
                description: field.description || "",
                options_json: field.options_json || [],
                order: field.order,
            });
            setOptionsInput((field.options_json || []).join("\n"));
        } else {
            // Mode création
            setEditingField(null);
            setFormData({
                key: "",
                label: "",
                placeholder: "",
                type: "text",
                required: false,
                description: "",
                options_json: [],
                order: fields.length,
            });
            setOptionsInput("");
        }
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingField(null);
        setError("");
    };

    const handleSubmitField = async (e) => {
        e.preventDefault();
        setError("");

        try {
            // Préparer les options si le type est 'select'
            const fieldData = { ...formData };
            if (fieldData.type === 'select') {
                fieldData.options_json = optionsInput
                    .split("\n")
                    .map(opt => opt.trim())
                    .filter(opt => opt.length > 0);
            } else {
                fieldData.options_json = null;
            }

            if (editingField) {
                // Mise à jour
                await updateField(editingField.id, fieldData);
            } else {
                // Création
                fieldData.service_id = Number.parseInt(id, 10);
                await createField(fieldData);
            }

            // Recharger les champs
            await loadServiceAndFields();
            handleCloseForm();

        } catch (err) {
            console.error("Error saving field:", err);
            
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const errorMessages = Object.values(errors).flat().join(", ");
                setError(errorMessages);
            } else {
                setError(err.response?.data?.message || "Erreur lors de l'enregistrement du champ");
            }
        }
    };

    const toSnakeCase = (input) => {
        const s = String(input || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");

        // Keep only valid pattern a-z_ then a-z0-9_
        const cleaned = s.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
        return cleaned;
    };

    const handleOpenQuickMode = () => {
        setQuickError("");
        const n = Number(quickCount);
        if (!Number.isFinite(n) || n < 1) {
            setQuickError("Veuillez saisir un nombre de champs valide.");
            return;
        }

        setQuickDraftFields(
            Array.from({ length: n }, (_, i) => ({
                order: i,
                type: "number",
                required: false,
                label: "",
                placeholder: "",
                description: "",
                optionsInput: "",
            }))
        );
        setQuickMode(true);
        setShowForm(false);
        setEditingField(null);
        setError("");
    };

    const handleSaveQuickMode = async () => {
        setQuickError("");

        const serviceId = Number.parseInt(id, 10);
        if (!Number.isFinite(serviceId)) {
            setQuickError("Service invalide.");
            return;
        }

        const usedKeys = new Set();

        try {
            for (let i = 0; i < quickDraftFields.length; i++) {
                const f = quickDraftFields[i];
                const labelTrim = (f.label || "").trim();
                if (!labelTrim) {
                    setQuickError(`Le titre du champ ${i + 1} est obligatoire.`);
                    return;
                }

                const baseKey = toSnakeCase(labelTrim);
                if (!baseKey) {
                    setQuickError(`Impossible de générer une clé valide pour le champ ${i + 1}.`);
                    return;
                }

                let key = baseKey;
                if (usedKeys.has(key)) {
                    key = `${baseKey}_${i + 1}`;
                }

                let safety = 0;
                while (usedKeys.has(key) && safety < 100) {
                    key = `${baseKey}_${i + 1}_${safety + 1}`;
                    safety++;
                }

                usedKeys.add(key);

                const options =
                    f.type === "select"
                        ? (f.optionsInput || "")
                              .split("\n")
                              .map((opt) => opt.trim())
                              .filter((opt) => opt.length > 0)
                        : null;

                const fieldData = {
                    service_id: serviceId,
                    key,
                    label: labelTrim,
                    placeholder: f.placeholder || null,
                    description: f.description || null,
                    type: f.type,
                    required: Boolean(f.required),
                    options_json: options && Array.isArray(options) && options.length > 0 ? options : (f.type === "select" ? [] : null),
                    order: f.order ?? i,
                };

                await createField(fieldData);
            }

            await loadServiceAndFields();
            setQuickMode(false);
            setQuickDraftFields([]);
        } catch (err) {
            console.error("Error saving quick fields:", err);
            setQuickError(
                err.response?.data?.message ||
                    (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : "Erreur lors de l'enregistrement.")
            );
        }
    };

    const handleDeleteField = async (fieldId, fieldLabel) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le champ "${fieldLabel}" ?`)) {
            return;
        }

        try {
            await deleteField(fieldId);
            await loadServiceAndFields();
        } catch (err) {
            console.error("Error deleting field:", err);
            alert("Erreur lors de la suppression du champ");
        }
    };

    if (loading) {
        return (
            <div className="fields-management-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fields-management-container">
            {/* Header */}
            <div className="fields-header">
                <div className="header-left">
                    <button 
                        className="btn-back"
                        onClick={() => navigate("/admin/services")}
                    >
                        ← Retour à la liste
                    </button>
                    <div>
                        <h2>Gestion des champs</h2>
                        <p className="service-name">{service?.name}</p>
                    </div>
                </div>
                <button 
                    className="btn-add-field"
                    onClick={() => handleOpenForm()}
                >
                    <span className="btn-icon">+</span>
                    Ajouter un champ
                </button>
            </div>

            {/* Message d'erreur global */}
            {error && !showForm && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Ajout rapide (page 1) */}
            {!quickMode && (
                <div style={{ marginTop: 16, padding: 14, border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                            <div style={{ fontWeight: 900, marginBottom: 4 }}>Ajout rapide des champs</div>
                            <div style={{ color: "#64748b", fontSize: 13 }}>
                                Indique le nombre de champs à créer, puis remplis le type + titre + placeholder + description.
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input
                                type="number"
                                min="1"
                                value={quickCount}
                                onChange={(e) => setQuickCount(Number(e.target.value))}
                                style={{ width: 100, padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", background: "white" }}
                            />
                            <button className="btn-add-field" onClick={handleOpenQuickMode}>
                                Continuer
                            </button>
                        </div>
                    </div>
                    {quickError ? (
                        <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 700 }}>{quickError}</div>
                    ) : null}
                </div>
            )}

            {/* Liste des champs */}
            <div className="fields-list">
                {fields.length === 0 ? (
                    <div className="no-fields">
                        <p>Aucun champ configuré pour ce service</p>
                        <button 
                            className="btn-add-first"
                            onClick={() => handleOpenForm()}
                        >
                            Ajouter le premier champ
                        </button>
                    </div>
                ) : (
                    <table className="fields-table">
                        <thead>
                            <tr>
                                <th>Ordre</th>
                                <th>Clé</th>
                                <th>Libellé</th>
                                <th>Type</th>
                                <th>Requis</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((field) => (
                                <tr key={field.id}>
                                    <td>{field.order}</td>
                                    <td><code>{field.key}</code></td>
                                    <td>{field.label}</td>
                                    <td>
                                        <span className="type-badge">
                                            {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                        </span>
                                    </td>
                                    <td>
                                        {field.required ? (
                                            <span className="required-badge">Oui</span>
                                        ) : (
                                            <span className="optional-badge">Non</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleOpenForm(field)}
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDeleteField(field.id, field.label)}
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Formulaire modal */}
            {quickMode && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        setQuickMode(false);
                        setQuickDraftFields([]);
                        setQuickError("");
                    }}
                >
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Ajout rapide des champs</h3>
                            <button
                                className="modal-close"
                                onClick={() => {
                                    setQuickMode(false);
                                    setQuickDraftFields([]);
                                    setQuickError("");
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {quickError ? (
                            <div className="error-message">{quickError}</div>
                        ) : null}

                        <div style={{ maxHeight: "70vh", overflow: "auto", padding: 8 }}>
                            {quickDraftFields.map((f, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        border: "1px solid #e2e8f0",
                                        borderRadius: 14,
                                        padding: 14,
                                        background: "#fff",
                                        marginBottom: 12,
                                    }}
                                >
                                    <div style={{ fontWeight: 950, marginBottom: 10 }}>
                                        Champ {idx + 1}
                                    </div>

                                    <div style={{ display: "grid", gap: 10 }}>
                                        <div className="form-group">
                                            <label htmlFor={`quick_type_${idx}`}>
                                                Type <span className="required">*</span>
                                            </label>
                                            <select
                                                id={`quick_type_${idx}`}
                                                value={f.type}
                                                onChange={(e) => {
                                                    const newType = e.target.value;
                                                    setQuickDraftFields((prev) =>
                                                        prev.map((x, i) =>
                                                            i === idx ? { ...x, type: newType } : x
                                                        )
                                                    );
                                                }}
                                            >
                                                {FIELD_TYPES.map((t) => (
                                                    <option key={t.value} value={t.value}>
                                                        {t.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor={`quick_required_${idx}`} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    id={`quick_required_${idx}`}
                                                    checked={Boolean(f.required)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setQuickDraftFields((prev) =>
                                                            prev.map((x, i) =>
                                                                i === idx ? { ...x, required: checked } : x
                                                            )
                                                        );
                                                    }}
                                                />
                                                <span>Champ requis</span>
                                            </label>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor={`quick_label_${idx}`}>
                                                Titre (Libellé) <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id={`quick_label_${idx}`}
                                                value={f.label}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setQuickDraftFields((prev) =>
                                                        prev.map((x, i) =>
                                                            i === idx ? { ...x, label: v } : x
                                                        )
                                                    );
                                                }}
                                                placeholder="Ex: Numéro de CNSS"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor={`quick_placeholder_${idx}`}>Placeholder (optionnel)</label>
                                            <input
                                                type="text"
                                                id={`quick_placeholder_${idx}`}
                                                value={f.placeholder}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setQuickDraftFields((prev) =>
                                                        prev.map((x, i) =>
                                                            i === idx ? { ...x, placeholder: v } : x
                                                        )
                                                    );
                                                }}
                                                placeholder="Ex: ex: 1234567890"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor={`quick_description_${idx}`}>Description (optionnel)</label>
                                            <textarea
                                                id={`quick_description_${idx}`}
                                                rows={3}
                                                value={f.description}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setQuickDraftFields((prev) =>
                                                        prev.map((x, i) =>
                                                            i === idx ? { ...x, description: v } : x
                                                        )
                                                    );
                                                }}
                                                placeholder="Ex: Comme indiqué sur le document CNSS..."
                                            />
                                        </div>

                                        {f.type === "select" ? (
                                            <div className="form-group">
                                                <label htmlFor={`quick_options_${idx}`}>
                                                    Options (une par ligne)
                                                </label>
                                                <textarea
                                                    id={`quick_options_${idx}`}
                                                    rows={4}
                                                    value={f.optionsInput}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setQuickDraftFields((prev) =>
                                                            prev.map((x, i) =>
                                                                i === idx ? { ...x, optionsInput: v } : x
                                                            )
                                                        );
                                                    }}
                                                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="form-actions" style={{ padding: 12 }}>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => {
                                    setQuickMode(false);
                                    setQuickDraftFields([]);
                                    setQuickError("");
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                className="btn-submit"
                                onClick={handleSaveQuickMode}
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingField ? "Modifier le champ" : "Ajouter un champ"}</h3>
                            <button className="modal-close" onClick={handleCloseForm}>×</button>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmitField} className="field-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="key">
                                        Clé (snake_case) <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="key"
                                        name="key"
                                        value={formData.key}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ex: full_name"
                                        pattern="^[a-z_][a-z0-9_]*$"
                                        title="Format: lettres minuscules, chiffres et underscores uniquement"
                                    />
                                    <small>Format: lettres minuscules et underscores (ex: birth_date)</small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="label">
                                        Libellé <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="label"
                                        name="label"
                                        value={formData.label}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ex: Nom complet"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="placeholder">
                                        Placeholder (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        id="placeholder"
                                        name="placeholder"
                                        value={formData.placeholder}
                                        onChange={handleChange}
                                        placeholder="Ex: Saisir votre nom (comme sur la CIN)"
                                        maxLength={255}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="description">
                                        Description / aide au client (optionnel)
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Ex: Indique la valeur telle qu'elle apparaît sur le document..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="type">
                                        Type de champ <span className="required">*</span>
                                    </label>
                                    <select
                                        id="type"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        required
                                    >
                                        {FIELD_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="order">
                                        Ordre <span className="required">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="order"
                                        name="order"
                                        value={formData.order}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            {formData.type === 'select' && (
                                <div className="form-group">
                                    <label htmlFor="options">
                                        Options (une par ligne) <span className="required">*</span>
                                    </label>
                                    <textarea
                                        id="options"
                                        value={optionsInput}
                                        onChange={(e) => setOptionsInput(e.target.value)}
                                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                                        rows="5"
                                        required={formData.type === 'select'}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="required"
                                        checked={formData.required}
                                        onChange={handleChange}
                                    />
                                    <span>Champ requis</span>
                                </label>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={handleCloseForm}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                >
                                    {editingField ? "Mettre à jour" : "Créer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
