// src/api/auth.js
import { http, csrf } from "./axiosClient";

export async function login(email, password, remember = false) {
  await csrf(); // obligatoire avant /login
  await http.post("/login", { email, password, remember: !!remember });
  const { data } = await http.get("/api/me");
  return data;
}

export async function register(name, email, cin, password, password_confirmation) {
  await csrf();
  await http.post("/register", { name, email, cin, password, password_confirmation });
  return await me();
}

export async function logout() {
  await csrf();
  await http.post("/logout");
}

export async function me() {
  const { data } = await http.get("/api/me");
  return data;
}

/** Met à jour le compte connecté (PUT /api/me) : nom, e-mail, CIN, mot de passe optionnel. */
export async function updateMyProfile({
  name,
  email,
  cin,
  current_password,
  password,
  password_confirmation,
}) {
  await csrf();
  const payload = {
    name: name?.trim(),
    email: email?.trim(),
    cin: cin != null && String(cin).trim() !== "" ? String(cin).trim() : null,
  };
  if (password) {
    payload.current_password = current_password;
    payload.password = password;
    payload.password_confirmation = password_confirmation;
  }
  const { data } = await http.put("/api/me", payload);
  return data;
}
