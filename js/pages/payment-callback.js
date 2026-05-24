Utils.initTheme();

const verify = async () => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    const courseId = sessionStorage.getItem("kb_payment_courseId");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");
    const actionArea = document.getElementById("actionArea");

    const showSuccess = () => {
        statusIcon.textContent = "✅";
        statusTitle.textContent = "Payment Successful!";
        statusMessage.textContent = "Your payment has been confirmed. Starting your exam now...";
        setTimeout(() => {
            sessionStorage.removeItem("kb_payment_courseId");
            window.location.href = `./exam.html?id=${courseId}&type=certification`;
        }, 2000);
    };

    const showFailure = (message) => {
        statusIcon.textContent = "❌";
        statusTitle.textContent = "Payment Failed";
        statusMessage.textContent = message || "Your payment could not be verified. Please try again.";
        actionArea.innerHTML = `
            <a href="./payment.html?id=${courseId}" class="btn btn-primary w-full">
                Try Again
            </a>
            <a href="./courses.html" class="btn btn-ghost w-full" style="margin-top: var(--space-3);">
                Back to Courses
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
        await api.get(`/payment/verify/${reference}`);
        showSuccess();
    } catch (error) {
        showFailure(error.message);
    }
};

verify();