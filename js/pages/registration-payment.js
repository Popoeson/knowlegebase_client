Utils.initTheme();

const init = async () => {

    // If a payment was in progress and the user lands back here
    // (Paystack session interrupted during bank transfer), redirect to
    // callback page which will check if the bank transfer actually completed
    if (localStorage.getItem("kb_payment_in_progress") === "true") {
        const pendingRef = localStorage.getItem("kb_pending_reg_ref");
        if (pendingRef) {
            localStorage.removeItem("kb_payment_in_progress");
            window.location.href = `./registration-payment-callback.html?reference=${pendingRef}`;
            return;
        }
        localStorage.removeItem("kb_payment_in_progress");
    }

    // Read from the pending (unconfirmed) session, not the real one
    const pendingToken = sessionStorage.getItem("kb_pending_token");
    const pendingUserRaw = sessionStorage.getItem("kb_pending_user");
    const pendingUser = pendingUserRaw ? JSON.parse(pendingUserRaw) : null;

    // If a real, fully-paid session already exists, send to login to confirm identity
    if (Auth.isLoggedIn()) {
        const user = Auth.getUser();
        if (user && user.hasPaidRegistration) {
            window.location.href = "./login.html";
            return;
        }
    }

    // No pending session at all — user must log in first
    if (!pendingToken || !pendingUser) {
        window.location.href = "./login.html";
        return;
    }

    const payBtn = document.getElementById("payBtn");
    const amountNGNEl = document.getElementById("amountNGN");
    const totalDueEl = document.getElementById("totalDue");
    const exchangeNoteEl = document.getElementById("exchangeNote");
    const stuckLink = document.getElementById("stuckLink");
    const manualRecoveryBox = document.getElementById("manualRecoveryBox");
    const manualRefInput = document.getElementById("manualRefInput");
    const manualVerifyBtn = document.getElementById("manualVerifyBtn");

    const REGISTRATION_FEE_USD = 0.50;
    let priceNGN = null;

    const activateAndGoToLogin = (message) => {
        sessionStorage.removeItem("kb_pending_token");
        sessionStorage.removeItem("kb_pending_user");
        localStorage.removeItem("kb_pending_reg_ref");
        localStorage.removeItem("kb_payment_in_progress");
        Utils.toast(message || "Payment verified! Please log in.", "success");
        setTimeout(() => {
            window.location.href = "./login.html";
        }, 1500);
    };

    // ── RECOVERY CHECK ──
    const recoverPendingPayment = async () => {
        const pendingRef = localStorage.getItem("kb_pending_reg_ref");
        if (!pendingRef) return false;

        payBtn.disabled = true;
        payBtn.textContent = "Checking previous payment...";

        try {
            const r = await fetch(`${CONFIG.API_BASE_URL}/auth/registration-payment/verify/${pendingRef}`, {
                headers: { Authorization: `Bearer ${pendingToken}` }
            });
            const result = await r.json();

            if (r.ok || result.code === "ALREADY_PAID") {
                activateAndGoToLogin(result.message);
                return true;
            }

            // Payment genuinely not confirmed yet — show form normally
            localStorage.removeItem("kb_pending_reg_ref");
            payBtn.disabled = false;
            return false;

        } catch (error) {
            localStorage.removeItem("kb_pending_reg_ref");
            console.warn("Pending payment recovery check:", error.message);
            payBtn.disabled = false;
            return false;
        }
    };

    const recovered = await recoverPendingPayment();
    if (recovered) return;

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
            const r = await fetch(`${CONFIG.API_BASE_URL}/auth/registration-payment/initialize`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${pendingToken}`
                },
                body: JSON.stringify({ amountNGN: priceNGN })
            });
            const response = await r.json();

            if (!r.ok) {
                if (response.code === "ALREADY_PAID") {
                    Utils.toast("Account already activated. Please log in.", "info");
                    setTimeout(() => { window.location.href = "./login.html"; }, 1500);
                    return;
                }
                throw new Error(response.message || "Failed to initialize payment.");
            }

            // Mark payment as in progress BEFORE redirecting to Paystack
            // so we can recover if the user comes back without completing
            localStorage.setItem("kb_pending_reg_ref", response.reference);
            localStorage.setItem("kb_payment_in_progress", "true");

            window.location.href = response.authorizationUrl;

        } catch (error) {
            Utils.toast(error.message || "Failed to initialize payment.", "error");
            payBtn.disabled = false;
            payBtn.textContent = `💳 Pay ₦${priceNGN.toLocaleString("en-NG")} to Activate`;
        }
    });

    // ── MANUAL RECOVERY ──
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
            const r = await fetch(`${CONFIG.API_BASE_URL}/auth/registration-payment/verify/${ref}`, {
                headers: { Authorization: `Bearer ${pendingToken}` }
            });
            const result = await r.json();

            if (r.ok || result.code === "ALREADY_PAID") {
                activateAndGoToLogin(result.message);
                return;
            }

            throw new Error(result.message || "Could not verify payment.");

        } catch (error) {
            Utils.toast(error.message || "Could not verify that reference. Please contact support.", "error");
            manualVerifyBtn.disabled = false;
            manualVerifyBtn.textContent = "Check My Payment";
        }
    });

};

init();