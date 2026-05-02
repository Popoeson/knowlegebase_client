Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
        window.location.href = "../login.html";
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
    const certsTable = document.getElementById("certsTable");
    const certsCount = document.getElementById("certsCount");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const revokeModal = document.getElementById("revokeModal");

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

    // ── MODAL HELPERS ──
    const openModal = (modal) => modal.classList.remove("hidden");
    const closeModal = (modal) => modal.classList.add("hidden");

    document.getElementById("closeRevokeModal").addEventListener("click", () => closeModal(revokeModal));
    document.getElementById("cancelRevokeBtn").addEventListener("click", () => closeModal(revokeModal));

    // ── STATE ──
    let allCerts = [];

    // ── LOAD CERTIFICATES ──
    const loadCertificates = async () => {
        try {
            const response = await api.get("/admin/certificates");
            allCerts = response.certificates;

            const active = allCerts.filter(c => c.status === "active").length;
            const revoked = allCerts.filter(c => c.status === "revoked").length;

            document.getElementById("statTotal").textContent = allCerts.length;
            document.getElementById("statActive").textContent = active;
            document.getElementById("statRevoked").textContent = revoked;

            renderCertificates(allCerts);

        } catch (error) {
            certsTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">Failed to load certificates</td>
                </tr>`;
        }
    };

    // ── RENDER CERTIFICATES ──
    const renderCertificates = (certs) => {
        certsCount.textContent = `(${certs.length})`;

        if (certs.length === 0) {
            certsTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No certificates found</td>
                </tr>`;
            return;
        }

        certsTable.innerHTML = certs.map((cert, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <span style="font-family: monospace; font-size: var(--text-sm);
                        color: var(--color-primary); font-weight: var(--font-semibold);">
                        ${cert.certificateId}
                    </span>
                </td>
                <td>
                    <p style="font-weight: var(--font-semibold);">
                        ${cert.user?.fullName || "—"}
                    </p>
                    <p style="font-size: var(--text-xs); color: var(--color-text-muted);">
                        ${cert.user?.email || ""}
                    </p>
                </td>
                <td>${cert.course?.title || "—"}</td>
                <td>${Utils.formatDate(cert.issuedAt)}</td>
                <td>
                    <span class="badge ${cert.status === "active" ? "badge-success" : "badge-error"}">
                        ${cert.status === "active" ? "✅ Active" : "🚫 Revoked"}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <a
                            href="../../pages/verify.html?id=${cert.certificateId}"
                            target="_blank"
                            class="btn-icon btn-icon-edit"
                            title="Verify"
                        >🔍</a>
                        <button
                            class="btn-icon ${cert.status === "active" ? "btn-icon-delete" : "btn-icon-toggle"}"
                            onclick="toggleRevoke('${cert._id}', '${cert.certificateId}', '${cert.status}')"
                            title="${cert.status === "active" ? "Revoke" : "Reinstate"}"
                        >${cert.status === "active" ? "🚫" : "✅"}</button>
                    </div>
                </td>
            </tr>
        `).join("");
    };

    // ── FILTER ──
    const filterCerts = () => {
        const search = searchInput.value.toLowerCase().trim();
        const status = statusFilter.value;

        const filtered = allCerts.filter(cert => {
            const matchesSearch = !search ||
                cert.certificateId.toLowerCase().includes(search) ||
                cert.user?.fullName?.toLowerCase().includes(search) ||
                cert.course?.title?.toLowerCase().includes(search);

            const matchesStatus = !status || cert.status === status;

            return matchesSearch && matchesStatus;
        });

        renderCertificates(filtered);
    };

    searchInput.addEventListener("input", filterCerts);
    statusFilter.addEventListener("change", filterCerts);

    // ── TOGGLE REVOKE (GLOBAL) ──
    window.toggleRevoke = (id, certId, currentStatus) => {
        const isRevoking = currentStatus === "active";

        document.getElementById("revokeModalTitle").textContent = isRevoking
            ? "Revoke Certificate"
            : "Reinstate Certificate";

        document.getElementById("revokeModalText").innerHTML = isRevoking
            ? `Are you sure you want to revoke certificate <strong>${certId}</strong>?
               This will invalidate the certificate and it will show as revoked on verification.`
            : `Are you sure you want to reinstate certificate <strong>${certId}</strong>?
               This will make it valid again.`;

        document.getElementById("confirmRevokeBtn").textContent = isRevoking
            ? "Revoke"
            : "Reinstate";

        document.getElementById("revokeCertId").value = id;
        openModal(revokeModal);
    };

    // ── CONFIRM REVOKE ──
    document.getElementById("confirmRevokeBtn").addEventListener("click", async () => {
        const id = document.getElementById("revokeCertId").value;
        const confirmBtn = document.getElementById("confirmRevokeBtn");

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Processing...";

        try {
            const response = await api.request(`/admin/certificates/${id}/revoke`, {
                method: "PATCH"
            });
            Utils.toast(response.message, "success");
            closeModal(revokeModal);
            await loadCertificates();
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm";
        }
    });

    // ── INIT ──
    await loadCertificates();

};

init();