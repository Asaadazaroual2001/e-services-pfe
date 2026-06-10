import React from "react";

export default function MobileNavMenuButton({ onClick, label = "Ouvrir le menu" }) {
    return (
        <button type="button" className="app-mobile-nav-trigger" onClick={onClick} aria-label={label}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
        </button>
    );
}
