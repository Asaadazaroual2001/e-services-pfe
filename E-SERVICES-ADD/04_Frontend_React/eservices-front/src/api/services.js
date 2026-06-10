import axiosClient from './axiosClient';

/**
 * API functions pour la gestion des services (Admin)
 */

// ==================== SERVICES ====================

/**
 * Récupérer la liste des services avec recherche et filtres
 * @param {Object} params - { search, is_active, per_page, page }
 */
export const listServices = async (params = {}) => {
    try {
        const response = await axiosClient.get('/api/admin/services', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching services:', error);
        throw error;
    }
};

/**
 * Créer un nouveau service
 * @param {Object} serviceData - { name, description, is_active }
 */
export const createService = async (serviceData) => {
    try {
        const response = await axiosClient.post('/api/admin/services', serviceData);
        return response.data;
    } catch (error) {
        console.error('Error creating service:', error);
        throw error;
    }
};

/**
 * Récupérer les détails d'un service avec ses champs
 * @param {number} serviceId
 */
export const getService = async (serviceId) => {
    try {
        const response = await axiosClient.get(`/api/admin/services/${serviceId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching service:', error);
        throw error;
    }
};

/**
 * Mettre à jour un service
 * @param {number} serviceId
 * @param {Object} serviceData - { name, description, is_active }
 */
export const updateService = async (serviceId, serviceData) => {
    try {
        const response = await axiosClient.put(`/api/admin/services/${serviceId}`, serviceData);
        return response.data;
    } catch (error) {
        console.error('Error updating service:', error);
        throw error;
    }
};

/**
 * Supprimer un service
 * @param {number} serviceId
 */
export const deleteService = async (serviceId) => {
    try {
        const response = await axiosClient.delete(`/api/admin/services/${serviceId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting service:', error);
        throw error;
    }
};

/**
 * Basculer le statut actif/inactif d'un service
 * @param {number} serviceId
 */
export const toggleServiceActive = async (serviceId) => {
    try {
        const response = await axiosClient.patch(`/api/admin/services/${serviceId}/toggle-active`);
        return response.data;
    } catch (error) {
        console.error('Error toggling service status:', error);
        throw error;
    }
};

// ==================== SERVICE FIELDS ====================

/**
 * Récupérer la liste des champs d'un service
 * @param {number} serviceId
 */
export const listFields = async (serviceId) => {
    try {
        const response = await axiosClient.get(`/api/admin/services/${serviceId}/fields`);
        return response.data;
    } catch (error) {
        console.error('Error fetching service fields:', error);
        throw error;
    }
};

/**
 * Créer un nouveau champ pour un service
 * @param {Object} fieldData - { service_id, key, label, type, required, options_json, order }
 */
export const createField = async (fieldData) => {
    try {
        const response = await axiosClient.post('/api/admin/service-fields', fieldData);
        return response.data;
    } catch (error) {
        console.error('Error creating field:', error);
        throw error;
    }
};

/**
 * Mettre à jour un champ
 * @param {number} fieldId
 * @param {Object} fieldData - { key, label, type, required, options_json, order }
 */
export const updateField = async (fieldId, fieldData) => {
    try {
        const response = await axiosClient.put(`/api/admin/service-fields/${fieldId}`, fieldData);
        return response.data;
    } catch (error) {
        console.error('Error updating field:', error);
        throw error;
    }
};

/**
 * Supprimer un champ
 * @param {number} fieldId
 */
export const deleteField = async (fieldId) => {
    try {
        const response = await axiosClient.delete(`/api/admin/service-fields/${fieldId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting field:', error);
        throw error;
    }
};

/**
 * Réorganiser l'ordre des champs d'un service
 * @param {number} serviceId
 * @param {Array} fieldIds - Array of field IDs in the desired order
 */
export const reorderFields = async (serviceId, fieldIds) => {
    try {
        const response = await axiosClient.post(`/api/admin/services/${serviceId}/fields/reorder`, {
            field_ids: fieldIds,
        });
        return response.data;
    } catch (error) {
        console.error('Error reordering fields:', error);
        throw error;
    }
};
