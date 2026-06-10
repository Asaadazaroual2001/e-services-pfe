import React from "react";
import { useBrandedHeaderScrollProgress } from "../../hooks/useBrandedHeaderScrollProgress";
import "../../styles/brandedScrollHeader.css";

/**
 * En-tête dégradé #ADD : animation au scroll (clip-path + côtés) sans changer la taille de la boîte du header.
 * @param {HTMLElement | null} scrollElement — élément avec overflow-y (state + ref callback sur le parent)
 */
export default function BrandedScrollHeader({ scrollElement, className = "", left, center, right }) {
    const p = useBrandedHeaderScrollProgress(scrollElement);

    return (
        <header
            className={`branded-scroll-header app-branded-header ${className}`.trim()}
            style={
                /** @type {React.CSSProperties} */
                ({ ["--branded-scroll-p"]: p })
            }
            data-branded-collapse={p > 0.92 ? "full" : p > 0.35 ? "mid" : "open"}
        >
            <div className="app-branded-header__left branded-scroll-header__side branded-scroll-header__side--left">
                {left}
            </div>
            <div className="app-branded-header__center branded-scroll-header__center">{center}</div>
            <div className="app-branded-header__right branded-scroll-header__side branded-scroll-header__side--right">
                {right}
            </div>
        </header>
    );
}
