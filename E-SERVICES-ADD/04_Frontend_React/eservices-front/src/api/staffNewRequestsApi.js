import axiosClient from "./axiosClient";

/**
 * Nouvelles demandes (statut SUBMITTED) pour la cloche du header staff.
 */
export async function fetchStaffNewRequests(params = {}) {
  const response = await axiosClient.get("/api/staff/new-requests", { params });
  return response.data;
}
