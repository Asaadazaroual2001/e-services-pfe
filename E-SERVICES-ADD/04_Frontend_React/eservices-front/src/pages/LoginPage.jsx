import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getAdminDashboardSummary } from "../api/adminApi";
import {
    normalizeRolesFromMe,
    isStaffPortalRole,
    formatStaffRolesForWelcome,
    formatWelcomeAgencyLine,
    formatUnviewedStaffDemandesLine,
} from "../utils/staffPostLoginWelcome";
import HeaderBrandMark from "../components/brand/HeaderBrandMark";
import LoginPageAtmosphere from "../components/login/LoginPageAtmosphere";
import "./LoginPage.css";

const REMEMBER_PREF_KEY = "eservices_login_remember";

function readRememberPreference() {
    try {
        return localStorage.getItem(REMEMBER_PREF_KEY) === "1";
    } catch {
        return false;
    }
}

function writeRememberPreference(checked) {
    try {
        localStorage.setItem(REMEMBER_PREF_KEY, checked ? "1" : "0");
    } catch {
        /* ignore */
    }
}

export default function LoginPage() {
    const { login, user, loading, setStaffWelcome } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(readRememberPreference);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const handleRememberChange = (checked) => {
        setRememberMe(checked);
        writeRememberPreference(checked);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email) {
            newErrors.email = "L'adresse email est requise";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Veuillez entrer une adresse email valide";
        }

        if (!formData.password) {
            newErrors.password = "Le mot de passe est requis";
        } else if (formData.password.length < 6) {
            newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        if (isSubmitting) {
            return;
        }

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const loggedInUser = await login(formData.email, formData.password, rememberMe);

            const roles = normalizeRolesFromMe(loggedInUser);
            const isAdmin = roles.includes("admin");
            const isAgent = roles.includes("agent");
            const isResponsable = roles.includes("responsable");
            const isStaffPortal = isStaffPortalRole(roles);
            const isLegacyEmployee = ["director", "reception"].some((r) => roles.includes(r));
            const isClient = roles.includes("client");

            const target = isStaffPortal
                ? "/admin/dashboard"
                : isLegacyEmployee
                  ? "/employee/dashboard"
                  : isClient
                    ? "/client/services"
                    : "/dashboard";

            if (isStaffPortal) {
                const displayName = (loggedInUser.name || "Utilisateur").trim();
                const roleText = formatStaffRolesForWelcome(roles);
                let messageBody = [
                    `Bienvenue, ${displayName} !`,
                    "",
                    formatWelcomeAgencyLine(null),
                    "",
                    `Rôle : ${roleText}`,
                    "",
                    "Impossible de charger le nombre de demandes pour le moment.",
                ].join("\n");
                let showUnviewedListCta = false;
                try {
                    const summaryRes = await getAdminDashboardSummary();
                    const d = summaryRes?.data;
                    const unviewed = Number(d?.requests_unviewed_by_staff ?? 0);
                    const demandesLine = formatUnviewedStaffDemandesLine(unviewed);
                    messageBody = [
                        `Bienvenue, ${displayName} !`,
                        "",
                        formatWelcomeAgencyLine(d),
                        "",
                        `Rôle : ${roleText}`,
                        "",
                        demandesLine,
                    ].join("\n");
                    showUnviewedListCta = true;
                } catch {
                    /* messageBody et showUnviewedListCta inchangés */
                }
                setStaffWelcome({ message: messageBody, showUnviewedListCta });
            }

            navigate(target, { replace: true });
        } catch (error) {
            let errorMessage = "Échec de la connexion. Veuillez réessayer.";

            if (error.response?.status === 419) {
                errorMessage = "Session expirée. Veuillez actualiser la page et réessayer.";
            } else if (error.response?.status === 422) {
                errorMessage = "Email ou mot de passe incorrect.";
            } else if (error.response?.status === 429) {
                errorMessage = "Trop de tentatives de connexion. Veuillez réessayer plus tard.";
            } else if (error.response?.status === 500) {
                errorMessage = "Erreur du serveur. Veuillez contacter le support.";
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            setErrors({ general: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!loading && user) {
        const isAdmin = user.roles?.includes("admin");
        const isResponsable = user.roles?.includes("responsable");
        const isAgent = user.roles?.includes("agent");
        const legacyEmployeeRoles = ["director", "reception"];
        const isLegacyEmployee = legacyEmployeeRoles.some((r) => user.roles?.includes(r));
        const isClient = user.roles?.includes("client");

        const isStaffAdmin = isAdmin || isResponsable || isAgent;
        const target = isStaffAdmin
            ? "/admin"
            : isLegacyEmployee
              ? "/employee/dashboard"
              : isClient
                ? "/client/services"
                : "/dashboard";

        return <Navigate to={target} replace />;
    }

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

    return (
        <div className="login-page">
            <LoginPageAtmosphere />

            <div className="login-page-inner">
                <div className="login-card-shell">
                    <div className="login-card-accent" aria-hidden="true" />
                    <div className="login-card">
                        <header className="login-header">
                            <h1 className="login-sr-only">Connexion — E-Services</h1>
                            <div className="login-logo">
                                <HeaderBrandMark placement="sidebar" />
                            </div>
                            <p className="login-subtitle">Connectez-vous à votre compte</p>
                        </header>

                        {errors.general ? (
                            <div className="login-error-banner" role="alert">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                                {errors.general}
                            </div>
                        ) : null}

                        <form onSubmit={handleSubmit} className="login-form" noValidate>
                            <div className="login-field">
                                <label htmlFor="email">Adresse e-mail</label>
                                <div className={`login-input-wrap ${errors.email ? "login-input-wrap--error" : ""}`}>
                                    <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                    </svg>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="vous@exemple.com"
                                        disabled={isSubmitting}
                                        autoComplete="email"
                                        autoFocus
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                        aria-invalid={!!errors.email}
                                    />
                                </div>
                                {errors.email ? (
                                    <span id="email-error" className="login-field-error" role="alert">
                                        {errors.email}
                                    </span>
                                ) : null}
                            </div>

                            <div className="login-field">
                                <label htmlFor="password">Mot de passe</label>
                                <div className={`login-input-wrap ${errors.password ? "login-input-wrap--error" : ""}`}>
                                    <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 1.99-.9 1.99-2L20 10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                    </svg>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="••••••••"
                                        disabled={isSubmitting}
                                        autoComplete="current-password"
                                        aria-describedby={errors.password ? "password-error" : undefined}
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
                                    <span id="password-error" className="login-field-error" role="alert">
                                        {errors.password}
                                    </span>
                                ) : null}
                            </div>

                            <div className="login-options">
                                <label className="login-checkbox" htmlFor="remember-me">
                                    <input
                                        id="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => handleRememberChange(e.target.checked)}
                                        disabled={isSubmitting}
                                    />
                                    <span className="login-checkbox-ui" aria-hidden="true" />
                                    <span className="login-checkbox-label">Se souvenir de moi</span>
                                </label>
                            </div>

                            <button type="submit" className="login-submit" disabled={isSubmitting} id="login-status">
                                {isSubmitting ? (
                                    <>
                                        <span className="login-submit-spinner" aria-hidden="true" />
                                        <span>Connexion en cours…</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M10 17l5-5-5-5v10z" />
                                        </svg>
                                        <span>Se connecter</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <footer className="login-footer">
                            <p className="login-footer-line">
                                Pas encore de compte ?
                                <Link to="/register" className="login-footer-link login-footer-link--inline">
                                    Créer un compte
                                </Link>
                            </p>
                            <Link to="/forgot-password" className="login-footer-link login-footer-link--muted">
                                Mot de passe oublié ?
                            </Link>
                            <p className="login-footer-line login-footer-line--spaced">
                                <Link to="/contact" className="login-footer-link">
                                    Nous contacter
                                </Link>
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}
