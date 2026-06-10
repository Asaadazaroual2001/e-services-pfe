import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useSidebarMenuAnimation } from "../../hooks/useSidebarMenuAnimation";
import { useMobileAppChrome } from "../../hooks/useMediaQuery";
import HeaderBrandMark from "../brand/HeaderBrandMark";
import BrandedScrollHeader from "../layout/BrandedScrollHeader";
import MobileNavMenuButton from "../layout/MobileNavMenuButton";
import StaffHeaderNotifications from "../layout/StaffHeaderNotifications";
import StaffWelcomeOverlay from "./StaffWelcomeOverlay";
import "./AdminLayout.css";
import "../../styles/brandedAppHeader.css";

/** Icônes ligne fines (SVG) pour un rendu net sur tous écrans */
function SidebarIcon({ name, className = "" }) {
    const stroke = "currentColor";
    const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };
    const icons = {
        dashboard: (
            <svg {...common} aria-hidden>
                <path stroke={stroke} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
            </svg>
        ),
        users: (
            <svg {...common} aria-hidden>
                <path stroke={stroke} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle stroke={stroke} cx="9" cy="7" r="4" />
                <path stroke={stroke} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        services: (
            <svg {...common} aria-hidden>
                <rect stroke={stroke} x="3" y="3" width="7" height="7" rx="1" />
                <rect stroke={stroke} x="14" y="3" width="7" height="7" rx="1" />
                <rect stroke={stroke} x="14" y="14" width="7" height="7" rx="1" />
                <rect stroke={stroke} x="3" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
        requests: (
            <svg {...common} aria-hidden>
                <path stroke={stroke} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path stroke={stroke} d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
            </svg>
        ),
        mail: (
            <svg {...common} aria-hidden>
                <rect stroke={stroke} x="2" y="4" width="20" height="16" rx="2" />
                <path stroke={stroke} d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
        ),
        shield: (
            <svg {...common} aria-hidden>
                <path stroke={stroke} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path stroke={stroke} d="m9 12 2 2 4-4" />
            </svg>
        ),
        settings: (
            <svg {...common} aria-hidden>
                <circle stroke={stroke} cx="12" cy="12" r="3" />
                <path stroke={stroke} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
        ),
    };
    return <span className={`nav-icon-svg ${className}`.trim()}>{icons[name] || icons.dashboard}</span>;
}

function menuItemIsActive(pathname, itemPath) {
    if (pathname === itemPath) return true;
    if (itemPath === "/admin/dashboard") return pathname.startsWith("/admin/dashboard/");
    return pathname.startsWith(`${itemPath}/`);
}

export default function AdminLayout() {
    const { user, logout, hasRole, hasAnyRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { collapsed: sidebarCollapsed, menuAnim: sidebarMenuAnim, toggle: toggleSidebar } =
        useSidebarMenuAnimation(false);
    const [mainScrollEl, setMainScrollEl] = useState(null);
    const isMobileChrome = useMobileAppChrome();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const id = requestAnimationFrame(() => {
            if (!cancelled) setMobileNavOpen(false);
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(id);
        };
    }, [location.pathname]);

    useEffect(() => {
        if (!isMobileChrome || !mobileNavOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isMobileChrome, mobileNavOpen]);

    useEffect(() => {
        if (!mobileNavOpen) return;
        const onKey = (e) => {
            if (e.key === "Escape") setMobileNavOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [mobileNavOpen]);

    const allMenuItems = [
        {
            path: "/admin/dashboard",
            label: "Tableau de bord",
            icon: "dashboard",
            access: "dashboard",
        },
        {
            path: "/admin/users",
            label: "Gestion des clients",
            icon: "users",
            access: "admin",
        },
        {
            path: "/admin/services",
            label: "Gestion des Services",
            icon: "services",
            access: "services",
        },
        {
            path: "/admin/requests",
            label: "Gestion des Demandes",
            icon: "requests",
            access: "requests",
        },
        {
            path: "/admin/client-emails",
            label: "E-mails clients",
            icon: "mail",
            access: "requests",
        },
        {
            path: "/admin/roles",
            label: "Agences & employés",
            icon: "shield",
            access: "admin",
        },
        {
            path: "/admin/settings",
            label: "Paramètres",
            icon: "settings",
            access: "settings",
        },
    ];

    const menuItems = allMenuItems.filter((item) => {
        if (item.access === "dashboard") return hasAnyRole(["admin", "responsable", "agent"]);
        if (item.access === "admin") return hasRole("admin");
        if (item.access === "services") return hasAnyRole(["admin", "responsable"]);
        if (item.access === "requests") return hasAnyRole(["admin", "agent", "responsable"]);
        if (item.access === "settings") return hasAnyRole(["admin", "responsable"]);
        return false;
    });

    const p = location.pathname;
    let pageTitle = menuItems.find((item) => item.path === p)?.label || "Dashboard Admin";
    if (p.includes("/services/")) {
        if (p.includes("/fields")) pageTitle = "Gestion des Champs";
        else if (p.includes("/edit")) pageTitle = "Modifier le Service";
        else if (p.includes("/new")) pageTitle = "Nouveau Service";
    } else if (p.includes("/requests/") && p !== "/admin/requests") {
        pageTitle = "Détails de la Demande";
    } else if (p.includes("/client-emails")) {
        pageTitle = "E-mails clients";
    }

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const closeMobileNav = () => setMobileNavOpen(false);
    const goNav = (path) => {
        navigate(path);
        if (isMobileChrome) closeMobileNav();
    };

    const layoutClass =
        `admin-layout${isMobileChrome && mobileNavOpen ? " app-layout--mobile-nav-open" : ""}`.trim();

    return (
        <div className={layoutClass}>
            <StaffWelcomeOverlay />
            {isMobileChrome && mobileNavOpen ? (
                <button
                    type="button"
                    className="app-mobile-nav-backdrop"
                    aria-label="Fermer le menu"
                    onClick={closeMobileNav}
                />
            ) : null}
            <aside
                className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarMenuAnim}`.trim()}
                aria-label="Navigation principale"
            >
                <div className="sidebar-header">
                    <div className="logo">
                        <HeaderBrandMark placement="sidebar" />
                        <div className="logo-text-wrap">
                            <span className="logo-text">Admin Panel</span>
                            <span className="logo-sub">E-Services</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="collapse-btn"
                        onClick={toggleSidebar}
                        aria-expanded={!sidebarCollapsed}
                        aria-label={sidebarCollapsed ? "Développer le menu" : "Réduire le menu"}
                    >
                        <span className="collapse-btn-icon" aria-hidden>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                {sidebarCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
                            </svg>
                        </span>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <ul
                        className="sidebar-nav-list"
                        style={{ "--sidebar-nav-count": Math.max(menuItems.length, 1) }}
                    >
                        {menuItems.map((item, index) => {
                            const active = menuItemIsActive(location.pathname, item.path);
                            return (
                                <li
                                    key={item.path}
                                    className="sidebar-nav-item"
                                    style={{ "--nav-i": index }}
                                >
                                    <button
                                        type="button"
                                        className={`nav-item ${active ? "active" : ""}`}
                                        onClick={() => goNav(item.path)}
                                        title={sidebarCollapsed ? item.label : undefined}
                                        aria-current={active ? "page" : undefined}
                                    >
                                        <span className="nav-item-glow" aria-hidden />
                                        <SidebarIcon name={item.icon} />
                                        <span className="nav-label">{item.label}</span>
                                        {active && <span className="nav-active-indicator" aria-hidden />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                        <div className="user-details">
                            <div className="user-name">{user?.name}</div>
                            <div className="user-role">
                                {(user?.roles || [])
                                    .map((r) =>
                                        r === "responsable"
                                            ? "Responsable d'agence"
                                            : r === "agent"
                                              ? "Agent d'agence"
                                              : r
                                    )
                                    .join(", ")}
                            </div>
                        </div>
                    </div>
                    <button type="button" className="logout-btn" onClick={handleLogout} title="Déconnexion">
                        <span className="logout-icon" aria-hidden>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </span>
                        <span className="logout-label">Déconnexion</span>
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <BrandedScrollHeader
                    scrollElement={mainScrollEl}
                    className="admin-header"
                    left={
                        isMobileChrome ? (
                            <MobileNavMenuButton onClick={() => setMobileNavOpen(true)} />
                        ) : (
                            <h1 className="app-branded-header__title">{pageTitle}</h1>
                        )
                    }
                    center={<HeaderBrandMark />}
                    right={
                        <div className="app-branded-header__right-inner">
                            <StaffHeaderNotifications scrollElement={mainScrollEl} />
                            <span className="app-branded-header__welcome">Bienvenue, {user?.name}</span>
                        </div>
                    }
                />
                {isMobileChrome ? (
                    <div className="app-mobile-page-title">
                        <h1 className="app-branded-header__title">{pageTitle}</h1>
                    </div>
                ) : null}
                <div className="admin-main-scroll" ref={setMainScrollEl}>
                    <div className="admin-content">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
