import React from "react";
import { useAuth } from "../auth/AuthContext";

export default function DebugAuth() {
    const { user, loading, isAuth, hasRole } = useAuth();

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999
        }}>
            <div>Loading: {loading ? 'true' : 'false'}</div>
            <div>IsAuth: {isAuth ? 'true' : 'false'}</div>
            <div>User: {user ? user.name : 'null'}</div>
            <div>Roles: {user?.roles ? JSON.stringify(user.roles) : 'null'}</div>
            <div>HasAdmin: {hasRole ? hasRole('admin') ? 'true' : 'false' : 'null'}</div>
        </div>
    );
}