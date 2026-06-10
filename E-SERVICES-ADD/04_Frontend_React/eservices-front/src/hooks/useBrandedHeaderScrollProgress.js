import { useLayoutEffect, useRef, useState } from "react";

/** Distance de scroll (px) : 0 → 1 pour l’animation (clip-path, côtés, ombres) */
const SCROLL_RANGE = 200;

const MOBILE_NO_HEADER_ANIM_MQ = "(max-width: 767px)";

/** Interpolation vers la cible (style « ease-out » doux, type UI Apple) */
const LERP_FACTOR = 0.18;

function smoothstep(t) {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
}

function readFreezeHeaderScrollAnim() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia(MOBILE_NO_HEADER_ANIM_MQ).matches
    );
}

/**
 * @param {HTMLElement | null} scrollElement — nœud scrollable (ex. .admin-main-scroll).
 */
export function useBrandedHeaderScrollProgress(scrollElement) {
    const [progress, setProgress] = useState(0);
    const [freezeHeaderScrollAnim, setFreezeHeaderScrollAnim] = useState(readFreezeHeaderScrollAnim);
    const currentRef = useRef(0);
    const rafRef = useRef(0);

    useLayoutEffect(() => {
        const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const mobileMq = window.matchMedia(MOBILE_NO_HEADER_ANIM_MQ);
        const apply = () => {
            const v = reducedMq.matches || mobileMq.matches;
            setFreezeHeaderScrollAnim((prev) => (prev === v ? prev : v));
        };
        reducedMq.addEventListener("change", apply);
        mobileMq.addEventListener("change", apply);
        return () => {
            reducedMq.removeEventListener("change", apply);
            mobileMq.removeEventListener("change", apply);
        };
    }, []);

    useLayoutEffect(() => {
        if (freezeHeaderScrollAnim) {
            currentRef.current = 0;
            let cancelled = false;
            const id = requestAnimationFrame(() => {
                if (!cancelled) setProgress(0);
            });
            return () => {
                cancelled = true;
                cancelAnimationFrame(id);
            };
        }

        if (!scrollElement) {
            return undefined;
        }

        const readScrollTop = () => {
            let top = scrollElement.scrollTop;
            const innerScrollable = scrollElement.scrollHeight > scrollElement.clientHeight + 2;
            if (!innerScrollable) {
                top =
                    window.scrollY ||
                    window.pageYOffset ||
                    document.documentElement.scrollTop ||
                    0;
            }
            return top;
        };

        const targetProgress = () =>
            smoothstep(Math.min(1, Math.max(0, readScrollTop() / SCROLL_RANGE)));

        const tick = () => {
            const target = targetProgress();
            const c = currentRef.current;
            const n = c + (target - c) * LERP_FACTOR;
            currentRef.current = n;
            setProgress(n);
            if (Math.abs(target - n) > 0.002) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        const kick = () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(tick);
        };

        currentRef.current = targetProgress();
        setProgress(currentRef.current);

        kick();
        scrollElement.addEventListener("scroll", kick, { passive: true });
        window.addEventListener("scroll", kick, { passive: true });

        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(kick) : null;
        ro?.observe(scrollElement);

        return () => {
            cancelAnimationFrame(rafRef.current);
            scrollElement.removeEventListener("scroll", kick);
            window.removeEventListener("scroll", kick);
            ro?.disconnect();
        };
    }, [scrollElement, freezeHeaderScrollAnim]);

    return progress;
}
