Utils.initTheme();

const verify = async () => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");
    const actionArea = document.getElementById("actionArea");

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

    // Still pending — bank transfer or network hiccup, not a hard failure.
    // Save the reference so it can be auto-recovered later from
    // registration-payment.html, login.html, or a retry here.
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

    // Always preserve the reference for recovery, regardless of login state
    localStorage.setItem("kb_pending_reg_ref", reference);

    // If session was lost (e.g. redirected to login mid-flow), don't just
    // bounce away — the registration-payment.html recovery check will
    // pick this reference up automatically once the user logs back in.
    if (!Auth.isLoggedIn()) {
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
        await api.get(`/auth/registration-payment/verify/${reference}`);

        const user = Auth.getUser();
        if (user) {
            Auth.setSession(Auth.getToken(), {
                ...user,
                hasPaidRegistration: true
            });
        }

        localStorage.removeItem("kb_pending_reg_ref");
        showSuccess();

    } catch (error) {
        if (error.message.includes("already")) {
            localStorage.removeItem("kb_pending_reg_ref");
            showSuccess();
            return;
        }

        // Distinguish "not yet completed" (pending bank transfer) from a
        // genuine failure. Paystack returns specific failure language for
        // declined/abandoned transactions; anything else is treated as pending.
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