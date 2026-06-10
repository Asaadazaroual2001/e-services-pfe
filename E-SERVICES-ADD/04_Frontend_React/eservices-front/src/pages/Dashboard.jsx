import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CompanyLogo from "../components/brand/CompanyLogo";
import "./Dashboard.css";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="welcome-section dashboard-brand-row">
                        <CompanyLogo variant="header" alt="E-Services" className="dashboard-brand-logo" />
                        <div>
                            <h1>Dashboard</h1>
                            <p className="welcome-text">Bienvenue, {user?.name}</p>
                        </div>
                    </div>
                    <button className="logout-button" onClick={handleLogout}>
                        🚪 Déconnexion
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="dashboard-content">
                <div className="dashboard-grid">
                    {/* User Info Card */}
                    <div className="dashboard-card user-info-card">
                        <div className="card-header">
                            <h3>👤 Informations du Profil</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-item">
                                <span className="info-label">Nom:</span>
                                <span className="info-value">{user?.name}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Email:</span>
                                <span className="info-value">{user?.email}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Rôles:</span>
                                <div className="roles-list">
                                    {user?.roles?.map(role => (
                                        <span key={role} className={`role-badge role-${role}`}>
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Card */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>⚡ Actions Rapides</h3>
                        </div>
                        <div className="card-content">
                            <div className="actions-grid">
                                <button className="action-button">
                                    <span className="action-icon">📄</span>
                                    <span className="action-label">Mes Documents</span>
                                </button>
                                <button className="action-button">
                                    <span className="action-icon">📋</span>
                                    <span className="action-label">Mes Demandes</span>
                                </button>
                                <button className="action-button">
                                    <span className="action-icon">💬</span>
                                    <span className="action-label">Messages</span>
                                </button>
                                <button className="action-button">
                                    <span className="action-icon">⚙️</span>
                                    <span className="action-label">Paramètres</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Card */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>📊 Statistiques</h3>
                        </div>
                        <div className="card-content">
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-number">0</span>
                                    <span className="stat-label">Demandes en cours</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-number">0</span>
                                    <span className="stat-label">Documents</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-number">0</span>
                                    <span className="stat-label">Messages non lus</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-number">0</span>
                                    <span className="stat-label">Notifications</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Card */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>🕒 Activité Récente</h3>
                        </div>
                        <div className="card-content">
                            <div className="activity-list">
                                <div className="activity-item">
                                    <div className="activity-icon">🔐</div>
                                    <div className="activity-content">
                                        <span className="activity-text">Connexion à votre compte</span>
                                        <span className="activity-time">Il y a quelques instants</span>
                                    </div>
                                </div>
                                <div className="empty-activity">
                                    <span>Aucune autre activité récente</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
