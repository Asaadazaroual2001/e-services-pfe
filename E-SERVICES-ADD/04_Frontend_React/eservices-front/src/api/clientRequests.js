import axiosClient from './axiosClient';

/**
 * Client-facing Requests & Services APIs
 */

// ==================== SERVICES (Public-ish) ====================

/**
 * Get list of active services
 */
export const getServices = async (params = {}) => {
  try {
    const response = await axiosClient.get('/services', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

/**
 * Get specific service with fields
 */
export const getServiceDetails = async (serviceId) => {
  try {
    const response = await axiosClient.get(`/services/${serviceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching service details:', error);
    throw error;
  }
};

/**
 * Submit new request with dynamic form values
 */
export const submitRequest = async (requestData) => {
  try {
    const response = await axiosClient.post('/requests', requestData);
    return response.data;
  } catch (error) {
    console.error('Error submitting request:', error);
    throw error;
  }
};
