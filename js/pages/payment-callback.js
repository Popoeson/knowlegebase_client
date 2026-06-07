Utils.initTheme();

const verify = async () => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    const attemptId = sessionStorage.getItem("kb_cert_attemptId");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");
    const actionArea = document.getElementById("actionArea");

    const showSuccess = () => {
        statusIcon.textContent = "✅";
        statusTitle.textContent = "Payment Successful!";
        statusMessage.textContent = "Your payment has been confirmed. Generating your certificate...";
        sessionStorage.removeItem("kb_cert_attemptId");
        setTimeout(() => {
            window.location.href = `./certificate.html?attemptId=${attemptId}`;
        }, 2000);
    };

    const showFailure = (message) => {
        statusIcon.textContent = "❌";
        statusTitle.textContent = "Payment Failed";
        statusMessage.textContent = message || "Your payment could not be verified. Please try again.";
        actionArea.innerHTML = `
            <a href="./exam-history.html" class="btn btn-primary w-full">
                Back to Exam History
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
        await api.get(`/payment/certificate/verify/${reference}`);
        showSuccess();
    } catch (error) {
        showFailure(error.message);
    }
};

verify();