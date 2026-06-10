export async function csrf() {
  await fetch("http://127.0.0.1:8000/sanctum/csrf-cookie", {
    credentials: "include"
  });
}

export async function apiFetch(url, options = {}) {
  return fetch("http://127.0.0.1:8000" + url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
}
