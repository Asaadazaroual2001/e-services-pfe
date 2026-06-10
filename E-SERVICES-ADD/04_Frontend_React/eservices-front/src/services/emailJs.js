import emailjs from "emailjs-com";

const envServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const envTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const envPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/** @type {{ serviceId: string; templateId: string; publicKey: string } | null} */
let runtimeConfig = null;
let initialized = false;

/**
 * Optionnel : config chargée depuis Laravel GET /api/public/emailjs-config
 * (une seule source de vérité côté backend).
 */
export function setEmailJsRuntimeConfig(cfg) {
  if (!cfg) {
    runtimeConfig = null;
    initialized = false;
    return;
  }
  runtimeConfig = {
    serviceId: String(cfg.serviceId ?? "").trim(),
    templateId: String(cfg.templateId ?? "").trim(),
    publicKey: String(cfg.publicKey ?? "").trim(),
  };
  initialized = false;
}

function effectiveServiceId() {
  return String(runtimeConfig?.serviceId || envServiceId || "").trim();
}

function effectiveTemplateId() {
  return String(runtimeConfig?.templateId || envTemplateId || "").trim();
}

function effectivePublicKey() {
  return String(runtimeConfig?.publicKey || envPublicKey || "").trim();
}

function ensureInit() {
  const pk = effectivePublicKey();
  if (!pk) {
    return;
  }
  if (!initialized) {
    emailjs.init(pk);
    initialized = true;
  }
}

/**
 * Charge les identifiants EmailJS depuis l’API Laravel si le .env Vite n’est pas rempli.
 * @returns {Promise<boolean>} true si la config est utilisable après l’appel
 */
export async function loadEmailJsConfigFromApi() {
  if (isEmailJsConfigured()) {
    return true;
  }
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base || String(base).trim() === "") {
    return false;
  }
  const url = `${String(base).replace(/\/$/, "")}/api/public/emailjs-config`;
  try {
    const res = await fetch(url, { credentials: "omit", headers: { Accept: "application/json" } });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    if (data?.configured && data.service_id && data.template_id && data.public_key) {
      setEmailJsRuntimeConfig({
        serviceId: data.service_id,
        templateId: data.template_id,
        publicKey: data.public_key,
      });
      return isEmailJsConfigured();
    }
  } catch {
    /* réseau / CORS / API arrêtée */
  }
  return false;
}

/** True si service + template + clé publique sont connus (env Vite et/ou config API). */
export function isEmailJsConfigured() {
  return Boolean(
    effectiveServiceId() && effectiveTemplateId() && effectivePublicKey()
  );
}

/**
 * Envoie un e-mail via un modèle EmailJS.
 * Les clés de `templateParams` doivent correspondre aux variables du modèle
 * dans le tableau de bord EmailJS (ex. user_name, user_email, message).
 *
 * @param {Record<string, unknown>} templateParams
 * @returns {Promise<{ status: number; text: string }>}
 */
export function sendEmailJsTemplate(templateParams) {
  if (!isEmailJsConfigured()) {
    return Promise.reject(
      new Error(
        "EmailJS : ajoutez VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID et VITE_EMAILJS_PUBLIC_KEY dans .env (frontend) ou remplissez EMAILJS_* / emailjs-credentials.json côté Laravel, puis redémarrez."
      )
    );
  }
  ensureInit();
  return emailjs.send(
    effectiveServiceId(),
    effectiveTemplateId(),
    templateParams,
    effectivePublicKey()
  );
}
