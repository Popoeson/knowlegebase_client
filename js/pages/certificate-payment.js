Utils.initTheme();

const init = async () => {

    await Auth.restoreSession();

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
    const attemptId = params.get("attemptId");
    const courseId = params.get("courseId");

    if (!attemptId || !courseId) {
        window.location.href = "./exam-history.html";
        return;
    }

    // Store attemptId for callback page
    sessionStorage.setItem("kb_cert_attemptId", attemptId);

    // Fetch live exchange rate
    let exchangeRate = 1600;
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        exchangeRate = data.rates.NGN;
    } catch {
        exchangeRate = 1600;
    }

    // Fetch course details for price
    let course = null;
    try {
        const response = await api.get(`/courses/${courseId}`);
        course = response.course;
    } catch (error) {
        paymentContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Course not found</h3>
                <a href="./exam-history.html" class="btn btn-primary mt-4">Back to Exam History</a>
            </div>`;
        return;
    }

    const priceUSD = course.price;
    const priceNGN = Math.round(priceUSD * exchangeRate);
    const priceNGNFormatted = priceNGN.toLocaleString("en-NG");

    paymentContent.innerHTML = `
        <div class="payment-layout">
            <div class="payment-card">
                <h2 class="payment-card-title">Get Your Certificate</h2>
                <p class="payment-card-subtitle">
                    Pay once to generate and download your verifiable certificate.
                </p>

                <div class="course-summary">
                    <h3 class="course-summary-title">${course.title}</h3>
                    <p class="course-summary-meta">
                        ${course.category?.name || "General"} • ${course.difficulty}
                    </p>
                    <div class="course-summary-price-row">
                        <span class="course-summary-price-label">Certificate Fee</span>
                        <div>
                            <p class="course-summary-price-value">$${priceUSD} USD</p>
                            <p class="course-summary-price-ngn">≈ ₦${priceNGNFormatted} NGN</p>
                        </div>
                    </div>
                </div>

                <div class="payment-features">
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>Unique verifiable certificate ID</span>
                    </div>
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>Downloadable PDF certificate</span>
                    </div>
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>Publicly verifiable by employers</span>
                    </div>
                    <div class="payment-feature">
                        <span class="payment-feature-icon">✅</span>
                        <span>Permanent record on your profile</span>
                    </div>
                </div>

                <button class="btn btn-accent w-full btn-lg" id="payNowBtn">
                    🏆 Pay ₦${priceNGNFormatted} & Get Certificate
                </button>

                <p class="exchange-note">
                    Exchange rate: $1 ≈ ₦${Math.round(exchangeRate).toLocaleString()}.
                    Rate updates automatically.
                </p>

                <div class="payment-secure-note">
                    🔒 Secured by Paystack. Your payment details are encrypted.
                </div>
            </div>

            <div>
                <div class="card">
                    <h3 style="font-size: var(--text-base); font-weight: var(--font-bold);
                        margin-bottom: var(--space-4);">Order Summary</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <div class="flex-between">
                            <span style="font-size: var(--text-sm); color: var(--color-text-muted);">Course</span>
                            <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">${course.title}</span>
                        </div>
                        <div class="flex-between">
                            <span style="font-size: var(--text-sm); color: var(--color-text-muted);">Type</span>
                            <span style="font-size: var(--text-sm);">Certificate Fee</span>
                        </div>
                        <div class="divider"></div>
                        <div class="flex-between">
                            <span style="font-size: var(--text-base); font-weight: var(--font-bold);">Total</span>
                            <div style="text-align: right;">
                                <p style="font-size: var(--text-lg); font-weight: var(--font-bold);
                                    color: var(--color-accent);">₦${priceNGNFormatted}</p>
                                <p style="font-size: var(--text-xs); color: var(--color-text-muted);">
                                    $${priceUSD} USD
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold);
                        margin-bottom: var(--space-3);">What happens next?</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <div style="display: flex; gap: var(--space-3); align-items: flex-start;">
                            <span style="color: var(--color-primary); font-weight: bold; flex-shrink: 0;">1.</span>
                            <span style="font-size: var(--text-sm); color: var(--color-text-secondary);">
                                Complete payment securely via Paystack
                            </span>
                        </div>
                        <div style="display: flex; gap: var(--space-3); align-items: flex-start;">
                            <span style="color: var(--color-primary); font-weight: bold; flex-shrink: 0;">2.</span>
                            <span style="font-size: var(--text-sm); color: var(--color-text-secondary);">
                                Your certificate is generated automatically
                            </span>
                        </div>
                        <div style="display: flex; gap: var(--space-3); align-items: flex-start;">
                            <span style="color: var(--color-primary); font-weight: bold; flex-shrink: 0;">3.</span>
                            <span style="font-size: var(--text-sm); color: var(--color-text-secondary);">
                                Download your PDF and share your certificate ID
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById("payNowBtn").addEventListener("click", async () => {
        const payBtn = document.getElementById("payNowBtn");
        payBtn.disabled = true;
        payBtn.textContent = "Redirecting to payment...";

        try {
            const response = await api.post("/payment/certificate/initialize", {
                attemptId,
                amountNGN: priceNGN
            });

            window.location.href = response.authorizationUrl;

        } catch (error) {
            // Already paid — go straight to certificate
            if (error.message.includes("already")) {
                Utils.toast("Payment already made. Generating your certificate...", "info");
                setTimeout(() => {
                    window.location.href = `./certificate.html?attemptId=${attemptId}`;
                }, 1500);
                return;
            }

            Utils.toast(error.message, "error");
            payBtn.disabled = false;
            payBtn.textContent = `🏆 Pay ₦${priceNGNFormatted} & Get Certificate`;
        }
    });

};

init();