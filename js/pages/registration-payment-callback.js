Utils.initTheme();

const verify = async () => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");
    const actionArea = document.getElementById("actionArea");

    const pendingToken = sessionStorage.getItem("kb_pending_token");

    const showSuccess = () => {
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

    const showPending = (message) => {
        statusIcon.textContent = "⏳";
        statusTitle.textContent = "Confirming Your Payment";
        statusMessage.textContent = message || "Your payment is still being confirmed by your bank. This can take a few minutes — don't worry, your money is safe.";
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

    localStorage.setItem("kb_pending_reg_ref", reference);

    // No pending session token — user needs to log back in to resume
    if (!pendingToken) {
        statusIcon.textContent = "🔐";
        statusTitle.textContent = "Please Log In";
        statusMessage.textContent = "Your session expired, but your payment reference has been saved. Log in to confirm your payment.";
        actionArea.innerHTML = `
            <a href="./login.html" class="btn btn-primary w-full">
                Log In to Continue
            </a>
        `;
        return;
    }

    try {
        const result = await fetch(`${CONFIG.API_BASE_URL}/auth/registration-payment/verify/${reference}`, {
            headers: { Authorization: `Bearer ${pendingToken}` }
        }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.message || "Verification failed");
            return data;
        });

        // Payment confirmed — clean up pending state, do NOT auto-login.
        // User must log in fresh to get a fully-paid session.
        sessionStorage.removeItem("kb_pending_token");
        sessionStorage.removeItem("kb_pending_user");
        localStorage.removeItem("kb_pending_reg_ref");

        showSuccess();

    } catch (error) {
        if (error.message.includes("already")) {
            sessionStorage.removeItem("kb_pending_token");
            sessionStorage.removeItem("kb_pending_user");
            localStorage.removeItem("kb_pending_reg_ref");
            showSuccess();
            return;
        }

        const lower = error.message.toLowerCase();
        const isHardFailure = lower.includes("not successful") ||
                               lower.includes("declined") ||
                               lower.includes("failed") ||
                               lower.includes("abandoned");

        if (isHardFailure) {
            localStorage.removeItem("kb_pending_reg_ref");
            showFailure(error.message);
        } else {
            showPending();
        }
    }
};

verify();