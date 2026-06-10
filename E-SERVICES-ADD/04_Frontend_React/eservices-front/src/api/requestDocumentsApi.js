import http, { csrf } from "./axiosClient";

const paths = {
  client: (requestId, documentId) =>
    `/api/client/requests/${requestId}/documents/${documentId}/download`,
  employee: (requestId, documentId) =>
    `/api/employee/requests/${requestId}/documents/${documentId}/download`,
  admin: (requestId, documentId) =>
    `/api/admin/requests/${requestId}/documents/${documentId}/download`,
  guest: (requestId, documentId) =>
    `/api/public/requests/${requestId}/documents/${documentId}/download`,
};

/**
 * Télécharge un document (auth cookie Sanctum ou token invité).
 * @param {"client"|"employee"|"admin"|"guest"} role
 * @param {string|null} guestToken header X-Public-Token si guest
 */
export async function downloadRequestDocument(role, requestId, documentId, fileName, guestToken = null) {
  await csrf();
  const url = paths[role](requestId, documentId);
  const headers = guestToken ? { "X-Public-Token": guestToken } : {};
  const res = await http.get(url, {
    responseType: "blob",
    headers,
  });
  const mime = res.headers["content-type"] || "application/octet-stream";
  const blob = new Blob([res.data], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName || "document";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Ouvre un aperçu (images/PDF) dans un nouvel onglet.
 */
export async function previewRequestDocument(role, requestId, documentId, guestToken = null) {
  await csrf();
  const url = paths[role](requestId, documentId);
  const headers = guestToken ? { "X-Public-Token": guestToken } : {};
  const res = await http.get(url, {
    responseType: "blob",
    headers,
  });
  const mime = res.headers["content-type"] || "application/octet-stream";
  const blob = new Blob([res.data], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
