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
    const partnersTable = document.getElementById("partnersTable");
    const partnersCount = document.getElementById("partnersCount");
    const searchInput = document.getElementById("searchInput");
    const tierFilter = document.getElementById("tierFilter");
    const statusFilter = document.getElementById("statusFilter");

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

    const formatKobo = (kobo) => Utils.formatCurrency((kobo || 0) / 100);

    // ══════════════════════════════════════════
    // LOAD & RENDER PARTNERS
    // ══════════════════════════════════════════

    let allPartners = [];

    const loadPartners = async () => {
        try {
            const response = await api.get("/admin/referral-partners");
            allPartners = response.partners;

            const active = allPartners.filter(p => p.status === "active").length;
            const lifetime = allPartners.filter(p => p.tier === "lifetime").length;
            const oneTime = allPartners.filter(p => p.tier === "one-time").length;

            document.getElementById("statTotal").textContent = allPartners.length;
            document.getElementById("statActive").textContent = active;
            document.getElementById("statLifetime").textContent = lifetime;
            document.getElementById("statOneTime").textContent = oneTime;

            renderPartners(allPartners);
        } catch (error) {
            partnersTable.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Failed to load partners</td></tr>`;
        }
    };

    const renderPartners = (partners) => {
        partnersCount.textContent = `(${partners.length})`;

        if (partners.length === 0) {
            partnersTable.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No partners found</td></tr>`;
            return;
        }

        partnersTable.innerHTML = partners.map((p, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <p style="font-weight: var(--font-semibold);">${Utils.escapeHTML(p.name)}</p>
                    <p style="font-size: var(--text-xs); color: var(--color-text-muted);">${Utils.escapeHTML(p.linkedUserId?.email || "")}</p>
                </td>
                <td><span style="font-family: monospace;">${Utils.escapeHTML(p.referralCode)}</span></td>
                <td><span class="badge ${p.tier === "lifetime" ? "badge-warning" : "badge-info"}">${p.tier}</span></td>
                <td>${p.tag ? `<span style="font-size: var(--text-xs); color: var(--color-text-muted);">${p.tag.replace(/_/g, " ")}</span>` : "—"}</td>
                <td><span class="badge ${p.status === "active" ? "badge-success" : "badge-error"}">${p.status}</span></td>
                <td>${Utils.formatDate(p.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-icon-edit" title="Edit" onclick="openEditModal('${p._id}')">✏️</button>
                        <button class="btn-icon ${p.status === "active" ? "btn-icon-delete" : "btn-icon-toggle"}" title="${p.status === "active" ? "Deactivate" : "Activate"}" onclick="toggleStatus('${p._id}')">${p.status === "active" ? "🚫" : "✅"}</button>
                        <button class="btn-icon btn-icon-edit" title="Settlement Report" onclick="openSettlementModal('${p._id}', '${Utils.escapeHTML(p.name)}')">📊</button>
                        <button class="btn-icon btn-icon-edit" title="Reassign a Student" onclick="openReassignModal('${p._id}')">🔀</button>
                        <button class="btn-icon btn-icon-edit" title="Grant Early Payout-Change Override" onclick="grantOverride('${p._id}')">🔓</button>
                    </div>
                </td>
            </tr>
        `).join("");
    };

    const filterPartners = () => {
        const search = searchInput.value.toLowerCase().trim();
        const tier = tierFilter.value;
        const status = statusFilter.value;

        const filtered = allPartners.filter(p => {
            const matchesSearch = !search ||
                p.name.toLowerCase().includes(search) ||
                p.referralCode.toLowerCase().includes(search);
            const matchesTier = !tier || p.tier === tier;
            const matchesStatus = !status || p.status === status;
            return matchesSearch && matchesTier && matchesStatus;
        });

        renderPartners(filtered);
    };

    searchInput.addEventListener("input", filterPartners);
    tierFilter.addEventListener("change", filterPartners);
    statusFilter.addEventListener("change", filterPartners);

    // ══════════════════════════════════════════
    // ONBOARD PARTNER MODAL
    // ══════════════════════════════════════════

    const onboardModal = document.getElementById("onboardModal");
    const onboardBtn = document.getElementById("onboardBtn");
    const userSearchInput = document.getElementById("userSearchInput");
    const userSearchResults = document.getElementById("userSearchResults");
    const selectedUserCard = document.getElementById("selectedUserCard");
    const partnerNameInput = document.getElementById("partnerNameInput");
    const referralCodeInput = document.getElementById("referralCodeInput");
    const tierSelect = document.getElementById("tierSelect");
    const lifetimeFields = document.getElementById("lifetimeFields");

    let selectedUserId = null;

    const resetOnboardForm = () => {
        selectedUserId = null;
        userSearchInput.value = "";
        userSearchResults.innerHTML = "";
        selectedUserCard.classList.add("hidden");
        partnerNameInput.value = "";
        referralCodeInput.value = "";
        tierSelect.value = "one-time";
        lifetimeFields.classList.add("hidden");
        document.getElementById("tagSelect").value = "institution_as_institution";
        document.getElementById("registrationFlatInput").value = "";
        document.getElementById("examFlatInput").value = "";
    };

    onboardBtn.addEventListener("click", () => {
        resetOnboardForm();
        openModal(onboardModal);
    });

    document.getElementById("closeOnboardModal").addEventListener("click", () => closeModal(onboardModal));
    document.getElementById("cancelOnboardBtn").addEventListener("click", () => closeModal(onboardModal));

    tierSelect.addEventListener("change", () => {
        lifetimeFields.classList.toggle("hidden", tierSelect.value !== "lifetime");
    });

    // Suggest a referral code from the name, same shape as backend's
    // suggestReferralCode — just a preview, backend re-validates uniqueness.
    const suggestCode = (name) => {
        const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${base}${suffix}`;
    };

    partnerNameInput.addEventListener("input", () => {
        if (partnerNameInput.value.trim()) {
            referralCodeInput.value = suggestCode(partnerNameInput.value);
        }
    });

    // ── USER SEARCH (onboard) ──
    let userSearchTimeout;
    userSearchInput.addEventListener("input", () => {
        clearTimeout(userSearchTimeout);
        const query = userSearchInput.value.trim();
        if (query.length < 2) {
            userSearchResults.innerHTML = "";
            return;
        }
        userSearchTimeout = setTimeout(async () => {
            try {
                const response = await api.get(`/admin/users/search?email=${encodeURIComponent(query)}`);
                if (response.users.length === 0) {
                    userSearchResults.innerHTML = `<p class="text-muted" style="font-size: var(--text-sm);">No users found</p>`;
                    return;
                }
                userSearchResults.innerHTML = response.users.map(u => `
                    <div class="table-actions" style="cursor: pointer; padding: var(--space-2); border-radius: var(--radius-sm);"
                        onclick="selectOnboardUser('${u._id}', '${Utils.escapeHTML(u.firstName + ' ' + (u.otherName || '') + ' ' + u.surname)}', '${Utils.escapeHTML(u.email)}')">
                        <p style="font-size: var(--text-sm); font-weight: var(--font-medium);">${Utils.escapeHTML(u.firstName)} ${Utils.escapeHTML(u.surname)} — ${Utils.escapeHTML(u.email)}</p>
                    </div>
                `).join("");
            } catch (error) {
                userSearchResults.innerHTML = `<p class="text-muted" style="font-size: var(--text-sm);">Search failed</p>`;
            }
        }, 300);
    });

    window.selectOnboardUser = (id, name, email) => {
        selectedUserId = id;
        document.getElementById("selectedUserName").textContent = name;
        document.getElementById("selectedUserEmail").textContent = email;
        selectedUserCard.classList.remove("hidden");
        userSearchResults.innerHTML = "";
        userSearchInput.value = "";
        if (!partnerNameInput.value.trim()) {
            partnerNameInput.value = name;
            referralCodeInput.value = suggestCode(name);
        }
    };

    document.getElementById("confirmOnboardBtn").addEventListener("click", async () => {
        if (!selectedUserId) {
            Utils.toast("Please select a user first.", "error");
            return;
        }
        if (!partnerNameInput.value.trim()) {
            Utils.toast("Partner name is required.", "error");
            return;
        }

        const tier = tierSelect.value;
        const payload = {
            userId: selectedUserId,
            name: partnerNameInput.value.trim(),
            referralCode: referralCodeInput.value.trim(),
            tier
        };

        if (tier === "lifetime") {
            payload.tag = document.getElementById("tagSelect").value;
            payload.registrationFlatAmount = Math.round(Number(document.getElementById("registrationFlatInput").value || 0) * 100);
            payload.examFlatAmount = Math.round(Number(document.getElementById("examFlatInput").value || 0) * 100);
        }

        const btn = document.getElementById("confirmOnboardBtn");
        btn.disabled = true;
        btn.textContent = "Onboarding...";

        try {
            const response = await api.post("/admin/referral-partners", payload);
            Utils.toast(response.message, "success");
            closeModal(onboardModal);
            await loadPartners();
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Onboard Partner";
        }
    });

    // ══════════════════════════════════════════
    // EDIT PARTNER MODAL
    // ══════════════════════════════════════════

    const editModal = document.getElementById("editModal");

    window.openEditModal = (id) => {
        const partner = allPartners.find(p => p._id === id);
        if (!partner) return;

        document.getElementById("editPartnerId").value = partner._id;
        document.getElementById("editNameInput").value = partner.name;
        document.getElementById("editCodeInput").value = partner.referralCode;

        const editLifetimeFields = document.getElementById("editLifetimeFields");
        if (partner.tier === "lifetime") {
            editLifetimeFields.classList.remove("hidden");
            document.getElementById("editTagSelect").value = partner.tag || "institution_as_institution";
            document.getElementById("editRegistrationFlatInput").value = (partner.registrationFlatAmount || 0) / 100;
            document.getElementById("editExamFlatInput").value = (partner.examFlatAmount || 0) / 100;
        } else {
            editLifetimeFields.classList.add("hidden");
        }

        openModal(editModal);
    };

    document.getElementById("closeEditModal").addEventListener("click", () => closeModal(editModal));
    document.getElementById("cancelEditModalBtn").addEventListener("click", () => closeModal(editModal));

    document.getElementById("confirmEditBtn").addEventListener("click", async () => {
        const id = document.getElementById("editPartnerId").value;
        const partner = allPartners.find(p => p._id === id);

        const payload = {
            name: document.getElementById("editNameInput").value.trim(),
            referralCode: document.getElementById("editCodeInput").value.trim()
        };

        if (partner && partner.tier === "lifetime") {
            payload.tag = document.getElementById("editTagSelect").value;
            payload.registrationFlatAmount = Math.round(Number(document.getElementById("editRegistrationFlatInput").value || 0) * 100);
            payload.examFlatAmount = Math.round(Number(document.getElementById("editExamFlatInput").value || 0) * 100);
        }

        const btn = document.getElementById("confirmEditBtn");
        btn.disabled = true;
        btn.textContent = "Saving...";

        try {
            const response = await api.put(`/admin/referral-partners/${id}`, payload);
            Utils.toast(response.message, "success");
            closeModal(editModal);
            await loadPartners();
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Save Changes";
        }
    });

    // ══════════════════════════════════════════
    // TOGGLE STATUS
    // ══════════════════════════════════════════

    window.toggleStatus = async (id) => {
        try {
            const response = await api.request(`/admin/referral-partners/${id}/toggle`, { method: "PATCH" });
            Utils.toast(response.message, "success");
            await loadPartners();
        } catch (error) {
            Utils.toast(error.message, "error");
        }
    };

    // ══════════════════════════════════════════
    // GRANT OVERRIDE
    // ══════════════════════════════════════════

    window.grantOverride = async (id) => {
        try {
            const response = await api.request(`/admin/referral-partners/${id}/grant-override`, { method: "PATCH" });
            Utils.toast(response.message, "success");
        } catch (error) {
            Utils.toast(error.message, "error");
        }
    };

    // ══════════════════════════════════════════
    // SETTLEMENT MODAL
    // ══════════════════════════════════════════

    const settlementModal = document.getElementById("settlementModal");

    window.openSettlementModal = (id, name) => {
        document.getElementById("settlementPartnerId").value = id;
        document.getElementById("settlementModalTitle").textContent = `Settlement Report — ${name}`;
        document.getElementById("settlementStart").value = "";
        document.getElementById("settlementEnd").value = "";
        document.getElementById("settlementResults").classList.add("hidden");
        openModal(settlementModal);
    };

    document.getElementById("closeSettlementModal").addEventListener("click", () => closeModal(settlementModal));
    document.getElementById("closeSettlementBtn").addEventListener("click", () => closeModal(settlementModal));

    document.getElementById("runSettlementBtn").addEventListener("click", async () => {
        const id = document.getElementById("settlementPartnerId").value;
        const start = document.getElementById("settlementStart").value;
        const end = document.getElementById("settlementEnd").value;

        const btn = document.getElementById("runSettlementBtn");
        btn.disabled = true;
        btn.textContent = "Running...";

        try {
            const params = new URLSearchParams();
            if (start) params.set("start", start);
            if (end) params.set("end", end);

            const response = await api.get(`/admin/referral-partners/${id}/settlement?${params.toString()}`);

            document.getElementById("settlementStudents").textContent = response.referredStudentCount;
            document.getElementById("settlementVolume").textContent = formatKobo(response.totalTransactionVolume);
            document.getElementById("settlementOwed").textContent = formatKobo(response.totalOwed);

            document.getElementById("settlementRedirectedNote").textContent =
                response.totalRedirectedToAsodem > 0
                    ? `${formatKobo(response.totalRedirectedToAsodem)} was redirected to ASODEM during periods this partner was inactive.`
                    : "";

            document.getElementById("settlementResults").classList.remove("hidden");
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Run Report";
        }
    });

    // ══════════════════════════════════════════
    // REASSIGN STUDENT MODAL
    // ══════════════════════════════════════════

    const reassignModal = document.getElementById("reassignModal");
    const reassignUserSearch = document.getElementById("reassignUserSearch");
    const reassignUserResults = document.getElementById("reassignUserResults");
    const reassignSelectedUser = document.getElementById("reassignSelectedUser");

    window.openReassignModal = (partnerId) => {
        document.getElementById("reassignPartnerId").value = partnerId;
        document.getElementById("reassignUserId").value = "";
        reassignUserSearch.value = "";
        reassignUserResults.innerHTML = "";
        reassignSelectedUser.classList.add("hidden");
        openModal(reassignModal);
    };

    document.getElementById("closeReassignModal").addEventListener("click", () => closeModal(reassignModal));
    document.getElementById("cancelReassignBtn").addEventListener("click", () => closeModal(reassignModal));

    let reassignSearchTimeout;
    reassignUserSearch.addEventListener("input", () => {
        clearTimeout(reassignSearchTimeout);
        const query = reassignUserSearch.value.trim();
        if (query.length < 2) {
            reassignUserResults.innerHTML = "";
            return;
        }
        reassignSearchTimeout = setTimeout(async () => {
            try {
                const response = await api.get(`/admin/users/search?email=${encodeURIComponent(query)}`);
                if (response.users.length === 0) {
                    reassignUserResults.innerHTML = `<p class="text-muted" style="font-size: var(--text-sm);">No users found</p>`;
                    return;
                }
                reassignUserResults.innerHTML = response.users.map(u => `
                    <div class="table-actions" style="cursor: pointer; padding: var(--space-2); border-radius: var(--radius-sm);"
                        onclick="selectReassignUser('${u._id}', '${Utils.escapeHTML(u.firstName + ' ' + u.surname)}', '${Utils.escapeHTML(u.email)}')">
                        <p style="font-size: var(--text-sm); font-weight: var(--font-medium);">${Utils.escapeHTML(u.firstName)} ${Utils.escapeHTML(u.surname)} — ${Utils.escapeHTML(u.email)}</p>
                    </div>
                `).join("");
            } catch (error) {
                reassignUserResults.innerHTML = `<p class="text-muted" style="font-size: var(--text-sm);">Search failed</p>`;
            }
        }, 300);
    });

    window.selectReassignUser = (id, name, email) => {
        document.getElementById("reassignUserId").value = id;
        document.getElementById("reassignSelectedUserName").textContent = name;
        document.getElementById("reassignSelectedUserEmail").textContent = email;
        reassignSelectedUser.classList.remove("hidden");
        reassignUserResults.innerHTML = "";
        reassignUserSearch.value = "";
    };

    document.getElementById("confirmReassignBtn").addEventListener("click", async () => {
        const partnerId = document.getElementById("reassignPartnerId").value;
        const userId = document.getElementById("reassignUserId").value;

        if (!userId) {
            Utils.toast("Please select a student first.", "error");
            return;
        }

        const btn = document.getElementById("confirmReassignBtn");
        btn.disabled = true;
        btn.textContent = "Reassigning...";

        try {
            const response = await api.request(`/admin/users/${userId}/referral-partner`, {
                method: "PATCH",
                body: JSON.stringify({ referralPartnerId: partnerId })
            });
            Utils.toast(response.message, "success");
            closeModal(reassignModal);
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Reassign";
        }
    });

    // ── INIT ──
    await loadPartners();

};

init();