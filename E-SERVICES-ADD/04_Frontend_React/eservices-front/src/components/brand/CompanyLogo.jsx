import React from "react";
import logoAdd from "../../assets/logo-add.png";
import "./CompanyLogo.css";

/** URL du logo en `public/logo.png` (liens absolus, e-mails, etc.) */
export function companyLogoSrc() {
    const b = import.meta.env.BASE_URL;
    if (!b || b === "/") return "/logo.png";
    return `${String(b).replace(/\/$/, "")}/logo.png`;
}

/**
 * Logo #ADD (image importée).
 *
 * @param {"mark"|"auth"|"header"|"inline"} variant
 */
export default function CompanyLogo({
    variant = "mark",
    className = "",
    alt = "Agence de Développement du Digital",
}) {
    return (
        <img
            src={logoAdd}
            alt={alt}
            className={`company-logo company-logo--${variant} ${className}`.trim()}
            loading="lazy"
            decoding="async"
        />
    );
}
