import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import * as Framer from "framer-motion";
import { useAuth } from "../../auth/AuthContext";
import { fetchStaffNewRequests } from "../../api/staffNewRequestsApi";
import "./StaffHeaderNotifications.css";

const POLL_MS = 45000;

function formatSubmittedAt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

/**
 * @param {{ scrollElement?: HTMLElement | null }} props — zone scroll du layout (ex. .admin-main-scroll) pour
 *   repositionner le panneau ; la pastille suit la cloche via requestAnimationFrame (transform / display du header).
 */
export default function StaffHeaderNotifications({ scrollElement = null }) {
  const { hasAnyRole } = useAuth();
  const canSee = hasAnyRole(["admin", "agent", "responsable"]);
  const reduceMotion = Framer.useReducedMotion();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const badgeHostRef = useRef(null);
  const [panelCoords, setPanelCoords] = useState(null);

  const load = useCallback(async (opts = {}) => {
    const { silent = false } = opts;
    if (!canSee) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await fetchStaffNewRequests({ limit: 12 });
      setCount(typeof data?.count === "number" ? data.count : 0);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError("Impossible de charger les notifications.");
      setCount(0);
      setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    if (!canSee) return undefined;
    load({ silent: false });
    const id = setInterval(() => load({ silent: true }), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [canSee, load]);

  const updatePanelCoords = useCallback(() => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setPanelCoords({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }, []);

  /**
   * Pastille (portail, fixed) : position en direct sur le DOM pour suivre l’animation du header au scroll
   * (transform / display:none) sans re-render React. Masquée si le bouton n’a pas de boîte visible.
   */
  const positionBadgeDOM = useCallback(() => {
    const el = badgeHostRef.current;
    const btn = buttonRef.current;
    if (!el || !btn || count <= 0) return;
    const r = btn.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) {
      el.style.visibility = "hidden";
      return;
    }
    const w = r.width;
    const h = r.height;
    const cx = r.left + w / 2;
    const cy = r.top + h / 2;
    const radius = Math.min(w, h) / 2;
    const angle = -Math.PI / 4;
    el.style.left = `${cx + radius * Math.cos(angle)}px`;
    el.style.top = `${cy + radius * Math.sin(angle)}px`;
    el.style.visibility = "visible";
  }, [count]);

  useLayoutEffect(() => {
    if (count <= 0) return undefined;
    let rafId = 0;
    const tick = () => {
      positionBadgeDOM();
      rafId = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        start();
      } else {
        cancelAnimationFrame(rafId);
      }
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(rafId);
    };
  }, [count, positionBadgeDOM]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    updatePanelCoords();
    const onScroll = () => updatePanelCoords();
    const onResize = () => updatePanelCoords();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    scrollElement?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      scrollElement?.removeEventListener("scroll", onScroll);
    };
  }, [open, updatePanelCoords, scrollElement]);

  const { panelVariants, blockVariants, listVariants, listItemVariants } = useMemo(() => {
    if (reduceMotion) {
      return {
        panelVariants: {
          initial: { opacity: 0 },
          open: {
            opacity: 1,
            transition: { when: "beforeChildren", staggerChildren: 0.012, delayChildren: 0.01 },
          },
          exit: {
            opacity: 0,
            transition: { when: "afterChildren", staggerChildren: 0.01, staggerDirection: -1 },
          },
        },
        blockVariants: {
          initial: { opacity: 0 },
          open: { opacity: 1 },
          exit: { opacity: 0 },
        },
        listVariants: {
          initial: {},
          open: { transition: { staggerChildren: 0.012, delayChildren: 0.006 } },
          exit: { transition: { staggerChildren: 0.01, staggerDirection: -1 } },
        },
        listItemVariants: {
          initial: { opacity: 0 },
          open: { opacity: 1 },
          exit: { opacity: 0 },
        },
      };
    }
    return {
      panelVariants: {
        initial: { opacity: 0, y: -8, scale: 0.97, filter: "blur(3px)" },
        open: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: {
            type: "spring",
            stiffness: 780,
            damping: 42,
            mass: 0.65,
            when: "beforeChildren",
            staggerChildren: 0.028,
            delayChildren: 0.02,
          },
        },
        exit: {
          opacity: 0,
          y: -5,
          scale: 0.985,
          filter: "blur(2px)",
          transition: {
            when: "afterChildren",
            staggerChildren: 0.022,
            staggerDirection: -1,
            duration: 0.11,
            ease: [0.32, 0, 0.2, 1],
          },
        },
      },
      blockVariants: {
        initial: { opacity: 0, x: -10, y: 3 },
        open: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { type: "spring", stiffness: 560, damping: 36 },
        },
        exit: {
          opacity: 0,
          x: -8,
          y: 2,
          transition: { duration: 0.09, ease: [0.32, 0, 0.2, 1] },
        },
      },
      listVariants: {
        initial: {},
        open: {
          transition: {
            staggerChildren: 0.03,
            delayChildren: 0.012,
          },
        },
        exit: {
          transition: {
            staggerChildren: 0.022,
            staggerDirection: -1,
          },
        },
      },
      listItemVariants: {
        initial: { opacity: 0, x: -12, y: 3 },
        open: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { type: "spring", stiffness: 560, damping: 34 },
        },
        exit: {
          opacity: 0,
          x: -8,
          y: 2,
          transition: { duration: 0.09, ease: [0.32, 0, 0.2, 1] },
        },
      },
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!canSee) {
    return null;
  }

  return (
    <div className="staff-header-notif" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="staff-header-notif__toggle"
        aria-label={
          count > 0
            ? `Demandes soumises non encore consultées : ${count}. Ouvrir la liste.`
            : "Aucune demande soumise en attente de première consultation. Ouvrir la liste."
        }
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) load({ silent: true });
            return next;
          });
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>

      {count > 0
        ? createPortal(
            <span
              ref={badgeHostRef}
              className={`staff-header-notif__badge staff-header-notif__badge--portal${count < 10 ? " staff-header-notif__badge--single" : ""}`}
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                transform: "translate(-50%, -50%)",
                visibility: "hidden",
              }}
              aria-hidden="true"
            >
              {count > 99 ? "99+" : count}
            </span>,
            document.body
          )
        : null}

      {panelCoords
        ? createPortal(
            <Framer.AnimatePresence onExitComplete={() => setPanelCoords(null)}>
              {open ? (
                <Framer.motion.div
                  key="staff-notif-panel"
                  ref={panelRef}
                  className="staff-header-notif__panel staff-header-notif__panel--portal"
                  style={{
                    position: "fixed",
                    top: panelCoords.top,
                    right: panelCoords.right,
                    left: "auto",
                    transformOrigin: "top right",
                  }}
                  role="dialog"
                  aria-label="Demandes soumises non consultées"
                  variants={panelVariants}
                  initial="initial"
                  animate="open"
                  exit="exit"
                >
                  <Framer.motion.div
                    className="staff-header-notif__panel-header"
                    variants={blockVariants}
                  >
                    Soumises — pas encore ouvertes
                  </Framer.motion.div>
                  {error ? (
                    <Framer.motion.div className="staff-header-notif__err" variants={blockVariants}>
                      {error}
                    </Framer.motion.div>
                  ) : null}
                  {!error && loading && items.length === 0 ? (
                    <Framer.motion.div className="staff-header-notif__empty" variants={blockVariants}>
                      Chargement…
                    </Framer.motion.div>
                  ) : null}
                  {!error && !loading && items.length === 0 ? (
                    <Framer.motion.div className="staff-header-notif__empty" variants={blockVariants}>
                      Aucune demande en attente de traitement.
                    </Framer.motion.div>
                  ) : null}
                  {!error && items.length > 0 ? (
                    <Framer.motion.ul className="staff-header-notif__list" variants={listVariants}>
                      {items.map((row) => (
                        <Framer.motion.li key={row.id} className="staff-header-notif__item" variants={listItemVariants}>
                          <Link
                            className="staff-header-notif__link"
                            to={`/admin/requests/${row.id}`}
                            onClick={() => setOpen(false)}
                          >
                            <div className="staff-header-notif__ref">{row.reference}</div>
                            <div className="staff-header-notif__meta">
                              {row.service_name || "Service"}
                              {row.client_name ? ` · ${row.client_name}` : ""}
                              <br />
                              {formatSubmittedAt(row.submitted_at)}
                            </div>
                          </Link>
                        </Framer.motion.li>
                      ))}
                    </Framer.motion.ul>
                  ) : null}
                  <Framer.motion.div className="staff-header-notif__footer" variants={blockVariants}>
                    <Link to="/admin/requests?is_viewed=0" onClick={() => setOpen(false)}>
                      Voir les demandes pas encore consultées
                    </Link>
                  </Framer.motion.div>
                </Framer.motion.div>
              ) : null}
            </Framer.AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
