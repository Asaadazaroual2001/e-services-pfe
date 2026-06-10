import { http, csrf } from "./axiosClient";

export async function requestPasswordResetCode(email) {
    await csrf();
    const { data } = await http.post("/api/password/forgot", { email });
    return data;
}

export async function resetPasswordWithCode({ email, code, password, password_confirmation }) {
    await csrf();
    const { data } = await http.post("/api/password/reset", {
        email,
        code,
        password,
        password_confirmation,
    });
    return data;
}
