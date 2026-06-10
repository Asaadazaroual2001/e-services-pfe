import axiosClient from './axiosClient';

/**
 * API functions pour la gestion des demandes (Admin)
 */

// ==================== REQUESTS MANAGEMENT ====================

/**
 * Récupérer la liste des demandes avec filtres
 * @param {Object} params - { status, service_id, user_id, assigned_to, is_active, is_viewed, date_from, date_to, search, per_page, page }
 */
export const listRequests = async (params = {}) => {
    try {
        const response = await axiosClient.get('/api/admin/requests', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching requests:', error);
        throw error;
    }
};

/**
 * Créer une nouvelle demande (admin-create)
 * @param {Object} requestData - { service_id, user_id, current_status, field_values }
 */
export const createRequest = async (requestData) => {
    try {
        const response = await axiosClient.post('/api/admin/requests', requestData);
        return response.data;
    } catch (error) {
        console.error('Error creating request:', error);
        throw error;
    }
};

/**
 * Récupérer les détails d'une demande avec toutes les relations
 * @param {number} requestId
 */
export const getRequest = async (requestId) => {
    try {
        const response = await axiosClient.get(`/api/admin/requests/${requestId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching request:', error);
        throw error;
    }
};

/**
 * Mettre à jour une demande
 * @param {number} requestId
 * @param {Object} requestData - { service_id, assigned_to, is_active }
 */
export const updateRequest = async (requestId, requestData) => {
    console.log("=== updateRequest API called ===");
    console.log("Request ID:", requestId);
    console.log("Request Data:", requestData);
    console.log("URL:", `/api/admin/requests/${requestId}`);
    
    try {
        const response = await axiosClient.put(`/api/admin/requests/${requestId}`, requestData);
        console.log("=== updateRequest SUCCESS ===");
        console.log("Response:", response);
        console.log("Response data:", response.data);
        return response.data;
    } catch (error) {
        console.error('=== updateRequest ERROR ===');
        console.error('Error:', error);
        console.error('Error response:', error.response);
        throw error;
    }
};

/**
 * Supprimer/désactiver une demande
 * @param {number} requestId
 */
export const deleteRequest = async (requestId) => {
    try {
        const response = await axiosClient.delete(`/api/admin/requests/${requestId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting request:', error);
        throw error;
    }
};

/**
 * Assigner une demande à un agent
 * @param {number} requestId
 * @param {number} agentId
 */
export const assignRequest = async (requestId, agentId) => {
    try {
        const response = await axiosClient.post(`/api/admin/requests/${requestId}/assign`, {
            assigned_to: agentId,
        });
        return response.data;
    } catch (error) {
        console.error('Error assigning request:', error);
        throw error;
    }
};

/**
 * Marquer une demande comme vue
 * @param {number} requestId
 */
export const markRequestViewed = async (requestId) => {
    try {
        const response = await axiosClient.post(`/api/admin/requests/${requestId}/mark-viewed`);
        return response.data;
    } catch (error) {
        console.error('Error marking request as viewed:', error);
        throw error;
    }
};

/**
 * Approuver une demande
 * @param {number} requestId
 * @param {string} comment - Optional comment
 */
export const approveRequest = async (requestId, comment = null) => {
    try {
        const response = await axiosClient.post(`/api/admin/requests/${requestId}/approve`, {
            comment,
        });
        return response.data;
    } catch (error) {
        console.error('Error approving request:', error);
        throw error;
    }
};

/**
 * Rejeter une demande
 * @param {number} requestId
 * @param {string} comment - Optional comment
 */
export const rejectRequest = async (requestId, comment = null) => {
    try {
        const response = await axiosClient.post(`/api/admin/requests/${requestId}/reject`, {
            comment,
        });
        return response.data;
    } catch (error) {
        console.error('Error rejecting request:', error);
        throw error;
    }
};

/**
 * Basculer le statut actif/inactif d'une demande
 * @param {number} requestId
 */
export const toggleRequestActive = async (requestId) => {
    try {
        const response = await axiosClient.post(`/api/admin/requests/${requestId}/toggle-active`);
        return response.data;
    } catch (error) {
        console.error('Error toggling request status:', error);
        throw error;
    }
};

/**
 * Ajouter un commentaire à une demande
 * @param {number} requestId
 * @param {string} comment
 */
export const addComment = async (requestId, comment) => {
    try {
        const response = await axiosClient.post(`/api/admin/requests/${requestId}/comment`, {
            comment,
        });
        return response.data;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};
