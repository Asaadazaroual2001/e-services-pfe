import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useSidebarMenuAnimation } from "../../hooks/useSidebarMenuAnimation";
import { useMobileAppChrome } from "../../hooks/useMediaQuery";
import { getService } from "../../api/clientApi";
import HeaderBrandMark from "../../components/brand/HeaderBrandMark";
import BrandedScrollHeader from "../../components/layout/BrandedScrollHeader";
import MobileNavMenuButton from "../../components/layout/MobileNavMenuButton";
import "./ClientLayout.css";
import "../../styles/brandedAppHeader.css";

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId } = useParams();
  const { collapsed: sidebarCollapsed, menuAnim: sidebarMenuAnim, toggle: toggleSidebar } =
    useSidebarMenuAnimation(false);
  const [serviceTitle, setServiceTitle] = useState("");
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

  const menuItems = [
    { path: "/client/services", label: "Services", icon: "services" },
    { path: "/client/requests", label: "Mes Demandes", icon: "requests" },
    { path: "/client/profile", label: "Mon profil", icon: "profile" },
  ];

  const isServiceDetails = Boolean(serviceId) && location.pathname.endsWith("/details");

  React.useEffect(() => {
    let cancelled = false;
    async function loadTitle() {
      if (!isServiceDetails || !serviceId) return;
      try {
        const res = await getService(serviceId);
        if (!cancelled) setServiceTitle(res?.data?.name || "");
      } catch {
        if (!cancelled) setServiceTitle("");
      }
    }
    loadTitle();
    return () => {
      cancelled = true;
    };
  }, [isServiceDetails, serviceId]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const clientPageTitle = isServiceDetails
    ? serviceTitle
      ? `Détails : ${serviceTitle}`
      : "Détails du service"
    : location.pathname.includes("/services")
      ? "Services"
      : "Mes demandes";

  const closeMobileNav = () => setMobileNavOpen(false);
  const goNav = (path) => {
    navigate(path);
    if (isMobileChrome) closeMobileNav();
  };

  const layoutClass =
    `client-layout${isMobileChrome && mobileNavOpen ? " app-layout--mobile-nav-open" : ""}`.trim();

  return (
    <div className={layoutClass}>
      {isMobileChrome && mobileNavOpen ? (
        <button
          type="button"
          className="app-mobile-nav-backdrop"
          aria-label="Fermer le menu"
          onClick={closeMobileNav}
        />
      ) : null}
      <aside className={`client-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarMenuAnim}`.trim()}>
        <div className="sidebar-header">
          <div className="logo">
            <HeaderBrandMark placement="sidebar" />
          </div>
          <button
            className="collapse-btn"
            onClick={toggleSidebar}
            type="button"
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? "Développer le menu" : "Réduire le menu"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navigation principale">
          <ul
            className="sidebar-nav-list"
            style={{ "--sidebar-nav-count": Math.max(menuItems.length, 1) }}
          >
            {menuItems.map((item, index) => (
              <li key={item.path} className="sidebar-nav-item" style={{ "--nav-i": index }}>
                <button
                  type="button"
                  className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                  onClick={() => goNav(item.path)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className={`nav-icon icon-${item.icon}`} aria-hidden />
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.roles?.join(", ")}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} type="button">
            <span className="logout-icon" />
            <span className="logout-label">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="client-main">
        <BrandedScrollHeader
          scrollElement={mainScrollEl}
          className="client-header"
          left={
            isMobileChrome ? (
              <MobileNavMenuButton onClick={() => setMobileNavOpen(true)} />
            ) : (
              <h1 className="app-branded-header__title">{clientPageTitle}</h1>
            )
          }
          center={<HeaderBrandMark />}
          right={
            isMobileChrome ? (
              <span className="app-mobile-header-spacer" aria-hidden />
            ) : (
              <span className="app-branded-header__welcome">Bienvenue, {user?.name}</span>
            )
          }
        />
        {isMobileChrome ? (
          <div className="app-mobile-page-title">
            <h1 className="app-branded-header__title">{clientPageTitle}</h1>
          </div>
        ) : null}
        <div className="client-main-scroll" ref={setMainScrollEl}>
          <div className="client-content">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
