import axiosClient from './axiosClient';

/**
 * API functions pour la gestion des utilisateurs (Admin)
 */

/** Tableau de bord admin / responsable (compteurs alignés sur les listes API) */
export const getAdminDashboardSummary = async () => {
    try {
        const response = await axiosClient.get('/api/admin/dashboard/summary');
        return response.data;
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        throw error;
    }
};

// Récupérer la liste des utilisateurs avec recherche et filtres
export const getUsers = async (params = {}) => {
    try {
        const response = await axiosClient.get('/api/admin/users', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

/** Clients inscrits + contacts issus de demandes publiques (nom / e-mail depuis le formulaire) */
export const getClientsDirectory = async (params = {}) => {
    try {
        const response = await axiosClient.get('/api/admin/clients-directory', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching clients directory:', error);
        throw error;
    }
};

// Créer un nouvel utilisateur
export const createUser = async (userData) => {
    try {
        const response = await axiosClient.post('/api/admin/users', userData);
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

// Récupérer les détails d'un utilisateur
export const getUserById = async (userId) => {
    try {
        const response = await axiosClient.get(`/api/admin/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

// Mettre à jour un utilisateur
export const updateUser = async (userId, userData) => {
    try {
        const response = await axiosClient.put(`/api/admin/users/${userId}`, userData);
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// Supprimer un utilisateur
export const deleteUser = async (userId) => {
    try {
        const response = await axiosClient.delete(`/api/admin/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

// Récupérer la liste des rôles disponibles
export const getRoles = async () => {
    try {
        const response = await axiosClient.get('/api/admin/roles');
        return response.data;
    } catch (error) {
        console.error('Error fetching roles:', error);
        throw error;
    }
};

export const getAgencies = async (params = {}) => {
    try {
        const response = await axiosClient.get('/api/admin/agencies', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching agencies:', error);
        throw error;
    }
};

export const createAgency = async (data) => {
    try {
        const response = await axiosClient.post('/api/admin/agencies', data);
        return response.data;
    } catch (error) {
        console.error('Error creating agency:', error);
        throw error;
    }
};

export const updateAgency = async (agencyId, data) => {
    try {
        const response = await axiosClient.put(`/api/admin/agencies/${agencyId}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating agency:', error);
        throw error;
    }
};

export const deleteAgency = async (agencyId) => {
    try {
        const response = await axiosClient.delete(`/api/admin/agencies/${agencyId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting agency:', error);
        throw error;
    }
};