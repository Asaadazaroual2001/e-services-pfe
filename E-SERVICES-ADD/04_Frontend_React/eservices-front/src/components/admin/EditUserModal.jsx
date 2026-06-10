import React, { useState, useEffect } from "react";
import { updateUser } from "../../api/adminApi";
import "./Modal.css";

export default function EditUserModal({ isOpen, user, roles = [], agencies, onClose, onUserUpdated }) {
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

    // Initialiser le formulaire avec les données utilisateur
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                password: "",
                confirmPassword: "",
                role_ids: user.roles?.map((role) => role.id) || [],
                agency_id:
                    user.agency_id != null && user.agency_id !== ""
                        ? String(user.agency_id)
                        : "",
            });
        }
    }, [user]);

    // Helper pour la validation du mot de passe
    const validatePassword = (password) => {
        if (!password) return { valid: true }; // Password is optional for updates
        
        const minLength = password.length >= 6;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        return {
            valid: minLength && hasUpper && hasLower && hasNumber,
            minLength,
            hasUpper,
            hasLower,
            hasNumber
        };
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

        // Validate password only if provided
        if (formData.password) {
            const passwordValidation = validatePassword(formData.password);
            if (!passwordValidation.valid) {
                newErrors.password = "Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule et un chiffre";
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
            }
        } else if (formData.confirmPassword) {
            newErrors.confirmPassword = "Veuillez d'abord saisir un nouveau mot de passe";
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
                role_ids: formData.role_ids.map((id) => parseInt(id, 10)),
            };

            // Add password only if provided
            if (formData.password) {
                userData.password = formData.password;
            }
            if (showAgencySelect) {
                userData.agency_id =
                    formData.agency_id === "" || formData.agency_id == null
                        ? null
                        : parseInt(formData.agency_id, 10);
            }

            await updateUser(user.id, userData);
            onUserUpdated();
        } catch (error) {
            console.error('Error updating user:', error);
            
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
                    general: "Erreur lors de la mise à jour de l'utilisateur. Veuillez réessayer." 
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

    if (!isOpen || !user) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Modifier l'utilisateur</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {errors.general && (
                        <div className="error-message general-error">
                            {errors.general}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="edit-name">Nom complet *</label>
                        <input
                            type="text"
                            id="edit-name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={errors.name ? 'error' : ''}
                            placeholder="Entrez le nom complet"
                        />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-email">Adresse email *</label>
                        <input
                            type="email"
                            id="edit-email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={errors.email ? 'error' : ''}
                            placeholder="exemple@domaine.com"
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-password">Nouveau mot de passe (optionnel)</label>
                        <input
                            type="password"
                            id="edit-password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={errors.password ? 'error' : ''}
                            placeholder="Laissez vide pour conserver l'ancien"
                        />
                        {formData.password && (
                            <div className="password-strength">
                                {(() => {
                                    const validation = validatePassword(formData.password);
                                    return (
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
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-confirmPassword">Confirmer le nouveau mot de passe</label>
                        <input
                            type="password"
                            id="edit-confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={errors.confirmPassword ? 'error' : ''}
                            placeholder="Répétez le nouveau mot de passe"
                        />
                        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                    </div>

                    {showAgencySelect && (
                        <div className="form-group">
                            <label htmlFor="edit-agency_id">Agence (optionnel)</label>
                            <select
                                id="edit-agency_id"
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
                        <label>Rôles *</label>
                        <div className="roles-selection">
                            {roles.map(role => (
                                <label key={role.id} className="role-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={formData.role_ids.includes(role.id)}
                                        onChange={() => handleRoleChange(role.id)}
                                    />
                                    <span className="checkmark"></span>
                                    <span className="role-label">
                                        {role.label || role.name}
                                        {role.name && <small> ({role.name})</small>}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {errors.role_ids && <span className="error-text">{errors.role_ids}</span>}
                    </div>

                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className="btn-cancel" 
                            onClick={onClose}
                            disabled={loading}
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit" 
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading ? 'Mise à jour...' : 'Mettre à jour'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}