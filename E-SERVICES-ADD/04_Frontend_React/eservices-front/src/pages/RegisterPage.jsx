import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import HeaderBrandMark from "../components/brand/HeaderBrandMark";
import LoginPageAtmosphere from "../components/login/LoginPageAtmosphere";
import "./LoginPage.css";
import "./RegisterPage.css";

export default function RegisterPage() {
    const { register, user, loading } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        cin: "",
        password: "",
        passwordConfirmation: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" });
    const [isEmailChecking, setIsEmailChecking] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState(null);

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

        if (name === "password") {
            setPasswordStrength(analyzePasswordStrength(value));
        }

        if (name === "email" && validateEmail(value)) {
            checkEmailAvailability(value);
        }
    };

    const analyzePasswordStrength = (password) => {
        let score = 0;
        const feedback = [];

        if (password.length >= 8) score += 1;
        else feedback.push("Au moins 8 caractères");

        if (/[a-z]/.test(password)) score += 1;
        else feedback.push("Une minuscule");

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push("Une majuscule");

        if (/\d/.test(password)) score += 1;
        else feedback.push("Un chiffre");

        if (/[^a-zA-Z\d]/.test(password)) score += 1;
        else feedback.push("Un caractère spécial");

        const strengths = [
            { text: "Très faible", color: "#ef4444" },
            { text: "Faible", color: "#f97316" },
            { text: "Moyen", color: "#eab308" },
            { text: "Fort", color: "#22c55e" },
            { text: "Très fort", color: "#10b981" },
        ];

        return {
            score,
            strength: strengths[score] || strengths[0],
            feedback: feedback.length > 0 ? `Manque: ${feedback.join(", ")}` : "Excellent mot de passe !",
        };
    };

    const checkEmailAvailability = async (email) => {
        setIsEmailChecking(true);
        setEmailAvailable(null);

        setTimeout(() => {
            const takenEmails = ["admin@example.com", "test@test.com", "user@demo.com"];
            setEmailAvailable(!takenEmails.includes(email.toLowerCase()));
            setIsEmailChecking(false);
        }, 800);
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "Le nom est requis";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Le nom doit contenir au moins 2 caractères";
        } else if (formData.name.trim().length > 50) {
            newErrors.name = "Le nom ne peut pas dépasser 50 caractères";
        } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.name.trim())) {
            newErrors.name = "Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets";
        }

        if (!formData.email.trim()) {
            newErrors.email = "L'email est requis";
        } else if (!validateEmail(formData.email)) {
            newErrors.email = "Format d'email invalide";
        } else if (emailAvailable === false) {
            newErrors.email = "Cette adresse email est déjà utilisée";
        }

        if (!formData.cin.trim()) {
            newErrors.cin = "Le CIN est obligatoire";
        } else if (formData.cin.trim().length < 4) {
            newErrors.cin = "CIN invalide (trop court)";
        } else if (formData.cin.trim().length > 32) {
            newErrors.cin = "CIN trop long";
        }

        if (!formData.password) {
            newErrors.password = "Le mot de passe est requis";
        } else if (passwordStrength.score < 3) {
            newErrors.password = "Le mot de passe doit être plus sécurisé";
        }

        if (!formData.passwordConfirmation) {
            newErrors.passwordConfirmation = "La confirmation est requise";
        } else if (formData.password !== formData.passwordConfirmation) {
            newErrors.passwordConfirmation = "Les mots de passe ne correspondent pas";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const u = await register(
                formData.name,
                formData.email,
                formData.cin.trim(),
                formData.password,
                formData.passwordConfirmation
            );
            if (u?.roles?.includes("client")) {
                navigate("/client/services");
            } else {
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Registration error:", error);

            if (error.response?.status === 422) {
                const validationErrors = error.response.data.errors || {};
                const formattedErrors = {};

                Object.keys(validationErrors).forEach((key) => {
                    formattedErrors[key] = validationErrors[key][0];
                });

                setErrors(formattedErrors);
            } else {
                setErrors({
                    general: error.response?.data?.message || "Erreur lors de la création du compte. Veuillez réessayer.",
                });
            }
        } finally {
            setIsSubmitting(false);
        }
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

    if (user) {
        const isAdmin = user.roles?.includes("admin");
        const isClient = user.roles?.includes("client");
        const target = isAdmin ? "/admin" : isClient ? "/client/services" : "/dashboard";
        return <Navigate to={target} replace />;
    }

    const emailWrapClass = [
        "login-input-wrap",
        errors.email || emailAvailable === false ? "login-input-wrap--error" : "",
        !errors.email && emailAvailable === true ? "login-input-wrap--success" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="login-page">
            <LoginPageAtmosphere />

            <div className="login-page-inner login-page-inner--register">
                <div className="login-card-shell">
                    <div className="login-card-accent" aria-hidden="true" />
                    <div className="login-card">
                        <header className="login-header">
                            <h1 className="login-sr-only">Inscription — E-Services</h1>
                            <div className="login-logo">
                                <HeaderBrandMark placement="sidebar" />
                            </div>
                            <p className="login-subtitle">Créez votre compte</p>
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
                                <label htmlFor="name">Nom complet</label>
                                <div className={`login-input-wrap ${errors.name ? "login-input-wrap--error" : ""}`}>
                                    <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Votre nom complet"
                                        disabled={isSubmitting}
                                        autoComplete="name"
                                        autoFocus
                                        aria-describedby={errors.name ? "name-error" : undefined}
                                        aria-invalid={!!errors.name}
                                    />
                                </div>
                                {errors.name ? (
                                    <span id="name-error" className="login-field-error" role="alert">
                                        {errors.name}
                                    </span>
                                ) : null}
                            </div>

                            <div className="login-field">
                                <label htmlFor="email">Adresse e-mail</label>
                                <div className={`${emailWrapClass} register-input-wrap--email-trail`}>
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
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                        aria-invalid={!!errors.email}
                                    />
                                    {isEmailChecking ? (
                                        <div className="register-email-trail register-email-trail--checking" aria-hidden="true">
                                            <div className="register-checking-spinner" />
                                        </div>
                                    ) : null}
                                    {!isEmailChecking && emailAvailable === true ? (
                                        <div className="register-email-trail register-email-trail--ok" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                        </div>
                                    ) : null}
                                    {!isEmailChecking && emailAvailable === false ? (
                                        <div className="register-email-trail register-email-trail--bad" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                            </svg>
                                        </div>
                                    ) : null}
                                </div>
                                {errors.email ? (
                                    <span id="email-error" className="login-field-error" role="alert">
                                        {errors.email}
                                    </span>
                                ) : null}
                                {!errors.email && emailAvailable === true ? (
                                    <span className="register-field-hint register-field-hint--success" role="status">
                                        Adresse e-mail disponible
                                    </span>
                                ) : null}
                            </div>

                            <div className="login-field">
                                <label htmlFor="cin">CIN (carte d&apos;identité nationale)</label>
                                <div className={`login-input-wrap ${errors.cin ? "login-input-wrap--error" : ""}`}>
                                    <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-4h16v4zm0-6H4V6h16v6z" />
                                    </svg>
                                    <input
                                        id="cin"
                                        name="cin"
                                        type="text"
                                        value={formData.cin}
                                        onChange={handleInputChange}
                                        placeholder="Ex. AB123456"
                                        disabled={isSubmitting}
                                        autoComplete="off"
                                        aria-describedby={errors.cin ? "cin-error" : undefined}
                                        aria-invalid={!!errors.cin}
                                    />
                                </div>
                                {errors.cin ? (
                                    <span id="cin-error" className="login-field-error" role="alert">
                                        {errors.cin}
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
                                        placeholder="Votre mot de passe"
                                        disabled={isSubmitting}
                                        autoComplete="new-password"
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
                                {!errors.password && formData.password ? (
                                    <div className="register-password-strength">
                                        <div className="register-strength-bar">
                                            <div
                                                className="register-strength-fill"
                                                style={{
                                                    width: `${(passwordStrength.score / 5) * 100}%`,
                                                    backgroundColor: passwordStrength.strength?.color,
                                                }}
                                            />
                                        </div>
                                        <div className="register-strength-text">
                                            <span style={{ color: passwordStrength.strength?.color }}>{passwordStrength.strength?.text}</span>
                                            {passwordStrength.score < 4 ? (
                                                <span className="register-strength-tips"> — {passwordStrength.feedback}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="login-field">
                                <label htmlFor="passwordConfirmation">Confirmer le mot de passe</label>
                                <div className={`login-input-wrap register-input-wrap--dual-trail ${errors.passwordConfirmation ? "login-input-wrap--error" : ""}`}>
                                    <svg className="login-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                    </svg>
                                    <input
                                        id="passwordConfirmation"
                                        name="passwordConfirmation"
                                        type={showPasswordConfirmation ? "text" : "password"}
                                        value={formData.passwordConfirmation}
                                        onChange={handleInputChange}
                                        placeholder="Confirmez votre mot de passe"
                                        disabled={isSubmitting}
                                        autoComplete="new-password"
                                        aria-describedby={errors.passwordConfirmation ? "password-confirmation-error" : undefined}
                                        aria-invalid={!!errors.passwordConfirmation}
                                    />
                                    <div className="register-input-trails">
                                        {formData.passwordConfirmation && formData.password ? (
                                            <div
                                                className={
                                                    formData.password === formData.passwordConfirmation
                                                        ? "register-match register-match--ok"
                                                        : "register-match register-match--bad"
                                                }
                                                aria-hidden="true"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                    {formData.password === formData.passwordConfirmation ? (
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    ) : (
                                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                    )}
                                                </svg>
                                            </div>
                                        ) : null}
                                        <button
                                            type="button"
                                            className="login-password-toggle register-password-toggle--inline"
                                            onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                            disabled={isSubmitting}
                                            aria-label={showPasswordConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                {showPasswordConfirmation ? (
                                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                                ) : (
                                                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                {errors.passwordConfirmation ? (
                                    <span id="password-confirmation-error" className="login-field-error" role="alert">
                                        {errors.passwordConfirmation}
                                    </span>
                                ) : null}
                            </div>

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={isSubmitting || emailAvailable === false || (formData.password && passwordStrength.score < 3)}
                                id="register-status"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="login-submit-spinner" aria-hidden="true" />
                                        <span>Création du compte…</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H2v2h2v2h2v-2h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                        <span>Créer mon compte</span>
                                    </>
                                )}
                            </button>

                            {formData.password && passwordStrength.score < 3 ? (
                                <div className="register-password-tips">
                                    <div className="register-tips-header">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                        Conseils pour un mot de passe sécurisé
                                    </div>
                                    <ul className="register-tips-list">
                                        <li className={formData.password.length >= 8 ? "register-tips-list__done" : ""}>Au moins 8 caractères</li>
                                        <li className={/[a-z]/.test(formData.password) ? "register-tips-list__done" : ""}>Une lettre minuscule</li>
                                        <li className={/[A-Z]/.test(formData.password) ? "register-tips-list__done" : ""}>Une lettre majuscule</li>
                                        <li className={/\d/.test(formData.password) ? "register-tips-list__done" : ""}>Un chiffre</li>
                                        <li className={/[^a-zA-Z\d]/.test(formData.password) ? "register-tips-list__done" : ""}>
                                            Un caractère spécial (@, #, $, etc.)
                                        </li>
                                    </ul>
                                </div>
                            ) : null}
                        </form>

                        <footer className="login-footer">
                            <p className="login-footer-line">
                                Vous avez déjà un compte ?
                                <Link to="/login" className="login-footer-link login-footer-link--inline">
                                    Se connecter
                                </Link>
                            </p>
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
