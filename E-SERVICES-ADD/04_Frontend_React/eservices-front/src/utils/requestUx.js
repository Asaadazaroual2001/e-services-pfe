/** Libellés FR pour l’historique (actions techniques API). */
export const HISTORY_ACTION_LABELS = {
  CREATED: "Demande créée",
  UPDATED: "Mise à jour",
  SUBMITTED: "Soumise au service",
  ASSIGNED: "Assignation",
  VIEWED: "Consultation par un agent",
  COMMENTED: "Commentaire",
  DOCUMENT_UPLOADED: "Pièce jointe ajoutée",
  STATUS_CHANGED: "Changement de statut",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  DELETED: "Suppression / désactivation",
  ACTIVATED: "Réactivée",
  DEACTIVATED: "Désactivée",
  IN_REVIEW: "En révision",
  NEEDS_INFO: "Informations demandées",
  DRAFT: "Brouillon",
  SUBMITTED_LEGACY: "Soumise",
  CLOSED: "Fermée",
};

export const STATUS_LABELS = {
  DRAFT: { label: "Brouillon", class: "draft" },
  SUBMITTED: { label: "Soumise", class: "submitted" },
  IN_REVIEW: { label: "En révision", class: "in-review" },
  NEEDS_INFO: { label: "Info requise", class: "needs-info" },
  APPROVED: { label: "Approuvée", class: "approved" },
  REJECTED: { label: "Rejetée", class: "rejected" },
  CLOSED: { label: "Fermée", class: "closed" },
};

export function labelHistoryAction(action) {
  if (!action) return "—";
  return HISTORY_ACTION_LABELS[action] || action;
}

export function labelStatusCode(code) {
  if (!code) return "—";
  return STATUS_LABELS[code]?.label || code;
}

export function isImageMime(mime) {
  if (!mime || typeof mime !== "string") return false;
  return mime.startsWith("image/");
}

/** Aperçu possible dans un nouvel onglet (navigateur). */
export function isPreviewableMime(mime) {
  if (!mime || typeof mime !== "string") return false;
  return mime.startsWith("image/") || mime === "application/pdf";
}
