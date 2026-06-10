import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isEmailJsConfigured, loadEmailJsConfigFromApi, sendEmailJsTemplate } from "../services/emailJs";
import HeaderBrandMark from "../components/brand/HeaderBrandMark";
import LoginPageAtmosphere from "../components/login/LoginPageAtmosphere";
import "./LoginPage.css";

/**
 * Page publique « Contact » : envoi via EmailJS (clés Vite et/ou chargées depuis Laravel).
 * Variables modèle conseillées dans EmailJS : user_name, user_email, message
 */
export default function ContactPage() {
    const [form, setForm] = useState({ user_name: "", user_email: "", message: "" });
    const [status, setStatus] = useState({ type: "", text: "" });
    const [sending, setSending] = useState(false);
    const [configured, setConfigured] = useState(() => isEmailJsConfigured());
    const [configLoading, setConfigLoading] = useState(() => !isEmailJsConfigured());

    useEffect(() => {
        if (isEmailJsConfigured()) {
            setConfigured(true);
            setConfigLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            const ok = await loadEmailJsConfigFromApi();
            if (cancelled) {
                return;
            }
            setConfigured(ok);
            setConfigLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: "", text: "" });
        if (!isEmailJsConfigured()) {
            const ok = await loadEmailJsConfigFromApi();
            setConfigured(ok);
        }
        if (!isEmailJsConfigured()) {
            setStatus({
                type: "error",
                text: "EmailJS n’est pas configuré. Remplissez EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID et EMAILJS_PUBLIC_KEY dans le .env Laravel (ou les VITE_EMAILJS_* du frontend .env), puis redémarrez l’API / npm run dev.",
            });
            return;
        }
        setSending(true);
        try {
            await sendEmailJsTemplate({
                user_name: form.user_name.trim(),
                user_email: form.user_email.trim(),
                message: form.message.trim(),
            });
            setStatus({ type: "ok", text: "Message envoyé. Nous vous répondrons bientôt." });
            setForm({ user_name: "", user_email: "", message: "" });
        } catch (err) {
            setStatus({
                type: "error",
                text: err?.message || "Échec de l’envoi. Vérifiez le modèle EmailJS et les autorisations du service.",
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="login-page">
            <LoginPageAtmosphere />

            <div className="login-page-inner">
                <div className="login-card-shell">
                    <div className="login-card-accent" aria-hidden="true" />
                    <div className="login-card">
                        <header className="login-header">
                            <h1 className="login-sr-only">Contact — E-Services</h1>
                            <div className="login-logo">
                                <HeaderBrandMark placement="sidebar" />
                            </div>
                            <p className="login-subtitle">
                                Écrivez-nous (envoi via{" "}
                                <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer">
                                    EmailJS
                                </a>
                                ).
                            </p>
                        </header>

                        {configLoading ? (
                            <div className="login-subtitle" style={{ textAlign: "center", marginBottom: "1rem" }}>
                                Vérification de la configuration…
                            </div>
                        ) : null}
                        {!configLoading && !configured ? (
                            <div className="login-error-banner" role="status">
                                <span>
                                    Mode non configuré : remplissez{" "}
                                    <code style={{ fontSize: "0.85em" }}>EMAILJS_SERVICE_ID</code>,{" "}
                                    <code style={{ fontSize: "0.85em" }}>EMAILJS_TEMPLATE_ID</code> et{" "}
                                    <code style={{ fontSize: "0.85em" }}>EMAILJS_PUBLIC_KEY</code> dans le{" "}
                                    <code style={{ fontSize: "0.85em" }}>.env</code> Laravel, ou{" "}
                                    <code style={{ fontSize: "0.85em" }}>VITE_EMAILJS_*</code> dans{" "}
                                    <code style={{ fontSize: "0.85em" }}>eservices-front/.env</code>, puis redémarrez
                                    l’API et <code style={{ fontSize: "0.85em" }}>npm run dev</code>.
                                </span>
                            </div>
                        ) : null}

                        {status.text ? (
                            <div
                                className={status.type === "ok" ? "login-contact-success" : "login-error-banner"}
                                role="status"
                            >
                                {status.text}
                            </div>
                        ) : null}

                        <form className="login-form" onSubmit={handleSubmit} noValidate>
                            <div className="login-field">
                                <label htmlFor="user_name">Nom</label>
                                <div className="login-input-wrap">
                                    <input
                                        id="user_name"
                                        name="user_name"
                                        type="text"
                                        required
                                        value={form.user_name}
                                        onChange={(e) => setForm((p) => ({ ...p, user_name: e.target.value }))}
                                        disabled={sending}
                                        autoComplete="name"
                                        style={{ paddingLeft: "0.9rem" }}
                                    />
                                </div>
                            </div>
                            <div className="login-field">
                                <label htmlFor="user_email">E-mail</label>
                                <div className="login-input-wrap">
                                    <input
                                        id="user_email"
                                        name="user_email"
                                        type="email"
                                        required
                                        value={form.user_email}
                                        onChange={(e) => setForm((p) => ({ ...p, user_email: e.target.value }))}
                                        disabled={sending}
                                        autoComplete="email"
                                        style={{ paddingLeft: "0.9rem" }}
                                    />
                                </div>
                            </div>
                            <div className="login-field">
                                <label htmlFor="message">Message</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    className="login-textarea"
                                    required
                                    rows={5}
                                    value={form.message}
                                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                                    disabled={sending}
                                />
                            </div>
                            <button type="submit" className="login-submit" disabled={sending}>
                                {sending ? (
                                    <>
                                        <span className="login-submit-spinner" aria-hidden="true" />
                                        <span>Envoi…</span>
                                    </>
                                ) : (
                                    <span>Envoyer</span>
                                )}
                            </button>
                        </form>

                        <footer className="login-footer">
                            <p className="login-footer-line">
                                <Link to="/login" className="login-footer-link">
                                    Retour à la connexion
                                </Link>
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}
