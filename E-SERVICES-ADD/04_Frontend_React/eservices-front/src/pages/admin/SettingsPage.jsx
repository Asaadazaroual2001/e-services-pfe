import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { updateMyProfile } from "../../api/auth";
import "./AdminDashboard.css";

function formatApiErrors(err) {
    const d = err.response?.data;
    if (d?.errors && typeof d.errors === "object") {
        return Object.values(d.errors)
            .flat()
            .filter(Boolean)
            .join(" ");
    }
    return typeof d?.message === "string" ? d.message : "Erreur lors de l'enregistrement.";
}

/**
 * Paramètres : modification du compte connecté (nom, e-mail, CIN, mot de passe).
 * Accessible aux rôles ayant l'entrée « Paramètres » (admin, responsable).
 */
export default function SettingsPage() {
    const { user, refresh, hasRole } = useAuth();
    const isAdmin = hasRole("admin");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [cin, setCin] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState("");

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setCin(user.cin || "");
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setOk("");

        if (password || passwordConfirmation || currentPassword) {
            if (!currentPassword) {
                setError("Indiquez votre mot de passe actuel pour le changer.");
                return;
            }
            if (!password || password.length < 8) {
                setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
                return;
            }
            if (password !== passwordConfirmation) {
                setError("La confirmation du mot de passe ne correspond pas.");
                return;
            }
        }

        setSaving(true);
        try {
            await updateMyProfile({
                name,
                email,
                cin,
                current_password: currentPassword || undefined,
                password: password || undefined,
                password_confirmation: passwordConfirmation || undefined,
            });
            setCurrentPassword("");
            setPassword("");
            setPasswordConfirmation("");
            await refresh();
            setOk("Profil enregistré avec succès.");
        } catch (err) {
            setError(formatApiErrors(err));
        } finally {
            setSaving(false);
        }
    };

    const rolesLabel = (user?.roles || []).join(", ") || "—";

    return (
        <div className="admin-dashboard settings-page">
            <div className="settings-page-inner">
            <div className="admin-dashboard-hero settings-page-hero">
                <h2 className="admin-dashboard-title">Paramètres</h2>
                <p className="admin-dashboard-subtitle">
                    Modifiez les informations de votre compte : nom, adresse e-mail, CIN et mot de passe.
                </p>
            </div>

            <div
                className="kpi-card kpi-services"
                style={{ width: "100%", padding: "1.5rem 1.75rem", marginBottom: "1.25rem" }}
            >
                <div className="kpi-label">Compte connecté</div>
                <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "#64748b", lineHeight: 1.5 }}>
                    Rôles : <strong style={{ color: "#0f172a" }}>{rolesLabel}</strong>
                    {user?.agency_id != null ? (
                        <>
                            <br />
                            Agence (ID) : <strong style={{ color: "#0f172a" }}>{user.agency_id}</strong> — assignée par
                            l&apos;administrateur.
                        </>
                    ) : null}
                </p>
            </div>

            {ok ? (
                <div
                    className="admin-dashboard-error"
                    style={{
                        borderRadius: "12px",
                        padding: "1rem 1.25rem",
                        marginBottom: "1rem",
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#166534",
                    }}
                >
                    {ok}
                </div>
            ) : null}
            {error ? (
                <div className="admin-dashboard-error" style={{ borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
                    {error}
                </div>
            ) : null}

            <form
                onSubmit={handleSubmit}
                className="kpi-card kpi-services"
                style={{ width: "100%", padding: "1.5rem 1.75rem", display: "grid", gap: "1.1rem" }}
            >
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>Informations personnelles</h3>

                <div className="settings-field">
                    <label htmlFor="settings-name">Nom complet *</label>
                    <input
                        id="settings-name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                    />
                </div>
                <div className="settings-field">
                    <label htmlFor="settings-email">E-mail *</label>
                    <input
                        id="settings-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </div>
                <div className="settings-field">
                    <label htmlFor="settings-cin">CIN</label>
                    <input
                        id="settings-cin"
                        value={cin}
                        onChange={(e) => setCin(e.target.value)}
                        placeholder="Carte d'identité nationale (optionnel pour certains rôles)"
                        autoComplete="off"
                        maxLength={32}
                    />
                </div>

                <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.05rem", color: "#0f172a" }}>Mot de passe</h3>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5 }}>
                    Laissez vide pour ne pas modifier le mot de passe. Pour le changer : mot de passe actuel, puis le
                    nouveau (8 caractères minimum) et la confirmation.
                </p>
                <div className="settings-field">
                    <label htmlFor="settings-current-pw">Mot de passe actuel</label>
                    <input
                        id="settings-current-pw"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>
                <div className="settings-field">
                    <label htmlFor="settings-new-pw">Nouveau mot de passe</label>
                    <input
                        id="settings-new-pw"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>
                <div className="settings-field">
                    <label htmlFor="settings-confirm-pw">Confirmer le nouveau mot de passe</label>
                    <input
                        id="settings-confirm-pw"
                        type="password"
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>

                <button type="submit" className="btn-submit-comment" disabled={saving} style={{ marginTop: "0.25rem" }}>
                    {saving ? "Enregistrement…" : "Enregistrer les modifications"}
                </button>
            </form>

            {isAdmin ? (
                <div
                    className="admin-dashboard-error"
                    style={{
                        borderRadius: "12px",
                        padding: "1.25rem",
                        marginTop: "1.5rem",
                        width: "100%",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "#475569",
                    }}
                >
                    <strong style={{ color: "#0f172a" }}>Administration</strong>
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
                        La gestion des clients, des agences et des rôles se fait depuis le menu « Agences
                        &amp; employés » et « Gestion des clients ».
                    </p>
                </div>
            ) : null}

            </div>

            <style>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        .settings-page-inner {
          width: 100%;
          max-width: 560px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 1rem 2rem;
          box-sizing: border-box;
        }
        .settings-page-hero {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .settings-page-hero .admin-dashboard-title {
          margin-left: auto;
          margin-right: auto;
        }
        .settings-page-hero .admin-dashboard-subtitle {
          margin-left: auto;
          margin-right: auto;
          max-width: 42ch;
        }
        .settings-field label {
          display: block;
          font-weight: 600;
          font-size: 0.875rem;
          color: #334155;
          margin-bottom: 0.35rem;
        }
        .settings-field input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9375rem;
          color: #0f172a;
          background: #fff;
          box-sizing: border-box;
        }
        .settings-field input:focus {
          outline: none;
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }
      `}</style>
        </div>
    );
}
