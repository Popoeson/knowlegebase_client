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
    const subaccountsTable = document.getElementById("subaccountsTable");
    const subaccountsCount = document.getElementById("subaccountsCount");

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

    // ── SUPERADMIN-ONLY SIDEBAR ITEMS ──
    document.querySelectorAll(".superadmin-only").forEach(el => {
        if (!Auth.isSuperAdmin()) el.style.display = "none";
    });

    // ── DEFAULT AVATAR ──
    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

    // ── LOAD ADMIN USER ──
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

    // ══════════════════════════════════════════
    // GLOBAL SETTINGS
    // ══════════════════════════════════════════

    const individualFlatInput = document.getElementById("individualFlatInput");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");

    const loadSettings = async () => {
        try {
            const response = await api.get("/admin/referral-settings");
            individualFlatInput.value = (response.settings.individualFlatAmount || 0) / 100;
        } catch (error) {
            Utils.toast("Failed to load settings", "error");
        }
    };

    saveSettingsBtn.addEventListener("click", async () => {
        const nairaValue = Number(individualFlatInput.value);
        if (isNaN(nairaValue) || nairaValue < 0) {
            Utils.toast("Please enter a valid amount.", "error");
            return;
        }

        saveSettingsBtn.disabled = true;
        saveSettingsBtn.textContent = "Saving...";

        try {
            const response = await api.put("/admin/referral-settings", {
                individualFlatAmount: Math.round(nairaValue * 100)
            });
            Utils.toast(response.message, "success");
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.textContent = "Save Settings";
        }
    });

    // ══════════════════════════════════════════
    // SUBACCOUNTS
    // ══════════════════════════════════════════

    const loadSubaccounts = async () => {
        try {
            const response = await api.get("/admin/referral-subaccounts");
            renderSubaccounts(response.partners);
        } catch (error) {
            subaccountsTable.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Failed to load subaccounts</td></tr>`;
        }
    };

    const renderSubaccounts = (partners) => {
        subaccountsCount.textContent = `(${partners.length})`;

        if (partners.length === 0) {
            subaccountsTable.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No subaccounts set up yet</td></tr>`;
            return;
        }

        subaccountsTable.innerHTML = partners.map((p, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <p style="font-weight: var(--font-semibold);">${Utils.escapeHTML(p.name)}</p>
                    <p style="font-size: var(--text-xs); color: var(--color-text-muted);">${Utils.escapeHTML(p.linkedUserId?.email || "")}</p>
                </td>
                <td><span class="badge ${p.tier === "lifetime" ? "badge-warning" : "badge-info"}">${p.tier}</span></td>
                <td>
                    <p style="font-size: var(--text-sm);">${Utils.escapeHTML(p.bankDetails?.accountName || "—")}</p>
                    <p style="font-size: var(--text-xs); color: var(--color-text-muted);">${Utils.escapeHTML(p.bankDetails?.accountNumber || "")}</p>
                </td>
                <td>
                    ${p.subaccountDeletedAt
                        ? `<span class="badge badge-error">Pending removal</span>`
                        : `<span class="badge badge-success">Active</span>`}
                </td>
                <td>
                    <div class="table-actions">
                        ${p.subaccountDeletedAt
                            ? `<span style="font-size: var(--text-xs); color: var(--color-text-muted);">Clears automatically</span>`
                            : Auth.isSuperAdmin()
                                ? `<button class="btn-icon btn-icon-delete" title="Remove Subaccount" onclick="openDeleteModal('${p._id}')">🗑️</button>`
                                : `<span style="font-size: var(--text-xs); color: var(--color-text-muted);">View only</span>`}
                    </div>
                </td>
                  
            </tr>
        `).join("");
    };

    // ── DELETE SUBACCOUNT MODAL ──
    const deleteSubaccountModal = document.getElementById("deleteSubaccountModal");

    window.openDeleteModal = (id) => {
        document.getElementById("deleteSubaccountPartnerId").value = id;
        openModal(deleteSubaccountModal);
    };

    document.getElementById("closeDeleteSubaccountModal").addEventListener("click", () => closeModal(deleteSubaccountModal));
    document.getElementById("cancelDeleteSubaccountBtn").addEventListener("click", () => closeModal(deleteSubaccountModal));

    document.getElementById("confirmDeleteSubaccountBtn").addEventListener("click", async () => {
        const id = document.getElementById("deleteSubaccountPartnerId").value;
        const btn = document.getElementById("confirmDeleteSubaccountBtn");
        btn.disabled = true;
        btn.textContent = "Removing...";

        try {
            const response = await api.delete(`/admin/referral-subaccounts/${id}`);
            Utils.toast(response.message, "success");
            closeModal(deleteSubaccountModal);
            await loadSubaccounts();
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Remove Subaccount";
        }
    });

// ── INIT ──
    // GET /admin/referral-settings is now superadmin-only on the backend —
    // don't even attempt the call for a regular admin, avoids a needless 403.
    if (Auth.isSuperAdmin()) {
        await loadSettings();
    }
    await loadSubaccounts();

init();