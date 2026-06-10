import React from "react";
import "./HeaderBrandMark.css";

/**
 * Marque texte « #ADD » — même dégradé sur le # que le logo.
 * @param {"header"|"sidebar"} placement — header = fond dégradé (ADD blanc) ; sidebar = fond clair (ADD foncé)
 */
export default function HeaderBrandMark({ placement = "header" }) {
    const isSidebar = placement === "sidebar";

    return (
        <div
            className={isSidebar ? "sidebar-brand-mark" : "app-branded-header__brand"}
            role="img"
            aria-label="#ADD — Agence de Développement du Digital"
        >
            <span className={isSidebar ? "sidebar-brand-mark__hash" : "app-branded-header__hash"} aria-hidden="true">
                #
            </span>
            <span className={isSidebar ? "sidebar-brand-mark__add" : "app-branded-header__add"} aria-hidden="true">
                ADD
            </span>
        </div>
    );
}
