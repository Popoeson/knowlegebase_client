Utils.initTheme();

// Redirect if already logged in
if (Auth.isLoggedIn()) {
    window.location.href = "./dashboard.html";
}

// ── ELEMENT REFERENCES ──
const forgotForm = document.getElementById("forgotForm");
const forgotBtn = document.getElementById("forgotBtn");
const emailInput = document.getElementById("email");

// ── VALIDATION ──
const showError = (id, message) => {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.classList.remove("hidden");
    }
};

const clearErrors = () => {
    const el = document.getElementById("emailError");
    if (el) {
        el.textContent = "";
        el.classList.add("hidden");
    }
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

    return valid;
};

// ── FORM SUBMIT ──
forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    forgotBtn.disabled = true;
    forgotBtn.textContent = "Sending OTP...";

    try {
        const response = await api.post("/auth/forgot-password", {
            email: emailInput.value.trim()
        });

        Utils.toast(response.message, "success");

        // Store email for reset password page
        sessionStorage.setItem("kb_reset_email", emailInput.value.trim());

        setTimeout(() => {
            window.location.href = "./reset-password.html";
        }, 1500);

    } catch (error) {
        Utils.toast(error.message, "error");
        forgotBtn.disabled = false;
        forgotBtn.textContent = "Send OTP";
    }
});