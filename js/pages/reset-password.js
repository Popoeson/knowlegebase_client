Utils.initTheme();

const email = sessionStorage.getItem("kb_reset_email");

if (!email) {
    window.location.href = "./forgot-password.html";
}

const displayEmail = document.getElementById("displayEmail");
if (displayEmail) displayEmail.textContent = email;

const otpInputs = document.querySelectorAll(".otp-input");
const resetForm = document.getElementById("resetForm");
const resetBtn = document.getElementById("resetBtn");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

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

const getOTPValue = () => Array.from(otpInputs).map(inp => inp.value).join("");

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
        document.getElementById("countdown").textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById("countdown").textContent = "00:00";
            Utils.toast("OTP has expired. Please request a new one.", "warning");
            setTimeout(() => {
                window.location.href = "./forgot-password.html";
            }, 2000);
        }
    }, 1000);
};

startTimer();

// ── PASSWORD TOGGLE ──
document.getElementById("togglePassword").addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    document.getElementById("togglePassword").textContent = type === "password" ? "👁" : "🙈";
});

document.getElementById("toggleConfirm").addEventListener("click", () => {
    const type = confirmPasswordInput.type === "password" ? "text" : "password";
    confirmPasswordInput.type = type;
    document.getElementById("toggleConfirm").textContent = type === "password" ? "👁" : "🙈";
});

// ── VALIDATION ──
const showError = (id, message) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = message; el.classList.remove("hidden"); }
};

const clearErrors = () => {
    ["passwordError", "confirmPasswordError"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
    });
};

// ── FORM SUBMIT ──
resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const otp = getOTPValue();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    let valid = true;

    if (otp.length !== 6) {
        Utils.toast("Please enter all 6 OTP digits", "error");
        valid = false;
    }

    if (!password) {
        showError("passwordError", "Password is required");
        valid = false;
    } else if (password.length < 6) {
        showError("passwordError", "Password must be at least 6 characters");
        valid = false;
    }

    if (!confirmPassword) {
        showError("confirmPasswordError", "Please confirm your password");
        valid = false;
    } else if (password !== confirmPassword) {
        showError("confirmPasswordError", "Passwords do not match");
        valid = false;
    }

    if (!valid) return;

    resetBtn.disabled = true;
    resetBtn.textContent = "Resetting...";

    try {
        const response = await api.post("/auth/reset-password", {
            email,
            otp,
            password,
            confirmPassword
        });

        Utils.toast(response.message, "success");
        sessionStorage.removeItem("kb_reset_email");

        setTimeout(() => {
            window.location.href = "./login.html";
        }, 1500);

    } catch (error) {
        Utils.toast(error.message, "error");
        resetBtn.disabled = false;
        resetBtn.textContent = "Reset Password";
    }
});