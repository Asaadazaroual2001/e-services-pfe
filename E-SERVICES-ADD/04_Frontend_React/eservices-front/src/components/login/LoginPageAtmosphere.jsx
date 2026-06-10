import React, { useEffect, useState } from "react";
import "./LoginPageAtmosphere.css";

/**
 * Fond animé connexion : dégradé doux, vagues, caractères # A D en flottement.
 * décoratif uniquement (aria-hidden sur le conteneur parent).
 */
const FLOATS = [
    { char: "#", mod: "login-float--1" },
    { char: "A", mod: "login-float--2" },
    { char: "D", mod: "login-float--3" },
    { char: "#", mod: "login-float--4" },
    { char: "D", mod: "login-float--5" },
    { char: "A", mod: "login-float--6" },
    { char: "#", mod: "login-float--7" },
    { char: "A", mod: "login-float--8" },
    { char: "D", mod: "login-float--9" },
    { char: "#", mod: "login-float--10" },
    { char: "A", mod: "login-float--11" },
    { char: "D", mod: "login-float--12" },
    { char: "#", mod: "login-float--13" },
    { char: "D", mod: "login-float--14" },
    { char: "A", mod: "login-float--15" },
    { char: "#", mod: "login-float--16" },
    { char: "D", mod: "login-float--17" },
    { char: "A", mod: "login-float--18" },
    { char: "#", mod: "login-float--19" },
    { char: "A", mod: "login-float--20" },
    { char: "D", mod: "login-float--21" },
    { char: "#", mod: "login-float--22" },
    { char: "D", mod: "login-float--23" },
    { char: "A", mod: "login-float--24" },
    { char: "#", mod: "login-float--25" },
    { char: "D", mod: "login-float--26" },
    { char: "A", mod: "login-float--27" },
    { char: "D", mod: "login-float--28" },
    { char: "#", mod: "login-float--29" },
    { char: "A", mod: "login-float--30" },
    { char: "D", mod: "login-float--31" },
    { char: "#", mod: "login-float--32" },
    { char: "A", mod: "login-float--33" },
    { char: "D", mod: "login-float--34" },
    { char: "#", mod: "login-float--35" },
    { char: "A", mod: "login-float--36" },
];

/** Normalise la position du pointeur (-1…1). Désactivé si reduced motion ou pointer grossier. */
function usePointerParallaxNorm() {
    const [norm, setNorm] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        const mqFine = window.matchMedia("(hover: hover) and (pointer: fine)");
        if (mqReduce.matches || !mqFine.matches) {
            return undefined;
        }

        let raf = 0;
        const onMove = (e) => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const w = window.innerWidth || 1;
                const h = window.innerHeight || 1;
                setNorm({
                    x: (e.clientX / w) * 2 - 1,
                    y: (e.clientY / h) * 2 - 1,
                });
            });
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        return () => {
            window.removeEventListener("pointermove", onMove);
            cancelAnimationFrame(raf);
        };
    }, []);

    return norm;
}

function parallaxDepthForIndex(i) {
    return 0.38 + ((i * 7) % 9) * 0.06;
}

export default function LoginPageAtmosphere() {
    const parallax = usePointerParallaxNorm();
    const maxPx = 11;

    return (
        <div className="login-page-atmos" aria-hidden="true">
            <div className="login-page-atmos__mesh" />
            <div className="login-page-atmos__glow login-page-atmos__glow--1" />
            <div className="login-page-atmos__glow login-page-atmos__glow--2" />
            <div className="login-page-atmos__glow login-page-atmos__glow--3" />
            <div className="login-page-atmos__wave login-page-atmos__wave--1" />
            <div className="login-page-atmos__wave login-page-atmos__wave--2" />
            <div className="login-page-atmos__wave login-page-atmos__wave--3" />
            <div className="login-page-atmos__chars">
                {FLOATS.map(({ char, mod }, i) => {
                    const depth = parallaxDepthForIndex(i);
                    const tx = -parallax.x * maxPx * depth;
                    const ty = -parallax.y * maxPx * depth;
                    return (
                        <div
                            key={mod}
                            className={`login-float-wrap ${mod}`}
                            style={{ transform: `translate3d(${tx}px, ${ty}px, 0)` }}
                        >
                            <span className="login-float-char">{char}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
