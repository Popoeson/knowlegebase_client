Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
        return;
    }

    // ── ELEMENT REFERENCES ──
    const sidebar = document.getElementById("sidebar");
    const hamburger = document.getElementById("hamburger");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const themeToggle = document.getElementById("themeToggle");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarName = document.getElementById("sidebarName");
    const topbarAvatar = document.getElementById("topbarAvatar");
    const paymentContent = document.getElementById("paymentContent");

    // ── SIDEBAR TOGGLE ──
    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        sidebarOverlay.classList.toggle("active");
    });

    sidebarOverlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("active");
    });

    // ── THEME TOGGLE ──
    const updateThemeIcon = () => {
        const theme = document.documentElement.getAttribute("data-theme");
        themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    };

    themeToggle.addEventListener("click", () => {
        Utils.toggleTheme();
        updateThemeIcon();
    });

    updateThemeIcon();

    // ── DEFAULT AVATAR ──
    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

    // ── LOAD USER ──
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

    // ── GET COURSE ID FROM URL ──
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    if (!courseId) {
        window.location.href = "./courses.html";
        return;
    }

    // ── FETCH EXCHANGE RATE ──
    let exchangeRate = 1600;
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        exchangeRate = data.rates.NGN;
    } catch (error) {
        exchangeRate = 1600;
    }

    // ── LOAD COURSE ──
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

    // ── CALCULATE PRICE ──
    const priceUSD = course.price;
    const priceNGN = Math.round(priceUSD * exchangeRate);
    const priceNGNFormatted = priceNGN.toLocaleString("en-NG");

    // ── RENDER PAYMENT PAGE ──
    paymentContent.innerHTML = `
        <div class="payment-layout">

            <!-- LEFT: PAYMENT FORM -->
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

                <button
                    class="btn btn-primary w-full btn-lg"
                    id="payNowBtn"
                >
                    💳 Pay ₦${priceNGNFormatted} Now
                </button>

                <p class="exchange-note">
                    Exchange rate: $1 ≈ ₦${Math.round(exchangeRate).toLocaleString()}.
                    Rate updates automatically.
                </p>

                <div class="payment-secure-note">
                    🔒 Secured by Paystack. Your payment details are encrypted.
                </div>

            </div>

            <!-- RIGHT: ORDER SUMMARY -->
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
                            <span style="font-size: var(--text-sm); color: var(--color-text-secondary);">You are redirected to start your exam</span>
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

    // ── PAY NOW BUTTON ──
    document.getElementById("payNowBtn").addEventListener("click", async () => {
    const payBtn = document.getElementById("payNowBtn");
    payBtn.disabled = true;
    payBtn.textContent = "Initializing payment...";

    try {
        const response = await api.post("/payment/initialize", {
            courseId,
            amountNGN: priceNGN
        });

        const { reference } = response;

        // ── PAYSTACK HANDLER ──
        const handler = PaystackPop.setup({
            key: CONFIG.PAYSTACK_PUBLIC_KEY,
            email: user.email,
            amount: priceNGN * 100,
            ref: reference,
            currency: "NGN",
            metadata: {
                custom_fields: [
                    {
                        display_name: "Course",
                        variable_name: "course",
                        value: course.title
                    },
                    {
                        display_name: "Student Name",
                        variable_name: "student_name",
                        value: user.fullName
                    }
                ]
            },
            callback: function(paystackResponse) {
                // Verify payment — cannot use async here so we use promise chain
                Utils.showLoader();
                api.get(`/payment/verify/${paystackResponse.reference}`)
                    .then(() => {
                        Utils.toast("Payment successful! Starting your exam...", "success");
                        setTimeout(() => {
                            window.location.href = `./exam.html?id=${courseId}&type=certification`;
                        }, 1500);
                    })
                    .catch(() => {
                        Utils.hideLoader();
                        Utils.toast("Payment verification failed. Please contact support.", "error");
                    });
            },
            onClose: function() {
                payBtn.disabled = false;
                payBtn.textContent = `💳 Pay ₦${priceNGNFormatted} Now`;
                Utils.toast("Payment cancelled", "warning");
            }
        });

        handler.openIframe();

    } catch (error) {
        Utils.toast(error.message, "error");
        payBtn.disabled = false;
        payBtn.textContent = `💳 Pay ₦${priceNGNFormatted} Now`;
    }
});

init();