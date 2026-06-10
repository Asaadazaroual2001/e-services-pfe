// src/api/http.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

console.log("API Base URL:", baseURL);

export const http = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});


// Log des requêtes
http.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    data: config.data,
    headers: config.headers,
  });
  return config;
});

// Log des réponses
http.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`API Error: ${error.response?.status || 'ERROR'} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export async function csrf() {
  try {
    console.log("Fetching CSRF token...");
    await http.get("/sanctum/csrf-cookie");
    console.log("CSRF token fetched successfully");
  } catch (error) {
    console.error("Failed to get CSRF token:", error);
    throw error;
  }
}

// Export par défaut pour la compatibilité
export default http;
