
const AUTH_API = "/api/auth";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }
});

async function handleLogin(event) {
    event.preventDefault();

    const message = document.getElementById("login-message");

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    message.textContent = "Logging in...";
    message.className = "form-message";

    try {
        const response = await fetch(`${AUTH_API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed");
        }

        localStorage.setItem("farmfresh_token", data.token);
        localStorage.setItem(
            "farmfresh_user",
            JSON.stringify(data.user)
        );

        message.textContent = "Login successful!";
        message.className = "form-message success";

        if (data.user.role === "admin") {
            window.location.href = "../admin/dashboard.html";
        } else {
            window.location.href = "index.html";
        }

    } catch (error) {
        message.textContent = error.message;
        message.className = "form-message error";
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const message = document.getElementById("register-message");

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    message.textContent = "Creating account...";
    message.className = "form-message";

    try {
        const response = await fetch(`${AUTH_API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Registration failed");
        }

        message.textContent =
            "Registration successful. Please login.";

        message.className = "form-message success";

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);

    } catch (error) {
        message.textContent = error.message;
        message.className = "form-message error";
    }
}

