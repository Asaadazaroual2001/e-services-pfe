import { useAuth } from "../auth/AuthContext";
import { api, csrf } from "../api/axiosClient";
import { useNavigate } from "react-router-dom";

export default function WelcomePage() {
    const { user, setUser } = useAuth();
    const nav = useNavigate();

    async function logout() {
        await csrf();
        await api.post("/logout");
        setUser(null);
        nav("/login");
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Welcome Mr. {user?.name}</h2>
            <p>Roles: {(user?.roles || []).join(" | ") || "none"}</p>
            <button onClick={logout}>Logout</button>
        </div>
    );
}
