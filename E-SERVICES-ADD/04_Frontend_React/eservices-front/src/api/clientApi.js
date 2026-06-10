import http, { csrf } from "./axiosClient";

// ==================== SERVICES (public) ====================
export async function listServices(params = {}) {
  const response = await http.get("/api/services", { params });
  return response.data;
}

export async function getService(serviceId) {
  const response = await http.get(`/api/services/${serviceId}`);
  return response.data;
}

// ==================== REQUESTS (client) ====================
export async function listMyRequests(params = {}) {
  const response = await http.get("/api/client/requests", { params });
  return response.data;
}

export async function getMyRequest(requestId) {
  const response = await http.get(`/api/client/requests/${requestId}`);
  return response.data;
}

export async function createRequest(requestData) {
  await csrf();
  const response = await http.post("/api/client/requests", requestData);
  return response.data;
}

export async function updateRequest(requestId, requestData) {
  await csrf();
  const response = await http.put(`/api/client/requests/${requestId}`, requestData);
  return response.data;
}

export async function deleteRequest(requestId) {
  await csrf();
  const response = await http.delete(`/api/client/requests/${requestId}`);
  return response.data;
}

export async function submitRequest(requestId, payload = {}) {
  await csrf();
  const response = await http.post(`/api/client/requests/${requestId}/submit`, payload);
  return response.data;
}

export async function uploadDocument(requestId, file) {
  await csrf();

  // PHP config on this environment typically has `upload_max_filesize = 2M`.
  // Validate early to show a clear message instead of Laravel's generic upload error.
  const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // ~2MB
  if (file && file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Fichier trop volumineux. Taille max: environ 2 Mo.");
  }

  const formData = new FormData();
  formData.append("document", file);

  // Don't force `Content-Type` header: Axios will set the correct multipart boundary for FormData.
  const response = await http.post(`/api/client/requests/${requestId}/documents`, formData);

  return response.data;
}

export async function addComment(requestId, comment) {
  await csrf();
  const response = await http.post(`/api/client/requests/${requestId}/comments`, { comment });
  return response.data;
}

// ==================== PUBLIC GUEST REQUESTS (no login) ====================

export async function createGuestRequest(requestData) {
  await csrf();
  const response = await http.post("/api/public/requests", requestData);
  return response.data;
}

export async function updateGuestRequest(requestId, token, requestData) {
  await csrf();
  const response = await http.put(`/api/public/requests/${requestId}`, requestData, {
    headers: { "X-Public-Token": token },
  });
  return response.data;
}

export async function submitGuestRequest(requestId, token, payload = {}) {
  await csrf();
  const response = await http.post(`/api/public/requests/${requestId}/submit`, payload, {
    headers: { "X-Public-Token": token },
  });
  return response.data;
}

export async function uploadGuestDocument(requestId, token, file) {
  await csrf();
  const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
  if (file && file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Fichier trop volumineux. Taille max: environ 2 Mo.");
  }
  const formData = new FormData();
  formData.append("document", file);
  const response = await http.post(`/api/public/requests/${requestId}/documents`, formData, {
    headers: { "X-Public-Token": token },
  });
  return response.data;
}

export async function addGuestComment(requestId, token, comment) {
  await csrf();
  const response = await http.post(
    `/api/public/requests/${requestId}/comments`,
    { comment },
    { headers: { "X-Public-Token": token } }
  );
  return response.data;
}

