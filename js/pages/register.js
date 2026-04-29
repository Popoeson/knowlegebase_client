Utils.initTheme();

// Redirect if already logged in
if (Auth.isLoggedIn()) {
    window.location.href = "./dashboard.html";
}

// ── ELEMENT REFERENCES ──
const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");
const firstNameInput = document.getElementById("firstName");
const surnameInput = document.getElementById("surname");
const otherNameInput = document.getElementById("otherName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

// ── PASSWORD TOGGLES ──
document.getElementById("togglePassword").addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    document.getElementById("togglePassword").textContent = type === "password" ? "👁" : "🙈";
});

document.getElementById("toggleConfirmPassword").addEventListener("click", () => {
    const type = confirmPasswordInput.type === "password" ? "text" : "password";
    confirmPasswordInput.type = type;
    document.getElementById("toggleConfirmPassword").textContent = type === "password" ? "👁" : "🙈";
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
    ["firstNameError", "surnameError", "emailError", "passwordError", "confirmPasswordError"]
        .forEach(id => {
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

    if (!firstNameInput.value.trim()) {
        showError("firstNameError", "First name is required");
        valid = false;
    }

    if (!surnameInput.value.trim()) {
        showError("surnameError", "Surname is required");
        valid = false;
    }

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
    } else if (passwordInput.value.length < 6) {
        showError("passwordError", "Password must be at least 6 characters");
        valid = false;
    }

    if (!confirmPasswordInput.value) {
        showError("confirmPasswordError", "Please confirm your password");
        valid = false;
    } else if (passwordInput.value !== confirmPasswordInput.value) {
        showError("confirmPasswordError", "Passwords do not match");
        valid = false;
    }

    return valid;
};

// ── FORM SUBMIT ──
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    registerBtn.disabled = true;
    registerBtn.textContent = "Creating account...";

    try {
        const response = await api.post("/auth/register", {
            firstName: firstNameInput.value.trim(),
            otherName: otherNameInput.value.trim(),
            surname: surnameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value
        });

        Utils.toast(response.message, "success");

        // Store email for OTP page
        sessionStorage.setItem("kb_otp_email", emailInput.value.trim());

        setTimeout(() => {
            window.location.href = "./otp.html";
        }, 1500);

    } catch (error) {
        Utils.toast(error.message, "error");
        registerBtn.disabled = false;
        registerBtn.textContent = "Create Account";
    }
});