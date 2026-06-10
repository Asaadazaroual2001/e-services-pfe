import http, { csrf } from "./axiosClient";

export async function listStaffClientEmails(params = {}) {
  const res = await http.get("/api/staff/client-emails", { params });
  return res.data;
}

export async function sendStaffClientEmail(payload) {
  await csrf();
  const res = await http.post("/api/staff/client-emails", payload);
  return res.data;
}
