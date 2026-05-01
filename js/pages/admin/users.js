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
    const usersTable = document.getElementById("usersTable");
    const usersCount = document.getElementById("usersCount");
    const searchInput = document.getElementById("searchInput");
    const verifiedFilter = document.getElementById("verifiedFilter");
    const userModal = document.getElementById("userModal");
    const deleteModal = document.getElementById("deleteModal");

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

    // ── CLOSE MODALS ──
    document.getElementById("closeUserModal").addEventListener("click", () => closeModal(userModal));
    document.getElementById("closeUserModalBtn").addEventListener("click", () => closeModal(userModal));
    document.getElementById("closeDeleteModal").addEventListener("click", () => closeModal(deleteModal));
    document.getElementById("cancelDeleteBtn").addEventListener("click", () => closeModal(deleteModal));

    // ── STATE ──
    let allUsers = [];

    // ── LOAD USERS ──
    const loadUsers = async () => {
        try {
            const response = await api.get("/admin/users");
            allUsers = response.users;

            const verified = allUsers.filter(u => u.isVerified).length;
            const unverified = allUsers.length - verified;

            document.getElementById("statTotal").textContent = allUsers.length;
            document.getElementById("statVerified").textContent = verified;
            document.getElementById("statUnverified").textContent = unverified;

            renderUsers(allUsers);

        } catch (error) {
            usersTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">Failed to load users</td>
                </tr>`;
        }
    };

    // ── RENDER USERS ──
    const renderUsers = (users) => {
        usersCount.textContent = `(${users.length})`;

        if (users.length === 0) {
            usersTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No users found</td>
                </tr>`;
            return;
        }

        usersTable.innerHTML = users.map((user, index) => `
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
                            ${user.profilePhoto
                                ? `<img src="${user.profilePhoto}" style="width:100%;height:100%;object-fit:cover;">`
                                : user.firstName[0] + user.surname[0]}
                        </div>
                        <span>${user.fullName}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${user.isVerified ? "badge-success" : "badge-error"}">
                        ${user.isVerified ? "Verified" : "Unverified"}
                    </span>
                </td>
                <td>${Utils.formatDate(user.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button
                            class="btn-icon btn-icon-edit"
                            onclick="viewUser('${user._id}')"
                            title="View Details"
                        >👁</button>
                        <button
                            class="btn-icon btn-icon-delete"
                            onclick="confirmDelete('${user._id}', '${user.fullName}')"
                            title="Delete"
                        >🗑️</button>
                    </div>
                </td>
            </tr>
        `).join("");
    };

    // ── FILTER USERS ──
    const filterUsers = () => {
        const search = searchInput.value.toLowerCase().trim();
        const verified = verifiedFilter.value;

        const filtered = allUsers.filter(user => {
            const matchesSearch = !search ||
                user.fullName.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search);

            const matchesVerified = verified === "" ||
                String(user.isVerified) === verified;

            return matchesSearch && matchesVerified;
        });

        renderUsers(filtered);
    };

    searchInput.addEventListener("input", filterUsers);
    verifiedFilter.addEventListener("change", filterUsers);

    // ── VIEW USER DETAILS (GLOBAL) ──
    window.viewUser = (id) => {
        const user = allUsers.find(u => u._id === id);
        if (!user) return;

        document.getElementById("userDetailContent").innerHTML = `
            <div class="profile-info-item">
                <span class="profile-info-label">Full Name</span>
                <span class="profile-info-value">${user.fullName}</span>
            </div>
            <div class="profile-info-item">
                <span class="profile-info-label">Email</span>
                <span class="profile-info-value">${user.email}</span>
            </div>
            <div class="profile-info-item">
                <span class="profile-info-label">Phone</span>
                <span class="profile-info-value">${user.phone || "—"}</span>
            </div>
            <div class="profile-info-item">
                <span class="profile-info-label">Status</span>
                <span class="profile-info-value">
                    <span class="badge ${user.isVerified ? "badge-success" : "badge-error"}">
                        ${user.isVerified ? "Verified" : "Unverified"}
                    </span>
                </span>
            </div>
            <div class="profile-info-item">
                <span class="profile-info-label">Joined</span>
                <span class="profile-info-value">${Utils.formatDate(user.createdAt)}</span>
            </div>
            <div class="profile-info-item">
                <span class="profile-info-label">Bio</span>
                <span class="profile-info-value">${user.bio || "—"}</span>
            </div>
        `;

        openModal(userModal);
    };

    // ── CONFIRM DELETE (GLOBAL) ──
    window.confirmDelete = (id, name) => {
        document.getElementById("deleteUserName").textContent = name;
        document.getElementById("deleteUserId").value = id;
        openModal(deleteModal);
    };

    // ── DELETE USER ──
    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
        const id = document.getElementById("deleteUserId").value;
        const confirmBtn = document.getElementById("confirmDeleteBtn");

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Deleting...";

        try {
            await api.delete(`/admin/users/${id}`);
            Utils.toast("User deleted successfully", "success");
            closeModal(deleteModal);
            await loadUsers();
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete User";
        }
    });

    // ── INIT ──
    await loadUsers();

};

init();