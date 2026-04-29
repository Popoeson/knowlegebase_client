Utils.initTheme();

// Redirect if already logged in
if (Auth.isLoggedIn()) {
    window.location.href = "./dashboard.html";
}

// ── ELEMENT REFERENCES ──
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// ── PASSWORD TOGGLE ──
document.getElementById("togglePassword").addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    document.getElementById("togglePassword").textContent = type === "password" ? "👁" : "🙈";
});

// ── VALIDATION ──
const showError = (id, message) => {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.classList.remove("hidden");
    }
};

const clearErrors = () => {
    ["emailError", "passwordError"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = "";
            el.classList.add("hidden");
        }
    });
};

const validateForm = () => {
    let valid = true;
    clearErrors();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailInput.value.trim()) {
        showError("emailError", "Email is required");
        valid = false;
    } else if (!emailRegex.test(emailInput.value.trim())) {
        showError("emailError", "Enter a valid email address");
        valid = false;
    }

    if (!passwordInput.value) {
        showError("passwordError", "Password is required");
        valid = false;
    }

    return valid;
};

// ── FORM SUBMIT ──
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        const response = await api.post("/auth/login", {
            email: emailInput.value.trim(),
            password: passwordInput.value
        });

        // Save session
        Auth.setSession(response.token, response.user);

        Utils.toast(response.message, "success");

        // Redirect based on role
        setTimeout(() => {
            if (response.user.role === "admin") {
                window.location.href = "./admin/dashboard.html";
            } else {
                window.location.href = "./dashboard.html";
            }
        }, 1000);

    } catch (error) {
        // Handle unverified account
        if (error.message.includes("verify")) {
            Utils.toast(error.message, "warning");
            sessionStorage.setItem("kb_otp_email", emailInput.value.trim());
            setTimeout(() => {
                window.location.href = "./otp.html";
            }, 2000);
        } else {
            Utils.toast(error.message, "error");
        }

        loginBtn.disabled = false;
        loginBtn.textContent = "Log In";
    }
});