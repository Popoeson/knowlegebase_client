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

    // Fetch live exchange rate
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
        // Fallback rate
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

            // Redirect to Paystack hosted payment page
            window.location.href = response.authorizationUrl;

        } catch (error) {
            // Already paid — go to login
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

init();