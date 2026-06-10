import http, { csrf } from "./axiosClient";

export async function getDashboard() {
  const response = await http.get("/api/employee/dashboard");
  return response.data;
}

export async function listAgents() {
  const response = await http.get("/api/employee/agents");
  return response.data;
}

export async function listRequests(params = {}) {
  const response = await http.get("/api/employee/requests", { params });
  return response.data;
}

export async function getRequest(requestId) {
  const response = await http.get(`/api/employee/requests/${requestId}`);
  return response.data;
}

export async function takeRequest(requestId) {
  await csrf();
  const response = await http.post(`/api/employee/requests/${requestId}/take`, {});
  return response.data;
}

export async function startReview(requestId) {
  await csrf();
  const response = await http.post(`/api/employee/requests/${requestId}/start-review`, {});
  return response.data;
}

export async function requestInfo(requestId, comment) {
  await csrf();
  const response = await http.post(`/api/employee/requests/${requestId}/request-info`, { comment });
  return response.data;
}

export async function approveRequest(requestId, comment = null) {
  await csrf();
  const response = await http.post(`/api/employee/requests/${requestId}/approve`, { comment });
  return response.data;
}

export async function rejectRequest(requestId, comment) {
  await csrf();
  const response = await http.post(`/api/employee/requests/${requestId}/reject`, { comment });
  return response.data;
}

export async function addComment(requestId, comment) {
  await csrf();
  const response = await http.post(`/api/employee/requests/${requestId}/comment`, { comment });
  return response.data;
}

