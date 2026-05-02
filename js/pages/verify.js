Utils.initTheme();

const init = () => {

    const certIdInput = document.getElementById("certIdInput");
    const verifyBtn = document.getElementById("verifyBtn");
    const verifyResult = document.getElementById("verifyResult");

    // ── CHECK URL PARAMS ──
    const params = new URLSearchParams(window.location.search);
    const prefilledId = params.get("id");
    if (prefilledId) {
        certIdInput.value = prefilledId.toUpperCase();
        verifyBtn.click();
    }

    // ── AUTO UPPERCASE ──
    certIdInput.addEventListener("input", () => {
        certIdInput.value = certIdInput.value.toUpperCase();
    });

    // ── ENTER KEY ──
    certIdInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") verifyBtn.click();
    });

    // ── VERIFY ──
    verifyBtn.addEventListener("click", async () => {
        const certId = certIdInput.value.trim();

        if (!certId) {
            Utils.toast("Please enter a certificate ID", "error");
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying...";
        verifyResult.classList.add("hidden");
        verifyResult.innerHTML = "";

        try {
            const response = await api.get(`/certificates/verify/${certId}`);

            verifyResult.classList.remove("hidden");

            if (response.valid) {
                verifyResult.className = "verify-result verify-result-valid";
                verifyResult.innerHTML = `
                    <div class="verify-result-header">
                        <span class="verify-result-icon">✅</span>
                        <span class="verify-result-status valid">Valid Certificate</span>
                    </div>
                    <div class="verify-result-details">
                        <div class="verify-detail-item">
                            <span class="verify-detail-label">Certificate Holder</span>
                            <span class="verify-detail-value">${response.fullName}</span>
                        </div>
                        <div class="verify-detail-item">
                            <span class="verify-detail-label">Course</span>
                            <span class="verify-detail-value">${response.course}</span>
                        </div>
                        <div class="verify-detail-item">
                            <span class="verify-detail-label">Date Issued</span>
                            <span class="verify-detail-value">${response.issuedAt}</span>
                        </div>
                        <div class="verify-detail-item">
                            <span class="verify-detail-label">Certificate ID</span>
                            <span class="verify-detail-value" style="font-family: monospace;">
                                ${response.certificateId}
                            </span>
                        </div>
                        <div class="verify-detail-item">
                            <span class="verify-detail-label">Status</span>
                            <span class="verify-detail-value" style="color: var(--color-success);">
                                ✅ ${response.message}
                            </span>
                        </div>
                    </div>
                `;
            } else {
                verifyResult.className = "verify-result verify-result-invalid";
                verifyResult.innerHTML = `
                    <div class="verify-result-header">
                        <span class="verify-result-icon">❌</span>
                        <span class="verify-result-status invalid">
                            ${response.status === "revoked" ? "Certificate Revoked" : "Invalid Certificate"}
                        </span>
                    </div>
                    <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-3);">
                        ${response.status === "revoked"
                            ? "This certificate has been revoked by KNOWLEDGEBASE."
                            : "No certificate was found with this ID. Please check the ID and try again."}
                    </p>
                `;
            }

        } catch (error) {
            verifyResult.classList.remove("hidden");
            verifyResult.className = "verify-result verify-result-invalid";
            verifyResult.innerHTML = `
                <div class="verify-result-header">
                    <span class="verify-result-icon">❌</span>
                    <span class="verify-result-status invalid">Invalid Certificate</span>
                </div>
                <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-3);">
                    No certificate was found with this ID. Please check the ID and try again.
                </p>
            `;
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = "Verify";
        }
    });

};

init();