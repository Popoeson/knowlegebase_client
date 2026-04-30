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
    const welcomeTitle = document.getElementById("welcomeTitle");
    const recentUsersTable = document.getElementById("recentUsersTable");

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
        welcomeTitle.textContent = `Welcome, ${user.firstName}!`;
        if (user.profilePhoto) {
            sidebarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
            topbarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
        } else {
            sidebarAvatar.innerHTML = defaultAvatar;
            topbarAvatar.innerHTML = defaultAvatar;
        }
    }

    // ── LOAD STATS ──
    const loadStats = async () => {
        try {
            const response = await api.get("/admin/stats");
            const { stats } = response;

            document.getElementById("statUsers").textContent = stats.totalUsers;
            document.getElementById("statCourses").textContent = stats.totalCourses;
            document.getElementById("statQuestions").textContent = stats.totalQuestions;
            document.getElementById("statCerts").textContent = 0;

        } catch (error) {
            Utils.toast("Failed to load stats", "error");
        }
    };

    // ── LOAD RECENT USERS ──
    const loadRecentUsers = async () => {
        try {
            const response = await api.get("/admin/users");
            const users = response.users.slice(0, 5);

            if (users.length === 0) {
                recentUsersTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted">No users yet</td>
                    </tr>`;
                return;
            }

            recentUsersTable.innerHTML = users.map(user => `
                <tr>
                    <td>${user.fullName}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${user.isVerified ? "badge-success" : "badge-error"}">
                            ${user.isVerified ? "Verified" : "Unverified"}
                        </span>
                    </td>
                    <td>${Utils.formatDate(user.createdAt)}</td>
                </tr>
            `).join("");

        } catch (error) {
            recentUsersTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">Failed to load users</td>
                </tr>`;
        }
    };

    await loadStats();
    await loadRecentUsers();

};

init();