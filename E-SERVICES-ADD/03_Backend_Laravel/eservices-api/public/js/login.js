import { csrf, apiFetch } from "./api.js";

async function login() {
  await csrf();
  await apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}
