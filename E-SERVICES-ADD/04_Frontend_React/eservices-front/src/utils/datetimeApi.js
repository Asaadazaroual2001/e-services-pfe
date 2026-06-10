/**
 * Pont entre <input type="datetime-local"> (heure locale du navigateur) et l’API Laravel (ISO UTC).
 * Sans ça, "2026-04-14T11:51" est interprété comme UTC côté serveur alors que le navigateur le voit en local.
 */

export function datetimeLocalToUtcIso(localValue) {
    const s = String(localValue ?? "").trim();
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

/** Réponse API (ISO avec Z ou offset) → valeur pour datetime-local en heure locale. */
export function utcIsoToDatetimeLocal(iso) {
    if (iso == null || String(iso).trim() === "") return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
