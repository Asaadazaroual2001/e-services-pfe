import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { updateClientProfile } from "../../api/clientProfileApi";
import "./ClientLayout.css";

function formatApiErrors(err) {
  const d = err.response?.data;
  if (d?.errors && typeof d.errors === "object") {
    return Object.values(d.errors)
      .flat()
      .filter(Boolean)
      .join(" ");
  }
  return typeof d?.message === "string" ? d.message : "Erreur.";
}

export default function ClientProfile() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
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
        setError("La confirmation ne correspond pas.");
        return;
      }
    }

    setSaving(true);
    try {
      await updateClientProfile({
        name: name.trim(),
        email: email.trim(),
        cin: cin.trim(),
        current_password: currentPassword || undefined,
        password: password || undefined,
        password_confirmation: passwordConfirmation || undefined,
      });
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      await refresh();
      setOk("Profil enregistré.");
    } catch (err) {
      setError(formatApiErrors(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="client-content-inner" style={{ maxWidth: 520, margin: "0 auto" }}>
      <button type="button" className="btn-back" onClick={() => navigate("/client/services")} style={{ marginBottom: 16 }}>
        ← Retour
      </button>
      <h2>Mon profil</h2>
      <p style={{ color: "#64748b", fontSize: 14 }}>
        Le <strong>nom</strong>, l’<strong>e-mail</strong> et le <strong>CIN</strong> sont obligatoires pour soumettre une demande.
      </p>
      {ok ? <p style={{ color: "#166534" }}>{ok}</p> : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, marginTop: 16 }}>
        <div>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>E-mail *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            autoComplete="email"
          />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Nom complet *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            autoComplete="name"
          />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>CIN *</label>
          <input
            required
            value={cin}
            onChange={(e) => setCin(e.target.value)}
            placeholder="Numéro de la carte d'identité nationale"
            style={{ width: "100%", padding: 10 }}
            maxLength={32}
          />
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Mot de passe : laissez vide pour ne pas le modifier. Sinon, indiquez l&apos;ancien et le nouveau (8 caractères
          min.).
        </p>
        <div>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Mot de passe actuel</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Nouveau mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Confirmer le mot de passe</label>
          <input
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn-submit-comment" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
