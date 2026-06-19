Utils.initTheme();

const existingToken = sessionStorage.getItem("kb_token");
if (existingToken) {
    window.location.href = "./dashboard.html";
}

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

document.getElementById("togglePassword").addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    document.getElementById("togglePassword").textContent = type === "password" ? "👁" : "🙈";
});

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

        // Admins always get a full session
        if (response.user.role === "admin") {
            Auth.setSession(response.token, response.user);
            Utils.toast(response.message, "success");
            setTimeout(() => {
                window.location.href = "./admin/dashboard.html";
            }, 1000);
            return;
        }

        // Unpaid users — do NOT persist a session yet.
        // Store the token temporarily just to carry it to the payment page,
        // without marking the user as "logged in" app-wide.
        if (!response.user.hasPaidRegistration) {
            sessionStorage.setItem("kb_pending_token", response.token);
            sessionStorage.setItem("kb_pending_user", JSON.stringify(response.user));

            Utils.toast("Please complete your registration payment to continue.", "warning");
            setTimeout(() => {
                window.location.href = "./registration-payment.html";
            }, 1500);
            return;
        }

        // Fully paid — now it's safe to persist the session
        Auth.setSession(response.token, response.user);

        try {
            await Store.prefetch();
        } catch (prefetchError) {
            console.error("Store prefetch failed:", prefetchError);
        }

        Utils.toast(response.message, "success");

        setTimeout(() => {
            window.location.href = "./dashboard.html";
        }, 1000);

    } catch (error) {
        console.error("Login error:", error.message);

        if (error.message && error.message.includes("verify")) {
            Utils.toast(error.message, "warning");
            sessionStorage.setItem("kb_otp_email", emailInput.value.trim());
            setTimeout(() => {
                window.location.href = "./otp.html";
            }, 2000);
        } else {
            Utils.toast(error.message || "Login failed. Please try again.", "error");
        }

        loginBtn.disabled = false;
        loginBtn.textContent = "Log In";
    }
});