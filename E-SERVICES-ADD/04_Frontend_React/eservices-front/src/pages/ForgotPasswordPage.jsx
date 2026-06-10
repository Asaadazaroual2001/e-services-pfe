import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import HeaderBrandMark from "../components/brand/HeaderBrandMark";
import LoginPageAtmosphere from "../components/login/LoginPageAtmosphere";
import { requestPasswordResetCode, resetPasswordWithCode } from "../api/passwordReset";
import "./LoginPage.css";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
    const { user, loading } = useAuth();

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [infoMessage, setInfoMessage] = useState("");
    const [done, setDone] = useState(false);

    const clearFieldError = (name) => {
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validateEmailStep = () => {
        const next = {};
        if (!email.trim()) {
            next.email = "L'adresse e-mail est requise";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            next.email = "Adresse e-mail invalide";
        }
        return next;
    };

    const validateResetStep = () => {
        const next = {};
        const digits = code.replace(/\D/g, "");
        if (digits.length !== 6) {
            next.code = "Saisissez le code à 6 chiffres reçu par e-mail";
        }
        if (!password) {
            next.password = "Le mot de passe est requis";
        } else if (password.length < 6) {
            next.password = "Au moins 6 caractères";
        }
        if (!passwordConfirmation) {
            next.passwordConfirmation = "Confirmez le mot de passe";
        } else if (password !== passwordConfirmation) {
            next.passwordConfirmation = "Les mots de passe ne correspondent pas";
        }
        return next;
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setErrors({});
        setInfoMessage("");
        const v = validateEmailStep();
        if (Object.keys(v).length) {
            setErrors(v);
            return;
        }
        setIsSubmitting(true);
        try {
            const data = await requestPasswordResetCode(email.trim());
            setInfoMessage(data?.message || "");
            setStep(2);
        } catch (err) {
            const msg = err.response?.data?.message;
            const fieldErrors = err.response?.data?.errors;
            if (fieldErrors?.email) {
                setErrors({ email: fieldErrors.email[0] });
            } else {
                setErrors({ general: msg || "Impossible d’envoyer le code. Réessayez." });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        setErrors({});
        setInfoMessage("");
        setIsSubmitting(true);
        try {
            const data = await requestPasswordResetCode(email.trim());
            setInfoMessage(data?.message || "Code renvoyé.");
        } catch (err) {
            setErrors({
                general: err.response?.data?.message || "Impossible de renvoyer le code.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setErrors({});
        setInfoMessage("");
        const v = validateResetStep();
        if (Object.keys(v).length) {
            setErrors(v);
            return;
        }
        setIsSubmitting(true);
        try {
            await resetPasswordWithCode({
                email: email.trim(),
                code: code.replace(/\D/g, ""),
                password,
                password_confirmation: passwordConfirmation,
            });
            setDone(true);
        } catch (err) {
            if (err.response?.status === 422) {
                const fieldErrors = err.response?.data?.errors || {};
                const mapped = {};
                if (fieldErrors.email) mapped.email = fieldErrors.email[0];
                if (fieldErrors.code) mapped.code = fieldErrors.code[0];
                if (fieldErrors.password) mapped.password = fieldErrors.password[0];
                if (fieldErrors.password_confirmation) {
                    mapped.passwordConfirmation = fieldErrors.password_confirmation[0];
                }
                if (Object.keys(mapped).length) {
                    setErrors(mapped);
                } else {
                    setErrors({
                        general: err.response?.data?.message || "Vérifiez les informations saisies.",
                    });
                }
            } else {
                setErrors({
                    general: err.response?.data?.message || "Échec de la réinitialisation. Réessayez.",
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="login-page login-page--centered">
                <LoginPageAtmosphere />
                <div className="login-loading">
                    <div className="login-loading-spinner" />
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="login-page">
            <LoginPageAtmosphere />

            <div className="login-page-inner login-page-inner--forgot">
                <div className="login-card-shell">
                    <div className="login-card-accent" aria-hidden="true" />
                    <div className="login-card">
                        <header className="login-header">
                            <h1 className="login-sr-only">Mot de passe oublié — E-Services</h1>
                            <div className="login-logo">
                                <HeaderBrandMark placement="sidebar" />
                            </div>
                            <p className="login-subtitle">
                                {done
                                    ? "Mot de passe mis à jour"
                                    : step === 1
                                      ? "Indiquez votre e-mail pour recevoir un code"
                                      : "Saisissez le code reçu puis votre nouveau mot de passe"}
                            </p>
                        </header>

                        {errors.general ? (
                            <div className="login-error-banner" role="alert">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                                {errors.general}
                            </div>
                        ) : null}

                        {done ? (
                            <div className="forgot-done">
                                <p className="forgot-done-text">
                                    Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                                </p>
                                <Link to="/login" className="login-submit forgot-done-link">
                                    Se connecter
                                </Link>
                            </div>
                        ) : step === 1 ? (
                            <form onSubmit={handleSendCode} className="login-form" noValidate>
                                <div className="login-field">
                                    <label htmlFor="forgot-email">Adresse e-mail</label>
                                    <div className={`login-input-wrap ${errors.email ? "login-input-wrap--error" : ""}`}>
                                        <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                        </svg>
                                        <input
                                            id="forgot-email"
                                            name="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                clearFieldError("email");
                                            }}
                                            placeholder="vous@exemple.com"
                                            disabled={isSubmitting}
                                            autoComplete="email"
                                            autoFocus
                                            aria-describedby={errors.email ? "forgot-email-error" : undefined}
                                            aria-invalid={!!errors.email}
                                        />
                                    </div>
                                    {errors.email ? (
                                        <span id="forgot-email-error" className="login-field-error" role="alert">
                                            {errors.email}
                                        </span>
                                    ) : null}
                                </div>

                                <button type="submit" className="login-submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <span className="login-submit-spinner" aria-hidden="true" />
                                            <span>Envoi en cours…</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                            </svg>
                                            <span>Envoyer le code</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleReset} className="login-form" noValidate>
                                {infoMessage ? (
                                    <p className="forgot-info-banner" role="status">
                                        {infoMessage}
                                    </p>
                                ) : null}

                                <div className="login-field">
                                    <label htmlFor="forgot-code">Code reçu par e-mail</label>
                                    <div className={`login-input-wrap ${errors.code ? "login-input-wrap--error" : ""}`}>
                                        <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                                        </svg>
                                        <input
                                            id="forgot-code"
                                            name="code"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            value={code}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                                                setCode(v);
                                                clearFieldError("code");
                                            }}
                                            placeholder="000000"
                                            disabled={isSubmitting}
                                            aria-describedby={errors.code ? "forgot-code-error" : undefined}
                                            aria-invalid={!!errors.code}
                                        />
                                    </div>
                                    {errors.code ? (
                                        <span id="forgot-code-error" className="login-field-error" role="alert">
                                            {errors.code}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="login-field">
                                    <label htmlFor="forgot-password">Nouveau mot de passe</label>
                                    <div className={`login-input-wrap ${errors.password ? "login-input-wrap--error" : ""}`}>
                                        <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 1.99-.9 1.99-2L20 10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                        </svg>
                                        <input
                                            id="forgot-password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                clearFieldError("password");
                                            }}
                                            placeholder="••••••••"
                                            disabled={isSubmitting}
                                            autoComplete="new-password"
                                            aria-describedby={errors.password ? "forgot-password-error" : undefined}
                                            aria-invalid={!!errors.password}
                                        />
                                        <button
                                            type="button"
                                            className="login-password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                            disabled={isSubmitting}
                                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                {showPassword ? (
                                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                                ) : (
                                                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                    {errors.password ? (
                                        <span id="forgot-password-error" className="login-field-error" role="alert">
                                            {errors.password}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="login-field">
                                    <label htmlFor="forgot-password-2">Confirmer le mot de passe</label>
                                    <div className={`login-input-wrap ${errors.passwordConfirmation ? "login-input-wrap--error" : ""}`}>
                                        <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                        </svg>
                                        <input
                                            id="forgot-password-2"
                                            name="passwordConfirmation"
                                            type={showPassword2 ? "text" : "password"}
                                            value={passwordConfirmation}
                                            onChange={(e) => {
                                                setPasswordConfirmation(e.target.value);
                                                clearFieldError("passwordConfirmation");
                                            }}
                                            placeholder="••••••••"
                                            disabled={isSubmitting}
                                            autoComplete="new-password"
                                            aria-describedby={errors.passwordConfirmation ? "forgot-password-2-error" : undefined}
                                            aria-invalid={!!errors.passwordConfirmation}
                                        />
                                        <button
                                            type="button"
                                            className="login-password-toggle"
                                            onClick={() => setShowPassword2(!showPassword2)}
                                            disabled={isSubmitting}
                                            aria-label={showPassword2 ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                {showPassword2 ? (
                                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                                ) : (
                                                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                    {errors.passwordConfirmation ? (
                                        <span id="forgot-password-2-error" className="login-field-error" role="alert">
                                            {errors.passwordConfirmation}
                                        </span>
                                    ) : null}
                                </div>

                                <button type="submit" className="login-submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <span className="login-submit-spinner" aria-hidden="true" />
                                            <span>Enregistrement…</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                            <span>Réinitialiser le mot de passe</span>
                                        </>
                                    )}
                                </button>

                                <div className="forgot-secondary-actions">
                                    <button
                                        type="button"
                                        className="forgot-text-btn"
                                        onClick={handleResendCode}
                                        disabled={isSubmitting}
                                    >
                                        Renvoyer le code
                                    </button>
                                    <button
                                        type="button"
                                        className="forgot-text-btn"
                                        onClick={() => {
                                            setStep(1);
                                            setCode("");
                                            setPassword("");
                                            setPasswordConfirmation("");
                                            setErrors({});
                                            setInfoMessage("");
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        Modifier l’e-mail
                                    </button>
                                </div>
                            </form>
                        )}

                        {!done ? (
                            <footer className="login-footer">
                                <p className="login-footer-line">
                                    <Link to="/login" className="login-footer-link">
                                        Retour à la connexion
                                    </Link>
                                </p>
                                <p className="login-footer-line login-footer-line--spaced">
                                    <Link to="/contact" className="login-footer-link login-footer-link--muted">
                                        Nous contacter
                                    </Link>
                                </p>
                            </footer>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
