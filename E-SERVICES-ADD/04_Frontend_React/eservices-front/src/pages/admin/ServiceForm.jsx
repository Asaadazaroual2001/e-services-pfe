import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getAgencies } from "../../api/adminApi";
import {
    createService,
    createField,
    deleteField,
    getService,
    listFields,
    updateField,
    updateService,
} from "../../api/services";
import { datetimeLocalToUtcIso, utcIsoToDatetimeLocal } from "../../utils/datetimeApi";
import "./ServicesManagement.css";

const FIELD_TYPE_OPTIONS = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "date", label: "Date" },
    { value: "textarea", label: "Textarea" },
    { value: "select", label: "Select" },
    { value: "file", label: "File" },
];

/** Clés / libellés alignés avec le backend (resolveRecipientHint*, Str::slug du titre). */
const FIXED_FIELD_SPECS = [
    {
        rowKey: "fixed-nom",
        type: "text",
        title: "Nom",
        keyMatch: ["nom", "name", "nom_complet", "full_name"],
        defaultDescription:
            "Votre nom et prénom complets, tels qu'ils figurent sur votre pièce d'identité.",
    },
    {
        rowKey: "fixed-email",
        type: "email",
        title: "Email",
        keyMatch: ["email", "e_mail", "mail", "courriel", "adresse_email", "adresse_e_mail"],
        defaultDescription:
            "Adresse e-mail valide : vous y recevrez les mises à jour et notifications sur votre demande.",
    },
    {
        rowKey: "fixed-cin",
        type: "text",
        title: "CIN",
        keyMatch: ["cin", "c_i_n"],
        defaultDescription: "Numéro de la carte d'identité nationale (CIN), sans espaces si possible.",
    },
];

function defaultFixedFieldRows() {
    return FIXED_FIELD_SPECS.map((spec) => ({
        rowKey: spec.rowKey,
        id: null,
        type: spec.type,
        title: spec.title,
        description: spec.defaultDescription ?? "",
        required: true,
        isFixed: true,
    }));
}

function newRow() {
    return {
        rowKey: crypto.randomUUID(),
        id: null,
        type: "text",
        title: "",
        description: "",
        required: false,
        isFixed: false,
    };
}

function normalizeFieldKeyFromServer(f) {
    const raw = (f.key != null && String(f.key).trim() !== "" ? f.key : slugKey(f.label ?? "")).toLowerCase();
    return raw;
}

/** Met Nom, Email, CIN en tête (obligatoires, non supprimables), puis les autres champs. */
function mergeLoadedFieldsWithFixed(serverList) {
    const list = Array.isArray(serverList) ? serverList : [];
    const usedIds = new Set();

    const fixedRows = FIXED_FIELD_SPECS.map((spec) => {
        const found = list.find((f) => {
            const k = normalizeFieldKeyFromServer(f);
            return spec.keyMatch.includes(k);
        });
        if (found) {
            usedIds.add(found.id);
            return {
                rowKey: `existing-${found.id}`,
                id: found.id,
                type: found.type,
                title: found.label ?? spec.title,
                description: found.description ?? "",
                required: true,
                isFixed: true,
            };
        }
        return {
            rowKey: spec.rowKey,
            id: null,
            type: spec.type,
            title: spec.title,
            description: spec.defaultDescription ?? "",
            required: true,
            isFixed: true,
        };
    });

    const rest = list
        .filter((f) => !usedIds.has(f.id))
        .map((f) => ({
            rowKey: `existing-${f.id}`,
            id: f.id,
            type: f.type,
            title: f.label ?? "",
            description: f.description ?? "",
            required: Boolean(f.required),
            isFixed: false,
        }));

    return [...fixedRows, ...rest];
}

function slugKey(title) {
    const s = title
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!s) return "field";
    return /^[0-9]/.test(s) ? `f_${s}` : s;
}

function allocateKey(title, used) {
    const base = slugKey(title);
    let key = base;
    let n = 1;
    while (used.has(key)) {
        key = `${base}_${n++}`;
    }
    used.add(key);
    return key;
}

function previewTypeLabel(type) {
    return FIELD_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function PreviewField({ field }) {
    const label = field.title?.trim() || "Untitled field";
    const isRequired = Boolean(field.required);
    const hint = field.description?.trim();
    const id = `preview-${field.rowKey}`;
    const typeLabel = previewTypeLabel(field.type);

    const ph = hint || undefined;
    const previewOnly = { readOnly: true, tabIndex: -1 };

    const control = (() => {
        switch (field.type) {
            case "number":
                return (
                    <input
                        id={id}
                        type="number"
                        name={id}
                        defaultValue=""
                        placeholder={ph ?? "0"}
                        className="preview-field-control"
                        {...previewOnly}
                    />
                );
            case "email":
                return (
                    <input
                        id={id}
                        type="email"
                        name={id}
                        defaultValue=""
                        placeholder={ph ?? "name@example.com"}
                        className="preview-field-control"
                        autoComplete="off"
                        {...previewOnly}
                    />
                );
            case "date":
                return (
                    <input
                        id={id}
                        type="date"
                        name={id}
                        className="preview-field-control"
                        title={hint || undefined}
                        disabled
                        tabIndex={-1}
                    />
                );
            case "textarea":
                return (
                    <textarea
                        id={id}
                        name={id}
                        rows={3}
                        defaultValue=""
                        className="preview-field-control"
                        placeholder={ph}
                        {...previewOnly}
                    />
                );
            case "select":
                return (
                    <select
                        id={id}
                        name={id}
                        className="preview-field-control"
                        defaultValue=""
                        disabled
                        tabIndex={-1}
                    >
                        <option value="">{hint || "Choose an option…"}</option>
                        <option value="a">Option A</option>
                        <option value="b">Option B</option>
                    </select>
                );
            case "file":
                return (
                    <input
                        id={id}
                        type="file"
                        name={id}
                        className="preview-field-control"
                        disabled
                        tabIndex={-1}
                    />
                );
            default:
                return (
                    <input
                        id={id}
                        type="text"
                        name={id}
                        defaultValue=""
                        className="preview-field-control"
                        placeholder={ph}
                        autoComplete="off"
                        {...previewOnly}
                    />
                );
        }
    })();

    return (
        <div className="preview-field">
            <div className="preview-field-header">
                <label htmlFor={id}>
                    {label}
                    {isRequired ? <span className="preview-required-mark"> *</span> : null}
                </label>
                <span className="preview-field-type-badge">{typeLabel}</span>
            </div>
            <div className="preview-field-input-wrap">{control}</div>
        </div>
    );
}

export default function ServiceForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const isAdmin = hasRole("admin");
    const isResponsable = hasRole("responsable");
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [editReady, setEditReady] = useState(!isEditMode);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [serviceName, setServiceName] = useState("");
    /** datetime-local (vide = pas de limite) */
    const [requestDeadlineAt, setRequestDeadlineAt] = useState("");
    /** datetime-local (vide = publication immédiate dès activation) */
    const [publishedAt, setPublishedAt] = useState("");
    const [agencyId, setAgencyId] = useState("");
    const [agencyDisplayName, setAgencyDisplayName] = useState("");
    const [agencies, setAgencies] = useState([]);
    const [agenciesLoaded, setAgenciesLoaded] = useState(false);
    const [fields, setFields] = useState(() => defaultFixedFieldRows());
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        if (!isEditMode && !isAdmin && !isResponsable) return;
        setAgenciesLoaded(false);
        // Responsable : pas de active_only (sinon agence « inactive » = liste vide) ; pas de only_with_responsable (déjà filtré côté API).
        const agencyParams = isAdmin
            ? { only_with_responsable: 1, active_only: 1 }
            : {};
        getAgencies(agencyParams)
            .then((data) => {
                let list = Array.isArray(data) ? data : [];
                if (isResponsable && !isAdmin && user?.id != null) {
                    list = list.filter(
                        (a) =>
                            Number(a.responsable_user_id) === Number(user.id) ||
                            (user.agency_id != null &&
                                Number(a.id) === Number(user.agency_id))
                    );
                }
                setAgencies(list);
                if (!isEditMode && isResponsable && !isAdmin && list.length >= 1) {
                    const preferred =
                        list.find((a) => Number(a.responsable_user_id) === Number(user.id)) ||
                        list.find((a) => Number(a.id) === Number(user.agency_id)) ||
                        list[0];
                    setAgencyId(String(preferred.id));
                    setAgencyDisplayName(
                        `${preferred.name}${preferred.city ? ` (${preferred.city})` : ""}`
                    );
                } else if (!isEditMode && isAdmin && list.length === 1) {
                    setAgencyId(String(list[0].id));
                }
            })
            .catch(() => setAgencies([]))
            .finally(() => setAgenciesLoaded(true));
    }, [isAdmin, isResponsable, isEditMode, user?.id, user?.agency_id]);

    const loadService = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getService(id);
            const service = res.data;
            setServiceName(service.name || "");
            if (service.request_deadline_at) {
                setRequestDeadlineAt(utcIsoToDatetimeLocal(service.request_deadline_at));
            } else {
                setRequestDeadlineAt("");
            }
            if (service.published_at) {
                setPublishedAt(utcIsoToDatetimeLocal(service.published_at));
            } else {
                setPublishedAt("");
            }
            setAgencyId(
                service.agency_id != null && service.agency_id !== ""
                    ? String(service.agency_id)
                    : ""
            );
            setAgencyDisplayName(service.agency?.name || "");

            const list = Array.isArray(service.fields) ? service.fields : [];
            setFields(list.length === 0 ? defaultFixedFieldRows() : mergeLoadedFieldsWithFixed(list));
        } catch (err) {
            console.error("Error loading service:", err);
            setError("Erreur lors du chargement du service");
        } finally {
            setLoading(false);
            setEditReady(true);
        }
    }, [id]);

    useEffect(() => {
        if (isEditMode) {
            loadService();
        }
    }, [isEditMode, loadService]);

    const updateRow = (rowKey, patch) => {
        setFields((prev) =>
            prev.map((r) => {
                if (r.rowKey !== rowKey) return r;
                if (r.isFixed) {
                    const next = { ...r };
                    if (Object.prototype.hasOwnProperty.call(patch, "description")) {
                        next.description = patch.description;
                    }
                    return next;
                }
                return { ...r, ...patch };
            })
        );
    };

    const addField = () => setFields((prev) => [...prev, newRow()]);

    const removeRow = (rowKey) => {
        setFields((prev) => {
            const target = prev.find((r) => r.rowKey === rowKey);
            if (!target || target.isFixed) return prev;
            return prev.filter((r) => r.rowKey !== rowKey);
        });
    };

    const payloadFields = useMemo(
        () =>
            fields.map((f) => ({
                type: f.type,
                title: f.title.trim(),
                description: f.description?.trim() ?? "",
                required: Boolean(f.isFixed) || Boolean(f.required),
            })),
        [fields]
    );

    const clientErrors = useMemo(() => {
        if (payloadFields.length < FIXED_FIELD_SPECS.length) {
            return "Les champs Nom, Email et CIN sont obligatoires.";
        }
        for (let i = 0; i < payloadFields.length; i++) {
            const f = payloadFields[i];
            const row = fields[i];
            if (!f.title) return `Champ ${i + 1} : le libellé est requis.`;
            if (!f.type) return `Champ ${i + 1} : le type est requis.`;
        }
        return "";
    }, [payloadFields]);

    const saveEdit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (clientErrors) {
            setError(clientErrors);
            return;
        }

        if (!serviceName.trim()) {
            setError("Service name is required when editing.");
            return;
        }

        if ((isAdmin || isResponsable) && !agencyId) {
            setError("Select an agency for this service.");
            return;
        }

        if (publishedAt.trim() && datetimeLocalToUtcIso(publishedAt) === null) {
            setError("Date de publication invalide.");
            return;
        }
        if (requestDeadlineAt.trim() && datetimeLocalToUtcIso(requestDeadlineAt) === null) {
            setError("Date limite des demandes invalide.");
            return;
        }

        try {
            setLoading(true);

            const updatePayload = {
                name: serviceName.trim(),
                is_active: true,
                request_deadline_at: requestDeadlineAt.trim() ? datetimeLocalToUtcIso(requestDeadlineAt) : null,
                published_at: publishedAt.trim() ? datetimeLocalToUtcIso(publishedAt) : null,
            };
            if ((isAdmin || isResponsable) && agencyId) {
                updatePayload.agency_id = parseInt(agencyId, 10);
            }
            await updateService(id, updatePayload);

            const listRes = await listFields(id);
            const serverFields = listRes.data ?? [];
            const keptIds = new Set(fields.filter((r) => r.id).map((r) => r.id));

            for (const sf of serverFields) {
                if (!keptIds.has(sf.id)) {
                    await deleteField(sf.id);
                }
            }

            const freshList = await listFields(id);
            const usedKeys = new Set((freshList.data ?? []).map((f) => f.key));

            for (let i = 0; i < fields.length; i++) {
                const row = fields[i];
                const title = row.title.trim();
                const description = row.description?.trim() || null;

                if (row.id) {
                    await updateField(row.id, {
                        label: title,
                        type: row.type,
                        description,
                        required: Boolean(row.isFixed) || Boolean(row.required),
                        order: i,
                    });
                } else {
                    const key = allocateKey(title, usedKeys);
                    await createField({
                        service_id: Number(id),
                        key,
                        label: title,
                        type: row.type,
                        description,
                        required: Boolean(row.isFixed) || Boolean(row.required),
                        order: i,
                    });
                }
            }

            setSuccess("Service updated successfully.");
            setTimeout(() => navigate(`/admin/services/${id}/fields`), 900);
        } catch (err) {
            console.error("Error saving service:", err);
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                setError(Object.values(errors).flat().join(", "));
            } else {
                setError(err.response?.data?.message || "Error while saving.");
            }
        } finally {
            setLoading(false);
        }
    };

    const saveCreate = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (clientErrors) {
            setError(clientErrors);
            return;
        }

        if (!agencyId) {
            setError("Select an agency (with a designated responsable).");
            return;
        }

        if (publishedAt.trim() && datetimeLocalToUtcIso(publishedAt) === null) {
            setError("Date de publication invalide.");
            return;
        }
        if (requestDeadlineAt.trim() && datetimeLocalToUtcIso(requestDeadlineAt) === null) {
            setError("Date limite des demandes invalide.");
            return;
        }

        const body = {
            fields: payloadFields,
            is_active: true,
            agency_id: parseInt(agencyId, 10),
            request_deadline_at: requestDeadlineAt.trim() ? datetimeLocalToUtcIso(requestDeadlineAt) : null,
            published_at: publishedAt.trim() ? datetimeLocalToUtcIso(publishedAt) : null,
        };
        if (serviceName.trim()) {
            body.name = serviceName.trim();
        }

        try {
            setLoading(true);
            const created = await createService(body);
            setSuccess("Service created successfully.");
            const createdId = created?.data?.id;
            setTimeout(() => {
                navigate(createdId ? `/admin/services/${createdId}/fields` : "/admin/services");
            }, 900);
        } catch (err) {
            console.error("Error creating service:", err);
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                setError(Object.values(errors).flat().join(", "));
            } else {
                setError(err.response?.data?.message || "Error while creating the service.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (isEditMode && !editReady) {
        return (
            <div className="service-form-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    const pageTitle = isEditMode ? "Edit service" : "Add New Service";

    return (
        <div className="service-form-container service-form-wide">
            <div className="form-header">
                <h2>{pageTitle}</h2>
                <button type="button" className="btn-back" onClick={() => navigate("/admin/services")}>
                    ← Back to list
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={isEditMode ? saveEdit : saveCreate} className="service-form">
                {(isAdmin || isResponsable || isEditMode) && (
                    <div className="form-group">
                        <label htmlFor={isAdmin ? "service-agency" : undefined}>Agence *</label>
                        {isAdmin ? (
                            <select
                                id="service-agency"
                                value={agencyId}
                                onChange={(e) => setAgencyId(e.target.value)}
                                required={!isEditMode}
                            >
                                <option value="">— Choisir une agence —</option>
                                {agencies.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                        {a.city ? ` (${a.city})` : ""}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div
                                className="agency-readonly"
                                style={{
                                    margin: 0,
                                    padding: "0.75rem 1rem",
                                    background: "#f1f5f9",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "0.5rem",
                                    color: "#1e293b",
                                    fontSize: "0.9375rem",
                                }}
                            >
                                {agencyDisplayName ||
                                    agencies.find((x) => String(x.id) === agencyId)?.name ||
                                    (!isEditMode && !agenciesLoaded
                                        ? "Chargement de votre agence…"
                                        : !isEditMode &&
                                            isResponsable &&
                                            !isAdmin &&
                                            agenciesLoaded &&
                                            agencies.length === 0
                                          ? "Aucune agence ne vous est attribuée comme responsable. Contactez un administrateur."
                                          : "—")}
                            </div>
                        )}
                        {!isEditMode && isAdmin && (
                            <small className="form-help">
                                Seules les agences avec un responsable désigné sont listées.
                            </small>
                        )}
                        {!isEditMode && isResponsable && !isAdmin && (
                            <small className="form-help">
                                Votre agence est renseignée automatiquement et ne peut pas être modifiée.
                            </small>
                        )}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="service-name">Service name (optional)</label>
                    <input
                        id="service-name"
                        type="text"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="e.g. Birth certificate request"
                        maxLength={255}
                    />
                    {isEditMode && <small className="form-help">Required when editing.</small>}
                </div>

                <div className="form-group">
                    <label htmlFor="service-published">Date de publication (optionnel)</label>
                    <input
                        id="service-published"
                        type="datetime-local"
                        value={publishedAt}
                        onChange={(e) => setPublishedAt(e.target.value)}
                    />
                    <small className="form-help">
                        Avant cette date, le portail client le considère comme fermé (non publié). Après cette date, il
                        peut être ouvert si la fiche est activée et que la date limite des demandes n’est pas dépassée.
                        Vide = pas de report de publication. L’heure saisie est celle de{" "}
                        <strong>votre navigateur</strong> (transmise en UTC au serveur).
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="service-deadline">Date limite des demandes (optionnel)</label>
                    <input
                        id="service-deadline"
                        type="datetime-local"
                        value={requestDeadlineAt}
                        onChange={(e) => setRequestDeadlineAt(e.target.value)}
                    />
                    <small className="form-help">
                        Après cette date, le portail client considère le service comme fermé (plus de nouvelles demandes
                        ni soumission de brouillons). Avant cette date, il reste ouvert si la fiche est activée et la
                        publication est atteinte. Vide = pas de limite.
                    </small>
                </div>

                <div className="dynamic-fields-section">
                    <div className="dynamic-fields-head">
                        <h3 className="dynamic-fields-title">Form fields</h3>
                        <p className="dynamic-fields-sub">
                            <strong>Nom</strong>, <strong>Email</strong> et <strong>CIN</strong> sont obligatoires, fixes
                            (non supprimables). Chaque ligne supplémentaire est une question sur le formulaire client.
                        </p>
                    </div>

                    <div className="field-rows">
                        {fields.map((row, index) => (
                            <div
                                key={row.rowKey}
                                className={`field-row-card${row.isFixed ? " field-row-card--fixed" : ""}`}
                            >
                                <div className="field-row-grid">
                                    <div className="form-group field-row-type">
                                        <label>Type</label>
                                        <select
                                            value={row.type}
                                            onChange={(e) => updateRow(row.rowKey, { type: e.target.value })}
                                            disabled={row.isFixed}
                                        >
                                            {FIELD_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group field-row-title">
                                        <label>Title {row.isFixed ? <span className="preview-required-mark"> *</span> : null}</label>
                                        <input
                                            type="text"
                                            value={row.title}
                                            onChange={(e) => updateRow(row.rowKey, { title: e.target.value })}
                                            placeholder="Label shown to users"
                                            maxLength={255}
                                            readOnly={row.isFixed}
                                            title={row.isFixed ? "Champ fixe" : undefined}
                                            style={row.isFixed ? { background: "#f1f5f9", cursor: "not-allowed" } : undefined}
                                        />
                                    </div>
                                    <div className="form-group field-row-desc">
                                        <label>Description</label>
                                        <input
                                            type="text"
                                            value={row.description}
                                            onChange={(e) =>
                                                updateRow(row.rowKey, { description: e.target.value })
                                            }
                                            placeholder={
                                                row.isFixed
                                                    ? "Texte d'aide affiché au client (modifiable)"
                                                    : "Help text (optional)"
                                            }
                                            maxLength={1000}
                                        />
                                    </div>
                                    <div className="field-row-required">
                                        <span className="field-row-required-label">Required</span>
                                        <button
                                            type="button"
                                            className={
                                                row.required || row.isFixed
                                                    ? "btn-required-toggle is-on"
                                                    : "btn-required-toggle"
                                            }
                                            onClick={() =>
                                                updateRow(row.rowKey, { required: !row.required })
                                            }
                                            aria-pressed={row.required || row.isFixed}
                                            disabled={row.isFixed}
                                            title={
                                                row.isFixed
                                                    ? "Champ obligatoire (fixe)"
                                                    : row.required
                                                      ? "Field is required — click to make optional"
                                                      : "Field is optional — click to require"
                                            }
                                        >
                                            {row.isFixed || row.required ? "Yes" : "No"}
                                        </button>
                                    </div>
                                    <div className="field-row-actions">
                                        <button
                                            type="button"
                                            className="btn-remove-row"
                                            onClick={() => removeRow(row.rowKey)}
                                            disabled={row.isFixed}
                                            title={
                                                row.isFixed
                                                    ? "Champ fixe — non supprimable"
                                                    : "Remove field"
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <span className="field-row-index">
                                    Field {index + 1}
                                    {row.isFixed ? (
                                        <span className="field-row-fixed-hint"> · fixe</span>
                                    ) : null}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button type="button" className="btn-add-field-row" onClick={addField}>
                        + Add Field
                    </button>
                </div>

                <div className="preview-panel">
                    <button
                        type="button"
                        className="preview-toggle"
                        onClick={() => setShowPreview((v) => !v)}
                        aria-expanded={showPreview}
                    >
                        {showPreview ? "Hide preview" : "Show preview"}
                    </button>
                    {showPreview && (
                        <div className="preview-card">
                            <h4 className="preview-heading">Preview</h4>
                            <p className="preview-service-name">
                                {serviceName.trim() || "Untitled service"}
                            </p>
                            <div className="preview-fields">
                                {fields.map((f) => (
                                    <PreviewField key={f.rowKey} field={f} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate("/admin/services")}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={
                            loading ||
                            (!isEditMode &&
                                isResponsable &&
                                !isAdmin &&
                                (!agenciesLoaded || !agencyId))
                        }
                    >
                        {loading ? "Saving…" : isEditMode ? "Save changes" : "Create service"}
                    </button>
                </div>
            </form>
        </div>
    );
}
