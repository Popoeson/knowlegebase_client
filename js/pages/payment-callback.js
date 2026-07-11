Utils.initTheme();

const verify = async () => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");
    const actionArea = document.getElementById("actionArea");

    const showSuccess = (courseId) => {
        statusIcon.textContent = "✅";
        statusTitle.textContent = "Payment Successful!";
        statusMessage.textContent = "Your payment has been confirmed. Taking you to your exam...";
        sessionStorage.removeItem("kb_payment_courseId");
        localStorage.removeItem("kb_pending_cert_ref");
        localStorage.removeItem("kb_pending_cert_courseId");
        localStorage.removeItem("kb_cert_payment_in_progress");
        setTimeout(() => {
            window.location.href = `./exam.html?id=${courseId}&type=certification`;
        }, 2000);
    };

    const showFailure = (message) => {
        statusIcon.textContent = "❌";
        statusTitle.textContent = "Payment Failed";
        statusMessage.textContent = message || "Your payment could not be verified. Please try again.";
        actionArea.innerHTML = `
            <a href="./courses.html" class="btn btn-primary w-full">
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
        const response = await api.get(`/payment/verify/${reference}`);

        // Prefer the courseId the server returns (authoritative); fall back
        // to what payment.js stored before redirecting to Paystack.
        const courseId = response.courseId || sessionStorage.getItem("kb_payment_courseId");

        if (!courseId) {
            showFailure("Payment verified, but we couldn't determine which course. Please check your courses page.");
            return;
        }

        showSuccess(courseId);

    } catch (error) {
        showFailure(error.message);
    }
};

verify();
