async function getCsrfCookie() {
  await fetch("http://127.0.0.1:8000/sanctum/csrf-cookie", {
    credentials: "include"
  });
}

async function login() {
  await getCsrfCookie(); // ⬅️ هنا

  await fetch("http://127.0.0.1:8000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: document.getElementById("email").value,
      password: document.getElementById("password").value
    })
  });
}
