Utils.initTheme();

// Redirect if already logged in
if (Auth.isLoggedIn()) {
    window.location.href = "./dashboard.html";
}

// Get email from session
const email = sessionStorage.getItem("kb_reset_email");

// If no email in session redirect back to forgot password
if (!email) {
    window.location.href = "./forgot-password.html";
}

// Display email
const displayEmail = document.getElementById("displayEmail");
if (displayEmail) displayEmail.textContent = email;

// ── ELEMENT REFERENCES ──
const resetForm = document.getElementById("resetForm");
const resetBtn = document.getElementById("resetBtn");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const otpInputs = document.querySelectorAll(".otp-input");
const countdownEl = document.getElementById("countdown");

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

// ── OTP INPUT BEHAVIOUR ──
otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
        const value = e.target.value;

        if (!/^\d$/.test(value)) {
            input.value = "";
            return;
        }

        input.classList.add("filled");

        if (value && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
            otpInputs[index - 1].focus();
            otpInputs[index - 1].classList.remove("filled");
        }
    });

    input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").trim();
        if (/^\d{6}$/.test(pasted)) {
            otpInputs.forEach((inp, i) => {
                inp.value = pasted[i];
                inp.classList.add("filled");
            });
            otpInputs[5].focus();
        }
    });
});

// ── GET OTP VALUE ──
const getOTPValue = () => {
    return Array.from(otpInputs).map(inp => inp.value).join("");
};

// ── COUNTDOWN TIMER ──
let timeLeft = 600;
let timerInterval;

const startTimer = () => {
    clearInterval(timerInterval);
    timeLeft = 600;

    timerInterval = setInterval(() => {
        timeLeft--;

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        countdownEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            countdownEl.textContent = "00:00";
            Utils.toast("Your OTP has expired. Please request a new one.", "warning");
            setTimeout(() => {
                window.location.href = "./forgot-password.html";
            }, 2000);
        }
    }, 1000);
};

startTimer();

// ── VALIDATION ──
const showError = (id, message) => {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.classList.remove("hidden");
    }
};

const clearErrors = () => {
    ["passwordError", "confirmPasswordError"].forEach(id => {
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
resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = getOTPValue();

    if (otp.length !== 6) {
        Utils.toast("Please enter all 6 digits of your OTP", "error");
        return;
    }

    if (!validateForm()) return;

    resetBtn.disabled = true;
    resetBtn.textContent = "Resetting password...";

    try {
        const response = await api.post("/auth/reset-password", {
            email,
            otp,
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value
        });

        Utils.toast(response.message, "success");

        // Clear session
        sessionStorage.removeItem("kb_reset_email");
        clearInterval(timerInterval);

        setTimeout(() => {
            window.location.href = "./login.html";
        }, 1500);

    } catch (error) {
        Utils.toast(error.message, "error");
        resetBtn.disabled = false;
        resetBtn.textContent = "Reset Password";
    }
});