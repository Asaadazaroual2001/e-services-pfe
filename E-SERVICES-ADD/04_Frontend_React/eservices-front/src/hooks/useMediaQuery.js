import { useState, useEffect } from "react";

/**
 * @param {string} query CSS media query, e.g. "(max-width: 767px)"
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(query).matches : false
    );

    useEffect(() => {
        const m = window.matchMedia(query);
        const onChange = () => setMatches(m.matches);
        onChange();
        m.addEventListener("change", onChange);
        return () => m.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}

/** Layout mobile (drawer + barre compacte) — inchangé ≥768px */
export function useMobileAppChrome() {
    return useMediaQuery("(max-width: 767px)");
}
