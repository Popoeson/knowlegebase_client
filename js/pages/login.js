Utils.initTheme();

console.log("login.js loaded");
console.log("Utils:", typeof Utils);
console.log("Auth:", typeof Auth);
console.log("api:", typeof api);
console.log("Store:", typeof Store);
console.log("CONFIG:", typeof CONFIG);
console.log("loginForm:", document.getElementById("loginForm"));
console.log("togglePassword:", document.getElementById("togglePassword"));

document.addEventListener("DOMContentLoaded", () => {

    if (Auth.isLoggedIn()) {
        window.location.href = "./dashboard.html";
        return;
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

            Auth.setSession(response.token, response.user);

            if (response.user.role === "admin") {
                Utils.toast(response.message, "success");
                setTimeout(() => {
                    window.location.href = "./admin/dashboard.html";
                }, 1000);
                return;
            }

            if (!response.user.hasPaidRegistration) {
                Utils.toast("Please complete your registration payment to continue.", "warning");
                sessionStorage.setItem("kb_reg_email", emailInput.value.trim());
                setTimeout(() => {
                    window.location.href = "./registration-payment.html";
                }, 1500);
                return;
            }

            await Store.prefetch();

            Utils.toast(response.message, "success");

            setTimeout(() => {
                window.location.href = "./dashboard.html";
            }, 1000);

        } } catch (error) {
    console.error("Login error full object:", error);
    console.error("error.message:", error.message);
    console.error("error type:", typeof error);
    console.error("error stack:", error.stack);

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