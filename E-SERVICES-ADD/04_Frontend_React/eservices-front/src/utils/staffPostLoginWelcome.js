const STAFF_ROLE_ORDER = ["admin", "responsable", "agent"];
const STAFF_ROLE_LABELS = {
    admin: "Administrateur",
    responsable: "Responsable d'agence",
    agent: "Agent d'agence",
};

const CODE_TO_ROLE = {
    ADM: "admin",
    AGT: "agent",
    RSP: "responsable",
    CLT: "client",
    REC: "reception",
    DIR: "director",
};

/**
 * Rôles au format attendu par l’UI (minuscules), même si /api/me change un peu.
 */
export function normalizeRolesFromMe(user) {
    if (!user) return [];
    let roles = [];
    if (Array.isArray(user.roles)) {
        roles = user.roles
            .map((r) => (typeof r === "string" ? r : r?.name))
            .filter(Boolean)
            .map((r) => String(r).toLowerCase());
    }
    if (roles.length === 0 && Array.isArray(user.role_codes)) {
        roles = user.role_codes
            .map((c) => {
                const up = String(c).toUpperCase();
                return CODE_TO_ROLE[up] || String(c).toLowerCase();
            })
            .filter(Boolean);
    }
    return [...new Set(roles)];
}

export function isStaffPortalRole(roles) {
    return roles.some((r) => r === "admin" || r === "agent" || r === "responsable");
}

export function formatStaffRolesForWelcome(roles) {
    if (!Array.isArray(roles) || roles.length === 0) return "Personnel";
    const parts = STAFF_ROLE_ORDER.filter((r) => roles.includes(r)).map((r) => STAFF_ROLE_LABELS[r] || r);
    return parts.length > 0 ? parts.join(", ") : roles.join(", ");
}

/** Ligne « agence » pour le message de bienvenue (réponse dashboard summary). */
export function formatWelcomeAgencyLine(d) {
    if (!d) {
        return "Périmètre : toutes les agences";
    }
    const adminAgency = d.admin_agency_name;
    if (typeof adminAgency === "string" && adminAgency.trim() !== "") {
        return `Votre agence : « ${adminAgency.trim()} »`;
    }
    const names = d.agency_names;
    if (names === null || names === undefined) {
        return "Périmètre : toutes les agences";
    }
    if (!Array.isArray(names) || names.length === 0) {
        return "Aucune agence n’est assignée à votre compte.";
    }
    if (names.length === 1) {
        return `Votre agence : « ${names[0]} »`;
    }
    return `Vos agences : ${names.map((n) => `« ${n} »`).join(" · ")}`;
}

/** Demandes soumises qu’aucun employé n’a encore ouvertes (pas d’historique VIEWED). */
export function formatUnviewedStaffDemandesLine(count) {
    const n = Number(count) || 0;
    if (n === 0) {
        return "Aucune demande soumise n’attend encore une première ouverture par un employé.";
    }
    if (n === 1) {
        return "1 demande soumise pas encore consultée par un employé.";
    }
    return `${n} demandes soumises pas encore consultées par un employé.`;
}
