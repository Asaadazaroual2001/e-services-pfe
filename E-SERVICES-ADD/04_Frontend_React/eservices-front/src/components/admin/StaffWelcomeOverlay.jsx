import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./StaffWelcomeOverlay.css";

/**
 * Fenêtre flottante (type « nouvelle fenêtre ») au-dessus de l’app après connexion staff.
 * Rendue en portail sur document.body — pas d’alerte navigateur.
 */
export default function StaffWelcomeOverlay() {
    const { staffWelcome, clearStaffWelcomeMessage } = useAuth();

    useEffect(() => {
        if (!staffWelcome) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") clearStaffWelcomeMessage();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [staffWelcome, clearStaffWelcomeMessage]);

    if (!staffWelcome) {
        return null;
    }

    const { message, showUnviewedListCta } = staffWelcome;

    return createPortal(
        <div
            className="staff-win-overlay"
            role="presentation"
            onClick={() => clearStaffWelcomeMessage()}
        >
            <div
                className="staff-win"
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-win-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="staff-win__titlebar">
                    <span className="staff-win__title" id="staff-win-title">
                        E-Services — Bienvenue
                    </span>
                    <button
                        type="button"
                        className="staff-win__close"
                        onClick={() => clearStaffWelcomeMessage()}
                        aria-label="Fermer la fenêtre"
                    >
                        <span aria-hidden>×</span>
                    </button>
                </div>
                <div className="staff-win__body">
                    <p className="staff-win__text">{message}</p>
                </div>
                <div className="staff-win__footer">
                    <div className="staff-win__footer-actions">
                        {showUnviewedListCta ? (
                            <Link
                                to="/admin/requests?is_viewed=0"
                                className="staff-win__unviewed-btn"
                                onClick={() => clearStaffWelcomeMessage()}
                            >
                                Consulter les demandes
                            </Link>
                        ) : null}
                        <button type="button" className="staff-win__ok" onClick={() => clearStaffWelcomeMessage()}>
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
