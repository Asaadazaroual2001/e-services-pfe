// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import * as Auth from "../api/auth";
import { normalizeRolesFromMe } from "../utils/staffPostLoginWelcome";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    /** Bienvenue staff : corps du texte + affichage du lien « Consulter les demandes » (optionnel). */
    const [staffWelcome, setStaffWelcome] = useState(null);

    function applyUserPayload(u) {
        if (!u) return null;
        const roles = normalizeRolesFromMe(u);
        return { ...u, roles };
    }

    async function refresh() {
        try {
            const u = await Auth.me();
            setUser(applyUserPayload(u));
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    const value = {
        user,
        loading,
        isAuth: !!user,
        hasRole: (r) => !!user?.roles?.includes(r),
        hasAnyRole: (roleList) =>
            Array.isArray(roleList) && roleList.some((r) => user?.roles?.includes(r)),
        login: async (email, password, remember = false) => {
            try {
                const u = await Auth.login(email, password, remember);
                const merged = applyUserPayload(u);
                setUser(merged);
                return merged;
            } catch (error) {
                setUser(null);
                throw error; // Re-throw to preserve error details
            }
        },
        register: async (name, email, cin, password, password_confirmation) => {
            try {
                const u = await Auth.register(name, email, cin, password, password_confirmation);
                const merged = applyUserPayload(u);
                setUser(merged);
                return merged;
            } catch (error) {
                setUser(null);
                throw error;
            }
        },
        logout: async () => {
            try {
                await Auth.logout();
                setUser(null);
                setStaffWelcome(null);
            } catch (error) {
                // Even if logout fails, clear user state
                setUser(null);
                setStaffWelcome(null);
                throw error;
            }
        },
        refresh,
        staffWelcome,
        setStaffWelcome,
        clearStaffWelcomeMessage: () => setStaffWelcome(null),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
