import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useSidebarMenuAnimation } from "../../hooks/useSidebarMenuAnimation";
import { useMobileAppChrome } from "../../hooks/useMediaQuery";
import HeaderBrandMark from "../../components/brand/HeaderBrandMark";
import BrandedScrollHeader from "../../components/layout/BrandedScrollHeader";
import MobileNavMenuButton from "../../components/layout/MobileNavMenuButton";
import "./EmployeeLayout.css";
import "../../styles/brandedAppHeader.css";

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
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

  const allowedRoles = user?.roles || [];
  const rolePriority = ["director", "responsable", "agent", "reception"];
  const primaryRole = rolePriority.find((r) => allowedRoles.includes(r)) || "employee";

  const roleLabelMap = {
    agent: "Agent",
    responsable: "Responsable",
    director: "Director",
    reception: "Reception",
  };

  const roleLabel = roleLabelMap[primaryRole] || primaryRole;

  const menuItems = [
    { path: "/employee/dashboard", label: "Dashboard" },
    { path: "/employee/requests", label: "Demandes" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const employeePageTitle = location.pathname.includes("/requests")
    ? "Gestion des demandes"
    : "Dashboard";

  const closeMobileNav = () => setMobileNavOpen(false);
  const goNav = (path) => {
    navigate(path);
    if (isMobileChrome) closeMobileNav();
  };

  const layoutClass =
    `employee-layout${isMobileChrome && mobileNavOpen ? " app-layout--mobile-nav-open" : ""}`.trim();

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
      <aside className={`employee-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarMenuAnim}`.trim()}>
        <div className="sidebar-header">
          <div className="logo">
            <HeaderBrandMark placement="sidebar" />
          </div>
          <button
            className="collapse-btn"
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? "Développer le menu" : "Réduire le menu"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <div className="role-badge-wrap">
          <div className="role-badge">{roleLabel}</div>
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
                  <span className="nav-icon" aria-hidden />
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.roles?.join(", ")}</div>
            </div>
          </div>
          <button className="logout-btn" type="button" onClick={handleLogout}>
            <span className="logout-icon" />
            <span className="logout-label">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="employee-main">
        <BrandedScrollHeader
          scrollElement={mainScrollEl}
          className="employee-header"
          left={
            isMobileChrome ? (
              <MobileNavMenuButton onClick={() => setMobileNavOpen(true)} />
            ) : (
              <h1 className="app-branded-header__title">{employeePageTitle}</h1>
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
            <h1 className="app-branded-header__title">{employeePageTitle}</h1>
          </div>
        ) : null}
        <div className="employee-main-scroll" ref={setMainScrollEl}>
          <div className="employee-content">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
