import React, { useState, useEffect } from "react";
import { createUser } from "../../api/adminApi";
import "./Modal.css";

export default function AddUserModal({ isOpen, onClose, onUserAdded, roles = [], agencies }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role_ids: [],
        agency_id: "",
    });
    const showAgencySelect = Array.isArray(agencies);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [touched, setTouched] = useState({});

    // Fermer le modal avec la touche Échap
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                handleClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, loading]);

    // Réinitialiser le formulaire à la fermeture
    const handleClose = () => {
        if (!loading) {
            setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
                role_ids: [],
                agency_id: "",
            });
            setErrors({});
            setTouched({});
            setShowPassword(false);
            setShowConfirmPassword(false);
            onClose();
        }
    };

    // Helper pour la validation du mot de passe
    const validatePassword = (password) => {
        const minLength = password.length >= 6;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        // Calculer la force du mot de passe (0-100)
        let strength = 0;
        if (minLength) strength += 20;
        if (hasUpper) strength += 20;
        if (hasLower) strength += 20;
        if (hasNumber) strength += 20;
        if (hasSpecial) strength += 20;
        
        return {
            valid: minLength && hasUpper && hasLower && hasNumber,
            strength,
            minLength,
            hasUpper,
            hasLower,
            hasNumber,
            hasSpecial
        };
    };

    // Obtenir la couleur de la barre de progression
    const getPasswordStrengthColor = (strength) => {
        if (strength <= 40) return '#dc2626';
        if (strength <= 60) return '#f59e0b';
        if (strength <= 80) return '#10b981';
        return '#16a34a';
    };

    // Obtenir le label de force du mot de passe
    const getPasswordStrengthLabel = (strength) => {
        if (strength <= 40) return 'Faible';
        if (strength <= 60) return 'Moyen';
        if (strength <= 80) return 'Bon';
        return 'Excellent';
    };

    // Validation du formulaire
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "Le nom est obligatoire";
        }

        if (!formData.email.trim()) {
            newErrors.email = "L'email est obligatoire";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "L'email n'est pas valide";
        }

        if (!formData.password) {
            newErrors.password = "Le mot de passe est obligatoire";
        } else {
            const passwordValidation = validatePassword(formData.password);
            if (!passwordValidation.valid) {
                newErrors.password = "Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule et un chiffre";
            }
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
        }

        if (formData.role_ids.length === 0) {
            newErrors.role_ids = "Veuillez sélectionner au moins un rôle";
        }

        return newErrors;
    };

    // Gérer la soumission du formulaire
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            // Préparer les données pour l'API
            const userData = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role_ids: formData.role_ids.map(id => parseInt(id)),
            };
            if (showAgencySelect) {
                userData.agency_id =
                    formData.agency_id === "" || formData.agency_id == null
                        ? null
                        : parseInt(formData.agency_id, 10);
            }

            await createUser(userData);
            onUserAdded();
            
            // Reset du formulaire
            setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
                role_ids: [],
                agency_id: "",
            });
            setTouched({});
            setShowPassword(false);
            setShowConfirmPassword(false);
        } catch (error) {
            console.error('Error creating user:', error);
            
            // Gérer les erreurs de validation du backend
            if (error.response?.status === 422) {
                const backendErrors = error.response.data.errors || {};
                const formattedErrors = {};
                
                Object.keys(backendErrors).forEach(field => {
                    formattedErrors[field] = backendErrors[field][0];
                });
                
                setErrors(formattedErrors);
            } else {
                setErrors({ 
                    general: "Erreur lors de la création de l'utilisateur. Veuillez réessayer." 
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // Gérer les changements de champs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // Gérer le blur (quand l'utilisateur quitte le champ)
    const handleBlur = (fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
    };

    // Vérifier si un champ est valide en temps réel
    const isFieldValid = (fieldName) => {
        if (!touched[fieldName]) return null;
        
        switch(fieldName) {
            case 'name':
                return formData.name.trim().length > 0;
            case 'email':
                return /\S+@\S+\.\S+/.test(formData.email);
            case 'password':
                return validatePassword(formData.password).valid;
            case 'confirmPassword':
                return formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
            default:
                return null;
        }
    };

    // Gérer la sélection des rôles
    const handleRoleChange = (roleId) => {
        setFormData(prev => {
            const newRoleIds = prev.role_ids.includes(roleId)
                ? prev.role_ids.filter(id => id !== roleId)
                : [...prev.role_ids, roleId];
            
            return { ...prev, role_ids: newRoleIds };
        });
        
        if (errors.role_ids) {
            setErrors(prev => ({ ...prev, role_ids: "" }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Ajouter un utilisateur</h3>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {errors.general && (
                        <div className="error-message general-error">
                            {errors.general}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="name">Nom complet *</label>
                        <div className={`input-wrapper ${errors.name ? 'error' : ''} ${isFieldValid('name') === true ? 'valid' : ''}`}>
                            <span className="input-icon input-icon--svg" aria-hidden>
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                onBlur={() => handleBlur('name')}
                                placeholder="Entrez le nom complet"
                                autoComplete="name"
                            />
                            {isFieldValid('name') === true && <span className="valid-icon">✓</span>}
                        </div>
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Adresse email *</label>
                        <div className={`input-wrapper ${errors.email ? 'error' : ''} ${isFieldValid('email') === true ? 'valid' : ''}`}>
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={() => handleBlur('email')}
                                placeholder="exemple@domaine.com"
                                autoComplete="email"
                            />
                            {isFieldValid('email') === true && <span className="valid-icon">✓</span>}
                        </div>
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mot de passe *</label>
                        <div className={`input-wrapper ${errors.password ? 'error' : ''} ${isFieldValid('password') === true ? 'valid' : ''}`}>
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={() => handleBlur('password')}
                                placeholder="Minimum 6 caractères"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {formData.password && (
                            <div className="password-strength">
                                {(() => {
                                    const validation = validatePassword(formData.password);
                                    return (
                                        <>
                                            <div className="strength-bar-container">
                                                <div 
                                                    className="strength-bar" 
                                                    style={{
                                                        width: `${validation.strength}%`,
                                                        backgroundColor: getPasswordStrengthColor(validation.strength)
                                                    }}
                                                />
                                            </div>
                                            <div className="strength-label" style={{ color: getPasswordStrengthColor(validation.strength) }}>
                                                Force du mot de passe: {getPasswordStrengthLabel(validation.strength)}
                                            </div>
                                            <div className="strength-indicators">
                                                <div className={`indicator ${validation.minLength ? 'valid' : 'invalid'}`}>
                                                    {validation.minLength ? '✓' : '✗'} 6+ caractères
                                                </div>
                                                <div className={`indicator ${validation.hasUpper ? 'valid' : 'invalid'}`}>
                                                    {validation.hasUpper ? '✓' : '✗'} Majuscule
                                                </div>
                                                <div className={`indicator ${validation.hasLower ? 'valid' : 'invalid'}`}>
                                                    {validation.hasLower ? '✓' : '✗'} Minuscule
                                                </div>
                                                <div className={`indicator ${validation.hasNumber ? 'valid' : 'invalid'}`}>
                                                    {validation.hasNumber ? '✓' : '✗'} Chiffre
                                                </div>
                                                <div className={`indicator ${validation.hasSpecial ? 'valid' : 'bonus'}`}>
                                                    {validation.hasSpecial ? '✓' : '○'} Caractère spécial (bonus)
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
                        <div className={`input-wrapper ${errors.confirmPassword ? 'error' : ''} ${isFieldValid('confirmPassword') === true ? 'valid' : ''}`}>
                            <span className="input-icon">🔒</span>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                onBlur={() => handleBlur('confirmPassword')}
                                placeholder="Répétez le mot de passe"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                            {isFieldValid('confirmPassword') === true && <span className="valid-icon">✓</span>}
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && touched.confirmPassword && (
                            <span className="error-text">Les mots de passe ne correspondent pas</span>
                        )}
                        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                    </div>

                    {showAgencySelect && (
                        <div className="form-group">
                            <label htmlFor="agency_id">Agence (optionnel)</label>
                            <select
                                id="agency_id"
                                name="agency_id"
                                value={formData.agency_id}
                                onChange={handleChange}
                                className={errors.agency_id ? "error" : ""}
                            >
                                <option value="">— Aucune —</option>
                                {agencies.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                        {a.city ? ` (${a.city})` : ""}
                                    </option>
                                ))}
                            </select>
                            {errors.agency_id && (
                                <span className="error-text">{errors.agency_id}</span>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Rôles * <span className="hint">({formData.role_ids.length} sélectionné{formData.role_ids.length > 1 ? 's' : ''})</span></label>
                        <div className="roles-selection">
                            {roles.map(role => (
                                <label key={role.id} className="role-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={formData.role_ids.includes(role.id)}
                                        onChange={() => handleRoleChange(role.id)}
                                    />
                                    <span className="checkmark"></span>
                                    <div className="role-info">
                                        <span className="role-label">
                                            {role.label || role.name}
                                        </span>
                                        {role.name && <span className="role-description">{role.name}</span>}
                                    </div>
                                </label>
                            ))}
                        </div>
                        {errors.role_ids && <span className="error-text">{errors.role_ids}</span>}
                    </div>

                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className="btn-cancel" 
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit" 
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading ? 'Création...' : 'Créer l\'utilisateur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}