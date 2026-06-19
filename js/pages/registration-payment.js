Utils.initTheme();

const init = async () => {

    // If already logged in and paid, go to login to confirm identity
    if (Auth.isLoggedIn()) {
        const user = Auth.getUser();
        if (user && user.hasPaidRegistration) {
            window.location.href = "./login.html";
            return;
        }
    }

    // Must be logged in (token set after OTP verification) to pay
    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
        return;
    }

    const payBtn = document.getElementById("payBtn");
    const amountNGNEl = document.getElementById("amountNGN");
    const totalDueEl = document.getElementById("totalDue");
    const exchangeNoteEl = document.getElementById("exchangeNote");

    const REGISTRATION_FEE_USD = 0.50;
    let priceNGN = null;

    // ── RECOVERY CHECK ──
    // If a previous payment attempt was interrupted (e.g. bank transfer,
    // slow callback, user navigated away), the reference is stored locally
    // before redirecting to Paystack. On every load, check for it first
    // and silently verify before showing the payment form again.
    const recoverPendingPayment = async () => {
        const pendingRef = localStorage.getItem("kb_pending_reg_ref");
        if (!pendingRef) return false;

        payBtn.disabled = true;
        payBtn.textContent = "Checking previous payment...";

        try {
            const result = await api.get(`/auth/registration-payment/verify/${pendingRef}`);

            // Verified successfully — clean up and send to login
            localStorage.removeItem("kb_pending_reg_ref");
            Utils.toast(result.message || "Payment verified! Please log in.", "success");

            setTimeout(() => {
                window.location.href = "./login.html";
            }, 1500);

            return true;

        } catch (error) {
            // Genuinely failed or not yet completed — clear it so it doesn't
            // block future attempts, and let the user pay normally
            localStorage.removeItem("kb_pending_reg_ref");
            console.warn("Pending payment recovery check:", error.message);
            return false;
        }
    };

    const recovered = await recoverPendingPayment();
    if (recovered) return; // page is redirecting to login, stop here

    // ── NORMAL PAYMENT FORM SETUP ──
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        const rate = data.rates.NGN;
        priceNGN = Math.round(REGISTRATION_FEE_USD * rate);
        const formatted = priceNGN.toLocaleString("en-NG");

        amountNGNEl.textContent = `₦${formatted}`;
        totalDueEl.textContent = `₦${formatted}`;
        exchangeNoteEl.textContent = `Exchange rate: $1 ≈ ₦${Math.round(rate).toLocaleString()}. Rate updates automatically.`;
        payBtn.textContent = `💳 Pay ₦${formatted} to Activate`;
        payBtn.disabled = false;

    } catch (error) {
        priceNGN = Math.round(REGISTRATION_FEE_USD * 1600);
        const formatted = priceNGN.toLocaleString("en-NG");
        amountNGNEl.textContent = `₦${formatted}`;
        totalDueEl.textContent = `₦${formatted}`;
        exchangeNoteEl.textContent = "Using fallback exchange rate.";
        payBtn.textContent = `💳 Pay ₦${formatted} to Activate`;
        payBtn.disabled = false;
    }

    // ── PAY BUTTON ──
    payBtn.addEventListener("click", async () => {
        payBtn.disabled = true;
        payBtn.textContent = "Redirecting to payment...";

        try {
            const response = await api.post("/auth/registration-payment/initialize", {
                amountNGN: priceNGN
            });

            // Store the reference BEFORE redirecting so we can recover
            // if the callback never completes (bank transfer, network drop, etc.)
            localStorage.setItem("kb_pending_reg_ref", response.reference);

            window.location.href = response.authorizationUrl;

        } catch (error) {
            if (error.message.includes("already paid") || error.code === "ALREADY_PAID") {
                Utils.toast("Account already activated. Please log in.", "info");
                setTimeout(() => {
                    window.location.href = "./login.html";
                }, 1500);
                return;
            }

            Utils.toast(error.message || "Failed to initialize payment.", "error");
            payBtn.disabled = false;
            payBtn.textContent = `💳 Pay ₦${priceNGN.toLocaleString("en-NG")} to Activate`;
        }
    });

};

// ── MANUAL RECOVERY ──
    const stuckLink = document.getElementById("stuckLink");
    const manualRecoveryBox = document.getElementById("manualRecoveryBox");
    const manualRefInput = document.getElementById("manualRefInput");
    const manualVerifyBtn = document.getElementById("manualVerifyBtn");

    stuckLink.addEventListener("click", (e) => {
        e.preventDefault();
        manualRecoveryBox.style.display =
            manualRecoveryBox.style.display === "none" ? "block" : "none";
    });

    manualVerifyBtn.addEventListener("click", async () => {
        const ref = manualRefInput.value.trim();

        if (!ref) {
            Utils.toast("Please paste your payment reference.", "error");
            return;
        }

        manualVerifyBtn.disabled = true;
        manualVerifyBtn.textContent = "Checking...";

        try {
            const result = await api.get(`/auth/registration-payment/verify/${ref}`);

            localStorage.removeItem("kb_pending_reg_ref");
            Utils.toast(result.message || "Payment verified! Please log in.", "success");

            setTimeout(() => {
                window.location.href = "./login.html";
            }, 1500);

        } catch (error) {
            Utils.toast(error.message || "Could not verify that reference. Please contact support.", "error");
            manualVerifyBtn.disabled = false;
            manualVerifyBtn.textContent = "Check My Payment";
        }
    });

init();