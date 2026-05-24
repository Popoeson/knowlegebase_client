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

    if (!reference) {
        showFailure("No payment reference found.");
        return;
    }

    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
        return;
    }

    try {
        await api.get(`/auth/registration-payment/verify/${reference}`);

        // Update local session so hasPaidRegistration reflects true
        const user = Auth.getUser();
        if (user) {
            Auth.setSession(Auth.getToken(), {
                ...user,
                hasPaidRegistration: true
            });
        }

        showSuccess();

    } catch (error) {
        if (error.message.includes("already")) {
            // Already paid — treat as success
            showSuccess();
            return;
        }
        showFailure(error.message);
    }
};

verify();