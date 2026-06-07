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
    const certificateContent = document.getElementById("certificateContent");

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
    const certId = params.get("id");

    let certificate = null;

    Utils.showLoader();

    try {
        if (certId) {
            const response = await api.get(`/certificates/${certId}`);
            certificate = response.certificate;
        } else if (attemptId) {
            const response = await api.post("/certificates/generate", { attemptId });
            certificate = response.certificate;
            Store.invalidate("user:stats");
        } else {
            certificateContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3 class="empty-state-title">No certificate specified</h3>
                    <a href="./certificates.html" class="btn btn-primary mt-4">My Certificates</a>
                </div>`;
            Utils.hideLoader();
            return;
        }

        Utils.hideLoader();

        const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric"
        });

        const verifyUrl = `https://knowlegebase-client.vercel.app/pages/verify.html?id=${certificate.certificateId}`;

        certificateContent.innerHTML = `
            <div class="certificate-view-wrapper">
                <div class="certificate-actions-bar">
                    <a href="./certificates.html" class="btn btn-ghost btn-sm">← My Certificates</a>
                    ${certificate.pdfUrl ? `
                        <a href="${certificate.pdfUrl}" target="_blank" download
                            class="btn btn-primary btn-sm">
                            ⬇ Download PDF
                        </a>` : ""}
                    <button class="btn btn-outline btn-sm" id="shareBtn">
                        🔗 Copy Verification Link
                    </button>
                    <a href="${verifyUrl}" target="_blank" class="btn btn-ghost btn-sm">
                        🔍 Verify Certificate
                    </a>
                </div>

                <div class="certificate-document" id="certDoc">
                    <div class="cert-header">
                        <div class="cert-brand">KNOWLEDGEBASE</div>
                        <div class="cert-authority">Certification Authority</div>
                    </div>
                    <div class="cert-body">
                        <div class="cert-watermark">KB</div>
                        <div class="cert-achievement-title">Certificate of Achievement</div>
                        <p class="cert-certifies">This certifies that</p>
                        <h2 class="cert-name">${user.fullName}</h2>
                        <div class="cert-name-underline"></div>
                        <p class="cert-completed-text">
                            has successfully completed and passed the certification exam in
                        </p>
                        <h3 class="cert-course-name">${certificate.course?.title || "—"}</h3>
                        <div class="cert-divider">
                            <div class="cert-divider-line"></div>
                            <div class="cert-divider-diamond">◆</div>
                            <div class="cert-divider-line"></div>
                        </div>
                        <div class="cert-footer">
                            <div class="cert-footer-item">
                                <p class="cert-footer-label">Date Issued</p>
                                <p class="cert-footer-value">${issuedDate}</p>
                            </div>
                            <div class="cert-seal">
                                <div class="cert-seal-text">✦<br>VERIFIED<br>KNOWLEDGEBASE<br>✦</div>
                            </div>
                            <div class="cert-footer-item">
                                <p class="cert-footer-label">Certificate ID</p>
                                <p class="cert-footer-value">${certificate.certificateId}</p>
                            </div>
                        </div>
                    </div>
                    <div class="cert-bottom-band">
                        <p class="cert-verify-url">Verify at: ${verifyUrl}</p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("shareBtn").addEventListener("click", () => {
            navigator.clipboard.writeText(verifyUrl).then(() => {
                Utils.toast("Verification link copied to clipboard", "success");
            }).catch(() => {
                Utils.toast("Failed to copy link", "error");
            });
        });

    } catch (error) {
        Utils.hideLoader();

        // Payment required — redirect to certificate payment page
        if (error.message.includes("Payment required") || error.message.includes("payment")) {
            Utils.toast("Please complete payment to get your certificate.", "warning");
            setTimeout(() => {
                window.location.href = `./certificate-payment.html?attemptId=${attemptId}&courseId=${params.get("courseId") || ""}`;
            }, 1500);
            return;
        }

        certificateContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">${error.message}</h3>
                <a href="./dashboard.html" class="btn btn-primary mt-4">Go to Dashboard</a>
            </div>`;
    }

};

init();