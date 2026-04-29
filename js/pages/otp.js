Utils.initTheme();

// Get email from session
const email = sessionStorage.getItem("kb_otp_email");

// If no email in session, redirect back to register
if (!email) {
    window.location.href = "./register.html";
}

// Display email
const displayEmail = document.getElementById("displayEmail");
if (displayEmail) displayEmail.textContent = email;

// ── ELEMENT REFERENCES ──
const otpInputs = document.querySelectorAll(".otp-input");
const verifyBtn = document.getElementById("verifyBtn");
const resendBtn = document.getElementById("resendBtn");
const countdownEl = document.getElementById("countdown");

// ── OTP INPUT BEHAVIOUR ──
otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
        const value = e.target.value;

        // Only allow numbers
        if (!/^\d$/.test(value)) {
            input.value = "";
            return;
        }

        input.classList.add("filled");

        // Move to next input
        if (value && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (e) => {
        // Move back on backspace
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
let timeLeft = 600; // 10 minutes in seconds
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
            resendBtn.disabled = false;
            Utils.toast("Your OTP has expired. Please request a new one.", "warning");
        }

        // Enable resend after 60 seconds
        if (timeLeft <= 540) {
            resendBtn.disabled = false;
        }
    }, 1000);
};

startTimer();

// ── VERIFY OTP ──
verifyBtn.addEventListener("click", async () => {
    const otp = getOTPValue();

    if (otp.length !== 6) {
        Utils.toast("Please enter all 6 digits", "error");
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";

    try {
        const response = await api.post("/auth/verify-otp", { email, otp });

        Utils.toast(response.message, "success");

        // Clear session email
        sessionStorage.removeItem("kb_otp_email");

        setTimeout(() => {
            window.location.href = "./login.html";
        }, 1500);

    } catch (error) {
        Utils.toast(error.message, "error");
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify Email";
    }
});

// ── RESEND OTP ──
resendBtn.addEventListener("click", async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = "Sending...";

    try {
        const response = await api.post("/auth/resend-otp", { email });
        Utils.toast(response.message, "success");
        startTimer();
        resendBtn.textContent = "Resend OTP";

    } catch (error) {
        Utils.toast(error.message, "error");
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend OTP";
    }
});