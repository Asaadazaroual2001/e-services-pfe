// hooks/useLoginForm.js - Hook personnalisé pour la logique du formulaire de login
import { useState } from "react";

export const useLoginForm = () => {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear specific field error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Email validation
        if (!formData.email) {
            newErrors.email = "L'adresse email est requise";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Veuillez entrer une adresse email valide";
        }
        
        // Password validation
        if (!formData.password) {
            newErrors.password = "Le mot de passe est requis";
        } else if (formData.password.length < 6) {
            newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
        }
        
        return newErrors;
    };

    const clearErrors = () => {
        setErrors({});
    };

    const setGeneralError = (message) => {
        setErrors({ general: message });
    };

    const resetForm = () => {
        setFormData({ email: "", password: "" });
        setErrors({});
        setIsSubmitting(false);
    };

    return {
        formData,
        errors,
        isSubmitting,
        setIsSubmitting,
        handleInputChange,
        validateForm,
        clearErrors,
        setGeneralError,
        resetForm
    };
};