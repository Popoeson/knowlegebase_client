Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
        return;
    }

    const sidebar = document.getElementById("sidebar");
    const hamburger = document.getElementById("hamburger");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const themeToggle = document.getElementById("themeToggle");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarName = document.getElementById("sidebarName");
    const topbarAvatar = document.getElementById("topbarAvatar");
    const paymentContent = document.getElementById("paymentContent");

    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        sidebarOverlay.classList.toggle("active");
    });

    sidebarOverlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("active");
    });

    const updateThemeIcon = () => {
        const theme = document.documentElement.getAttribute("data-theme");
        themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    };

    themeToggle.addEventListener("click", () => {
        Utils.toggleTheme();
        updateThemeIcon();
    });

    updateThemeIcon();

    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

    const user = Auth.getUser();
    if (user) {
        sidebarName.textContent = user.fullName;
        if (user.profilePhoto) {
            sidebarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
            topbarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
        } else {
            sidebarAvatar.innerHTML = defaultAvatar;
            topbarAvatar.innerHTML = defaultAvatar;
        }
    }

    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    if (!courseId) {
        window.location.href = "./courses.html";
        return;
    }

    // Store courseId so callback page can use it
    sessionStorage.setItem("kb_payment_courseId", courseId);

    // ── RECOVERY CHECK ──
    // If a payment was in progress and the user lands back on this page
    // (Paystack session interrupted, tab closed, came back later) without
    // ever hitting payment-callback.html, check whether that payment
    // actually went through before showing the pay form again.
    const recoverPendingPayment = async () => {
        const pendingRef = localStorage.getItem("kb_pending_cert_ref");
        const pendingCourseId = localStorage.getItem("kb_pending_cert_courseId");

        if (!pendingRef || pendingCourseId !== courseId) return false;

        paymentContent.innerHTML = `
            <div class="card" style="text-align: center; padding: var(--space-8);">
                <div class="spinner" style="margin: 0 auto var(--space-4);"></div>
                <p>Checking your previous payment...</p>
            </div>`;

        try {
            const response = await api.get(`/payment/verify/${pendingRef}`);
            localStorage.removeItem("kb_pending_cert_ref");
            localStorage.removeItem("kb_pending_cert_courseId");
            localStorage.removeItem("kb_cert_payment_in_progress");

            Utils.toast("Payment confirmed! Taking you to your exam...", "success");
            setTimeout(() => {
                window.location.href = `./exam.html?id=${response.courseId || courseId}&type=certification`;
            }, 1500);
            return true;

        } catch (error) {
            // Payment genuinely not confirmed yet (or failed) — clear the
            // stale pending state and let the normal payment form render.
            localStorage.removeItem("kb_pending_cert_ref");
            localStorage.removeItem("kb_pending_cert_courseId");
            localStorage.removeItem("kb_cert_payment_in_progress");
            console.warn("Pending exam payment recovery check:", error.message);
            return false;
        }
    };

    const recovered = await recoverPendingPayment();
    if (recovered) return;

    let exchangeRate = 1600;
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        exchangeRate = data.rates.NGN;
    } catch (error) {
        exchangeRate = 1600;
    }

    let course = null;
    try {
        const response = await api.get(`/courses/${courseId}`);
        course = response.course;
    } catch (error) {
        paymentContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Course not found</h3>
                <a href="./courses.html" class="btn btn-primary mt-4">Back to Courses</a>
            </div>`;
        return;
    }

    const priceUSD = course.price;
    const priceNGN = Math.round(priceUSD * exchangeRate);
    const priceNGNFormatted = priceNGN.toLocaleString("en-NG");

    paymentContent.innerHTML = `
        <div class="payment-layout">

            <div class="payment-card">
                <h2 class="payment-card-title">Complete Your Payment</h2>
                <p class="payment-card-subtitle">
                    You are one step away from taking your certification exam.
                </p>

                <div class="course-summary">
                    <h3 class="course-summary-title">${course.title}</h3>
                    <p class="course-summary-meta">
                        ${course.category?.name || "General"} • ${course.difficulty} • ${course.certificationQuestions} questions
                    </p>
                    <div class="course-summary-price-row">
                        <span class="course-summary-price-label">Certification Exam Fee</span>
                        <div>
                            <p class="course-summary-price-value">$${priceUSD} USD</p>
                            <p class="course-summary-price-ngn">≈ ₦${priceNGNFormatted} NGN</p>
                        </div>
                    </div>
                </div>

                <div class="payment-features">
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>One certification exam attempt</span>
                    </div>
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>Certificate issued immediately on passing</span>
                    </div>
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>Unique verifiable certificate ID</span>
                    </div>
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>Downloadable PDF certificate</span>
                    </div>
                </div>

                <button class="btn btn-primary w-full btn-lg" id="payNowBtn">
                    💳 Pay ₦${priceNGNFormatted} Now
                </button>

                <p class="exchange-note">
                    Exchange rate: $1 ≈ ₦${Math.round(exchangeRate).toLocaleString()}.
                    Rate updates automatically.
                </p>

                <div class="payment-secure-note">
                    🔒 Secured by Paystack. Your payment details are encrypted.
                </div>

                <p style="text-align: center; margin-top: var(--space-4);
                    font-size: var(--text-sm);">
                    <a href="#" id="stuckLink" style="color: var(--color-primary);">
                        Already paid but stuck here?
                    </a>
                </p>

                <div id="manualRecoveryBox" style="display: none; margin-top: var(--space-4);
                    padding: var(--space-4); background: var(--color-surface-2);
                    border-radius: var(--radius-md);">
                    <p style="font-size: var(--text-sm); margin-bottom: var(--space-3);">
                        Paste your Paystack payment reference below and we'll check it.
                    </p>
                    <input type="text" id="manualRefInput" class="form-input"
                        placeholder="e.g. ASO-CERT-..." style="margin-bottom: var(--space-3);">
                    <button class="btn btn-outline w-full" id="manualVerifyBtn">
                        Check My Payment
                    </button>
                </div>
            </div>

            <div>
                <div class="card">
                    <h3 style="font-size: var(--text-base); font-weight: var(--font-bold); margin-bottom: var(--space-4);">
                        Order Summary
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <div class="flex-between">
                            <span style="font-size: var(--text-sm); color: var(--color-text-muted);">Course</span>
                            <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">${course.title}</span>
                        </div>
                        <div class="flex-between">
                            <span style="font-size: var(--text-sm); color: var(--color-text-muted);">Type</span>
                            <span style="font-size: var(--text-sm);">Certification Exam</span>
                        </div>
                        <div class="flex-between">
                            <span style="font-size: var(--text-sm); color: var(--color-text-muted);">Attempts</span>
                            <span style="font-size: var(--text-sm);">1 attempt</span>
                        </div>
                        <div class="flex-between">
                            <span style="font-size: var(--text-sm); color: var(--color-text-muted);">Pass Mark</span>
                            <span style="font-size: var(--text-sm);">${course.passMark}%</span>
                        </div>
                        <div class="divider"></div>
                        <div class="flex-between">
                            <span style="font-size: var(--text-base); font-weight: var(--font-bold);">Total</span>
                            <div style="text-align: right;">
                                <p style="font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-accent);">
                                    ₦${priceNGNFormatted}
                                </p>
                                <p style="font-size: var(--text-xs); color: var(--color-text-muted);">$${priceUSD} USD</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold); margin-bottom: var(--space-3);">
                        What happens next?
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <div style="display: flex; gap: var(--space-3); align-items: flex-start;">
                            <span style="color: var(--color-primary); font-weight: bold; flex-shrink: 0;">1.</span>
                            <span style="font-size: var(--text-sm); color: var(--color-text-secondary);">Complete payment securely via Paystack</span>
                        </div>
                        <div style="display: flex; gap: var(--space-3); align-items: flex-start;">
                            <span style="color: var(--color-primary); font-weight: bold; flex-shrink: 0;">2.</span>
                            <span style="font-size: var(--text-sm); color: var(--color-text-secondary);">You are redirected back to start your exam</span>
                        </div>
                        <div style="display: flex; gap: var(--space-3); align-items: flex-start;">
                            <span style="color: var(--color-primary); font-weight: bold; flex-shrink: 0;">3.</span>
                            <span style="font-size: var(--text-sm); color: var(--color-text-secondary);">Pass the exam to earn your certificate</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // ── PAY NOW — REDIRECT TO PAYSTACK ──
    document.getElementById("payNowBtn").addEventListener("click", async () => {
        const payBtn = document.getElementById("payNowBtn");
        payBtn.disabled = true;
        payBtn.textContent = "Redirecting to payment...";

        try {
            // amountNGN is no longer sent — the backend computes the real
            // charge server-side from the course's stored price. priceNGN
            // here was only ever used to render the estimate on this page.
            const response = await api.post("/payment/initialize", { courseId });

            // Mark payment as in progress BEFORE redirecting to Paystack
            // so we can recover if the user comes back without completing
            localStorage.setItem("kb_pending_cert_ref", response.reference);
            localStorage.setItem("kb_pending_cert_courseId", courseId);
            localStorage.setItem("kb_cert_payment_in_progress", "true");

            // Redirect to Paystack hosted payment page
            window.location.href = response.authorizationUrl;

        } catch (error) {
            if (error.code === "ALREADY_PAID") {
                Utils.toast("You already have an unused payment for this course. Taking you to your exam...", "info");
                setTimeout(() => {
                    window.location.href = `./exam.html?id=${courseId}&type=certification`;
                }, 1500);
                return;
            }
            Utils.toast(error.message, "error");
            payBtn.disabled = false;
            payBtn.textContent = `💳 Pay ₦${priceNGNFormatted} Now`;
        }
    });

    // ── STUCK? MANUAL RECOVERY ──
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
            const response = await api.get(`/payment/verify/${ref}`);

            localStorage.removeItem("kb_pending_cert_ref");
            localStorage.removeItem("kb_pending_cert_courseId");
            localStorage.removeItem("kb_cert_payment_in_progress");

            Utils.toast("Payment confirmed! Taking you to your exam...", "success");
            setTimeout(() => {
                window.location.href = `./exam.html?id=${response.courseId || courseId}&type=certification`;
            }, 1500);

        } catch (error) {
            Utils.toast(error.message || "Could not verify that reference. Please contact support.", "error");
            manualVerifyBtn.disabled = false;
            manualVerifyBtn.textContent = "Check My Payment";
        }
    });

};

init();
