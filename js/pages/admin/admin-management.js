Utils.initTheme();

const init = async () => {

    if (!Auth.requireSuperAdmin()) return;

    // ── ELEMENT REFERENCES ──
    const sidebar = document.getElementById("sidebar");
    const hamburger = document.getElementById("hamburger");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const themeToggle = document.getElementById("themeToggle");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarName = document.getElementById("sidebarName");
    const topbarAvatar = document.getElementById("topbarAvatar");
    const adminsTable = document.getElementById("adminsTable");
    const adminsCount = document.getElementById("adminsCount");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const promoteSearchInput = document.getElementById("promoteSearchInput");
    const promoteResultsTable = document.getElementById("promoteResultsTable");
    const actionModal = document.getElementById("actionModal");

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
    // Redundant on this page (only superadmins reach it at all), but this
    // is the template copy-pasted into other admin pages later — keep the
    // toggle here so it's correct everywhere it's reused.
    document.querySelectorAll(".superadmin-only").forEach(el => {
        if (!Auth.isSuperAdmin()) el.style.display = "none";
    });

    // ── DEFAULT AVATAR ──
    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

    // ── LOAD USER ──
    const currentUser = Auth.getUser();
    if (currentUser) {
        sidebarName.textContent = currentUser.fullName;
        if (currentUser.profilePhoto) {
            sidebarAvatar.innerHTML = `<img src="${currentUser.profilePhoto}" alt="${Utils.escapeHTML(currentUser.fullName)}">`;
            topbarAvatar.innerHTML = `<img src="${currentUser.profilePhoto}" alt="${Utils.escapeHTML(currentUser.fullName)}">`;
        } else {
            sidebarAvatar.innerHTML = defaultAvatar;
            topbarAvatar.innerHTML = defaultAvatar;
        }
    }

    // ── MODAL HELPERS ──
    const openModal = (modal) => modal.classList.remove("hidden");
    const closeModal = (modal) => modal.classList.add("hidden");

    document.getElementById("closeActionModal").addEventListener("click", () => closeModal(actionModal));
    document.getElementById("cancelActionBtn").addEventListener("click", () => closeModal(actionModal));

    // ── STATE ──
    let allAdmins = [];
    let pendingTargetId = null;
    let pendingRole = null;

    // ── LOAD ADMINS ──
    const loadAdmins = async () => {
        try {
            const response = await api.get("/admin/admins");
            allAdmins = response.admins;

            const activeAdmins = allAdmins.filter(a => a.role === "admin" && !a.isSuspended).length;
            const activeSuperadmins = allAdmins.filter(a => a.role === "superadmin" && !a.isSuspended).length;
            const revoked = allAdmins.filter(a => a.isSuspended).length;

            document.getElementById("statAdmins").textContent = activeAdmins;
            document.getElementById("statSuperadmins").textContent = activeSuperadmins;
            document.getElementById("statRevoked").textContent = revoked;

            applyFilters();

        } catch (error) {
            adminsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">Failed to load admins</td>
                </tr>`;
        }
    };

    // ── STATUS HELPERS ──
    const getStatusLabel = (admin) => {
        if (admin.isSuspended) return "revoked";
        return admin.role; // "admin" | "superadmin"
    };

    const renderRoleBadge = (admin) => {
        if (admin.isSuspended) {
            return `<span class="badge badge-error">Revoked</span>`;
        }
        if (admin.role === "superadmin") {
            return `<span class="badge badge-success">Superadmin</span>`;
        }
        return `<span class="badge">Admin</span>`;
    };

    // ── RENDER ACTIONS FOR A ROW ──
    const renderActions = (admin) => {
        const isSelf = currentUser && admin._id === currentUser.id;
        if (isSelf) {
            return `<span class="text-muted" style="font-size: var(--text-sm);">You</span>`;
        }

        const name = Utils.escapeHTML(admin.fullName);

        if (admin.isSuspended) {
            return `
                <div class="table-actions">
                    <button class="btn btn-sm btn-ghost" onclick="openActionModal('${admin._id}', 'admin', 'Reinstate as Admin', 'Reinstate ${name} with Admin access? They will regain login and view access to the admin panel.')">Reinstate as Admin</button>
                    <button class="btn btn-sm btn-ghost" onclick="openActionModal('${admin._id}', 'superadmin', 'Reinstate as Superadmin', 'Reinstate ${name} with full Superadmin access? They will regain complete admin control.')">Reinstate as Superadmin</button>
                </div>`;
        }

        if (admin.role === "superadmin") {
            const activeSuperadminCount = allAdmins.filter(a => a.role === "superadmin" && !a.isSuspended).length;
            const isLastSuperadmin = activeSuperadminCount <= 1;
            const disabledAttr = isLastSuperadmin ? "disabled title=\"Cannot act — this is the last active superadmin\"" : "";

            return `
                <div class="table-actions">
                    <button class="btn btn-sm btn-ghost" ${disabledAttr} onclick="openActionModal('${admin._id}', 'admin', 'Demote to Admin', 'Demote ${name} to regular Admin? They will lose Superadmin-level access.')">Demote to Admin</button>
                    <button class="btn-icon btn-icon-delete" ${disabledAttr} title="Revoke Access" onclick="openActionModal('${admin._id}', 'user', 'Revoke Access', 'Revoke all admin access from ${name}? They will be completely unable to log in until reinstated.')">🚫</button>
                </div>`;
        }

        // role === "admin"
        return `
            <div class="table-actions">
                <button class="btn btn-sm btn-ghost" onclick="openActionModal('${admin._id}', 'superadmin', 'Promote to Superadmin', 'Promote ${name} to Superadmin? They will gain full access to all admin functions, including destructive actions.')">Promote to Superadmin</button>
                <button class="btn-icon btn-icon-delete" title="Revoke Access" onclick="openActionModal('${admin._id}', 'user', 'Revoke Access', 'Revoke all admin access from ${name}? They will be completely unable to log in until reinstated.')">🚫</button>
            </div>`;
    };

    // ── RENDER TABLE ──
    const renderAdmins = (admins) => {
        adminsCount.textContent = `(${admins.length})`;

        if (admins.length === 0) {
            adminsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No admins found</td>
                </tr>`;
            return;
        }

        adminsTable.innerHTML = admins.map((admin, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: var(--space-3);">
                        <div style="
                            width: 32px; height: 32px;
                            border-radius: 50%;
                            background-color: var(--color-primary);
                            display: flex; align-items: center; justify-content: center;
                            font-size: var(--text-xs); font-weight: 700;
                            color: white; flex-shrink: 0; overflow: hidden;">
                            ${admin.profilePhoto
                                ? `<img src="${admin.profilePhoto}" style="width:100%;height:100%;object-fit:cover;">`
                                : Utils.escapeHTML((admin.firstName?.[0] || "") + (admin.surname?.[0] || ""))}
                        </div>
                        <span>${Utils.escapeHTML(admin.fullName)}</span>
                    </div>
                </td>
                <td>${Utils.escapeHTML(admin.email)}</td>
                <td>${renderRoleBadge(admin)}</td>
                <td>${admin.isSuspended ? "Inactive" : "Active"}</td>
                <td>${renderActions(admin)}</td>
            </tr>
        `).join("");
    };

    // ── FILTERS ──
    const applyFilters = () => {
        const search = searchInput.value.toLowerCase().trim();
        const status = statusFilter.value;

        const filtered = allAdmins.filter(admin => {
            const matchesSearch = !search ||
                admin.fullName.toLowerCase().includes(search) ||
                admin.email.toLowerCase().includes(search);

            const matchesStatus = !status || getStatusLabel(admin) === status;

            return matchesSearch && matchesStatus;
        });

        renderAdmins(filtered);
    };

    searchInput.addEventListener("input", applyFilters);
    statusFilter.addEventListener("change", applyFilters);

    // ── ACTION MODAL (GLOBAL) ──
    window.openActionModal = (id, newRole, title, message) => {
        pendingTargetId = id;
        pendingRole = newRole;
        document.getElementById("actionModalTitle").textContent = title;
        document.getElementById("actionModalText").textContent = message;
        openModal(actionModal);
    };

    document.getElementById("confirmActionBtn").addEventListener("click", async () => {
        if (!pendingTargetId || !pendingRole) return;

        const confirmBtn = document.getElementById("confirmActionBtn");
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Processing...";

        try {
            await api.patch(`/admin/users/${pendingTargetId}/role`, { role: pendingRole });
            Utils.toast("Role updated successfully", "success");
            closeModal(actionModal);
            pendingTargetId = null;
            pendingRole = null;
            await loadAdmins();
            // Clear any stale promote-search results, since a promoted
            // user should no longer appear there.
            promoteSearchInput.value = "";
            promoteResultsTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">Start typing an email to search regular users</td>
                </tr>`;
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm";
        }
    });

    // ── PROMOTE-USER SEARCH ──
    let promoteDebounce;
    promoteSearchInput.addEventListener("input", () => {
        clearTimeout(promoteDebounce);
        const term = promoteSearchInput.value.trim();

        if (term.length < 2) {
            promoteResultsTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">Start typing an email to search regular users</td>
                </tr>`;
            return;
        }

        promoteDebounce = setTimeout(async () => {
            try {
                const response = await api.get(`/admin/users/search?email=${encodeURIComponent(term)}`);
                renderPromoteResults(response.users);
            } catch (error) {
                promoteResultsTable.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-muted">${Utils.escapeHTML(error.message)}</td>
                    </tr>`;
            }
        }, 300);
    });

    const renderPromoteResults = (users) => {
        if (users.length === 0) {
            promoteResultsTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">No matching users found</td>
                </tr>`;
            return;
        }

        promoteResultsTable.innerHTML = users.map(user => {
            const name = Utils.escapeHTML(
                [user.firstName, user.otherName, user.surname].filter(Boolean).join(" ")
            );
            return `
                <tr>
                    <td>${name}</td>
                    <td>${Utils.escapeHTML(user.email)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="openActionModal('${user._id}', 'admin', 'Promote to Admin', 'Promote ${name} to Admin? They will gain access to the admin panel.')">Promote to Admin</button>
                    </td>
                </tr>`;
        }).join("");
    };

    // ── INIT ──
    await loadAdmins();

};

init();