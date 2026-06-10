/** Marqueur dans le corps : remplacé par le champ « Motif / excuses » à l’envoi (ou retiré si vide). */
export const STAFF_EMAIL_MOTIF_PLACEHOLDER = "[[MOTIF]]";

function varsFromRequest(requestRow) {
  const r = requestRow || {};
  const nom = String(r.client_name || "").trim() || "Madame, Monsieur";
  const reference = String(r.reference || "—").trim();
  const service = String(r.service_name || "").trim();
  const serviceLine = service ? ` concernant le service « ${service} »` : "";
  return { nom, reference, service, serviceLine };
}

const PRESETS = {
  SUBMITTED: {
    label: "Demande reçue (soumise)",
    subject: (v) => `Votre demande ${v.reference} — accusé de réception`,
    body: (v) => `Bonjour ${v.nom},

Nous accusons réception de votre demande ${v.reference}${v.serviceLine}.

Votre dossier est enregistré et sera traité dans les meilleurs délais.

Précisions complémentaires (optionnel) :
${STAFF_EMAIL_MOTIF_PLACEHOLDER}

Cordialement,`,
  },
  IN_REVIEW: {
    label: "En cours d’examen",
    subject: (v) => `Votre demande ${v.reference} — en cours de traitement`,
    body: (v) => `Bonjour ${v.nom},

Votre demande ${v.reference}${v.serviceLine} est actuellement **en cours d’examen** par nos services.

Nous reviendrons vers vous si une action de votre part est nécessaire.

Message complémentaire (optionnel) :
${STAFF_EMAIL_MOTIF_PLACEHOLDER}

Cordialement,`,
  },
  NEEDS_INFO: {
    label: "Complément d’information demandé",
    subject: (v) => `Votre demande ${v.reference} — informations requises`,
    body: (v) => `Bonjour ${v.nom},

Concernant votre demande ${v.reference}${v.serviceLine}, nous avons besoin d’**informations ou de pièces complémentaires** pour poursuivre le traitement.

Merci de préciser / fournir (à compléter ci-dessous) :
${STAFF_EMAIL_MOTIF_PLACEHOLDER}

Dès réception, nous pourrons avancer sur votre dossier.

Cordialement,`,
  },
  APPROVED: {
    label: "Demande acceptée",
    subject: (v) => `Votre demande ${v.reference} — acceptée`,
    body: (v) => `Bonjour ${v.nom},

Nous avons le plaisir de vous informer que votre demande ${v.reference}${v.serviceLine} a été **acceptée**.

Précisions ou prochaines étapes (optionnel) :
${STAFF_EMAIL_MOTIF_PLACEHOLDER}

Cordialement,`,
  },
  REJECTED: {
    label: "Demande rejetée",
    subject: (v) => `Votre demande ${v.reference} — rejet`,
    body: (v) => `Bonjour ${v.nom},

Nous faisons suite à votre demande ${v.reference}${v.serviceLine}.

Nous vous informons que celle-ci a été **rejetée**.

Motif et excuses (à compléter par nos services) :
${STAFF_EMAIL_MOTIF_PLACEHOLDER}

Nous restons à votre disposition pour toute question.

Cordialement,`,
  },
  CLOSED: {
    label: "Dossier clôturé",
    subject: (v) => `Votre demande ${v.reference} — clôture`,
    body: (v) => `Bonjour ${v.nom},

Votre demande ${v.reference}${v.serviceLine} est désormais **clôturée**.

Commentaire final (optionnel) :
${STAFF_EMAIL_MOTIF_PLACEHOLDER}

Cordialement,`,
  },
};

export const STAFF_EMAIL_PRESET_ORDER = Object.keys(PRESETS);

export function getStaffEmailPresetLabel(key) {
  return PRESETS[key]?.label || key;
}

/**
 * @param {string} presetKey
 * @param {object|null|undefined} requestRow — ligne liste admin (reference, client_name, service_name, …)
 * @returns {{ subject: string, body: string } | null}
 */
export function buildStaffEmailPreset(presetKey, requestRow) {
  const def = PRESETS[presetKey];
  if (!def) {
    return null;
  }
  const v = varsFromRequest(requestRow);
  return {
    subject: typeof def.subject === "function" ? def.subject(v) : def.subject,
    body: typeof def.body === "function" ? def.body(v) : def.body,
  };
}

/**
 * Remplace le marqueur par le texte admin ; si texte vide, retire la ligne du marqueur proprement.
 * @param {string} body
 * @param {string} motif
 */
export function mergeMotifIntoBody(body, motif) {
  const m = String(motif || "").trim();
  if (!body.includes(STAFF_EMAIL_MOTIF_PLACEHOLDER)) {
    if (!m) {
      return body.trim();
    }
    return `${body.trim()}\n\nMotif / précisions :\n${m}`;
  }
  if (!m) {
    return body.split(STAFF_EMAIL_MOTIF_PLACEHOLDER).join("").replace(/\n{3,}/g, "\n\n").trim();
  }
  return body.split(STAFF_EMAIL_MOTIF_PLACEHOLDER).join(m).trim();
}
