import { useState, useCallback, useEffect, useRef } from "react";

const EXPAND_MS = 300;
const COLLAPSE_MS = 260;
/** Découple l’élargissement du menu et le stagger des lignes (évite « 2 animations en même temps »). */
const EXPAND_STAGGER_DELAY_MS = 48;

function motionDelaysReduced() {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Même principe que le panneau notifications : fermeture = texte / lignes puis largeur ;
 * ouverture = largeur puis entrées en cascade.
 */
export function useSidebarMenuAnimation(initialCollapsed = false) {
    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const [menuAnim, setMenuAnim] = useState("");
    const timersRef = useRef([]);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const toggle = useCallback(() => {
        clearTimers();
        const reduce = motionDelaysReduced();
        const expandMs = reduce ? 0 : EXPAND_MS;
        const collapseMs = reduce ? 0 : COLLAPSE_MS;

        if (collapsed) {
            setCollapsed(false);
            setMenuAnim("");
            if (reduce) {
                setMenuAnim("sidebar-menu--expanding");
                timersRef.current.push(setTimeout(() => setMenuAnim(""), expandMs));
            } else {
                timersRef.current.push(
                    setTimeout(() => {
                        setMenuAnim("sidebar-menu--expanding");
                        timersRef.current.push(setTimeout(() => setMenuAnim(""), expandMs));
                    }, EXPAND_STAGGER_DELAY_MS)
                );
            }
        } else {
            setMenuAnim("sidebar-menu--collapsing");
            timersRef.current.push(
                setTimeout(() => {
                    setCollapsed(true);
                    setMenuAnim("");
                }, collapseMs)
            );
        }
    }, [collapsed, clearTimers]);

    return { collapsed, menuAnim, toggle };
}
