Utils.initTheme();

const verify = async () => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");
    const actionArea = document.getElementById("actionArea");

    const pendingToken = sessionStorage.getItem("kb_pending_token");

    const cleanup = () => {
        sessionStorage.removeItem("kb_pending_token");
        sessionStorage.removeItem("kb_pending_user");
        localStorage.removeItem("kb_pending_reg_ref");
        localStorage.removeItem("kb_payment_in_progress");
    };

    const showSuccess = () => {
        cleanup();
        statusIcon.textContent = "🎉";
        statusTitle.textContent = "Account Activated!";
        statusMessage.textContent = "Your registration is complete. Please log in to access your dashboard.";
        actionArea.innerHTML = `
            <a href="./login.html" class="btn btn-primary w-full">
                Log In to Continue
            </a>
        `;
    };

    const showFailure = (message) => {
        statusIcon.textContent = "❌";
        statusTitle.textContent = "Payment Failed";
        statusMessage.textContent = message || "Your payment could not be verified. Please try again.";
        actionArea.innerHTML = `
            <a href="./registration-payment.html" class="btn btn-primary w-full">
                Try Again
            </a>
            <a href="./login.html" class="btn btn-ghost w-full" style="margin-top: var(--space-3);">
                Back to Login
            </a>
        `;
    };

    const showPending = () => {
        statusIcon.textContent = "⏳";
        statusTitle.textContent = "Confirming Your Payment";
        statusMessage.textContent = "Your payment is still being confirmed by your bank. This can take a few minutes — don't worry, your money is safe.";
        actionArea.innerHTML = `
            <button class="btn btn-primary w-full" id="retryVerifyBtn">
                🔄 Check Again
            </button>
            <a href="./login.html" class="btn btn-ghost w-full" style="margin-top: var(--space-3);">
                I'll check back later
            </a>
        `;
        document.getElementById("retryVerifyBtn").addEventListener("click", () => {
            verify();
        });
    };

    if (!reference) {
        showFailure("No payment reference found.");
        return;
    }

    // Always preserve reference for recovery
    localStorage.setItem("kb_pending_reg_ref", reference);

    // No pending token — session was lost (switched device, browser cleared, etc.)
    // The reference is saved so manual recovery on the payment page still works
    if (!pendingToken) {
        statusIcon.textContent = "🔐";
        statusTitle.textContent = "Please Log In";
        statusMessage.textContent = "Your session expired, but your payment reference has been saved. Log in and your payment will be automatically confirmed.";
        actionArea.innerHTML = `
            <a href="./login.html" class="btn btn-primary w-full">
                Log In to Continue
            </a>
        `;
        return;
    }

    try {
        const r = await fetch(`${CONFIG.API_BASE_URL}/auth/registration-payment/verify/${reference}`, {
            headers: { Authorization: `Bearer ${pendingToken}` }
        });

        const result = await r.json();

        if (r.ok || result.code === "ALREADY_PAID") {
            showSuccess();
            return;
        }

        // Payment not confirmed — check if it's still pending or genuinely failed
        const lower = (result.message || "").toLowerCase();
        const isHardFailure = lower.includes("not successful") ||
                               lower.includes("declined") ||
                               lower.includes("failed") ||
                               lower.includes("abandoned");

        if (isHardFailure) {
            localStorage.removeItem("kb_pending_reg_ref");
            localStorage.removeItem("kb_payment_in_progress");
            showFailure(result.message);
        } else {
            showPending();
        }

    } catch (error) {
        const lower = (error.message || "").toLowerCase();
        const isHardFailure = lower.includes("not successful") ||
                               lower.includes("declined") ||
                               lower.includes("failed") ||
                               lower.includes("abandoned");

        if (isHardFailure) {
            localStorage.removeItem("kb_pending_reg_ref");
            localStorage.removeItem("kb_payment_in_progress");
            showFailure(error.message);
        } else {
            showPending();
        }
    }
};

verify();