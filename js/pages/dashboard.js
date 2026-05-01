document.addEventListener("DOMContentLoaded", async () => {
    Utils.initTheme();

    // Protect route
    if (!Auth.requireAuth()) return;

    // ── ELEMENT REFERENCES ──
    const sidebar = document.getElementById("sidebar");
    const hamburger = document.getElementById("hamburger");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const themeToggle = document.getElementById("themeToggle");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarName = document.getElementById("sidebarName");
    const topbarAvatar = document.getElementById("topbarAvatar");
    const welcomeTitle = document.getElementById("welcomeTitle");

    // ── SIDEBAR TOGGLE ──
    if (hamburger && sidebar && sidebarOverlay) {
        hamburger.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            sidebarOverlay.classList.toggle("active");
        });
    }

    if (sidebarOverlay && sidebar) {
        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("active");
        });
    }

    // ── THEME TOGGLE ──
    const updateThemeIcon = () => {
        if (!themeToggle) return;
        const theme = document.documentElement.getAttribute("data-theme");
        themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    };

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            Utils.toggleTheme();
            updateThemeIcon();
        });
    }

    updateThemeIcon();

    // ── POPULATE USER INFO ──
    const populateUser = (user) => {
        const initials = Utils.getInitials(user.fullName || "User");

        if (sidebarAvatar) {
            sidebarAvatar.innerHTML = user.profilePhoto
                ? `<img src="${user.profilePhoto}" alt="${user.fullName}">`
                : initials;
        }

        if (topbarAvatar) {
            topbarAvatar.innerHTML = user.profilePhoto
                ? `<img src="${user.profilePhoto}" alt="${user.fullName}">`
                : initials;
        }

        if (sidebarName) sidebarName.textContent = user.fullName;
        if (welcomeTitle) {
            welcomeTitle.textContent = `Welcome back, ${user.firstName}!`;
        }
    };

    // ── LOAD DASHBOARD DATA ──
    const loadDashboard = async () => {
        try {
            const response = await api.get("/user/profile");
            const user = response.user || response.data?.user;

            if (!user) throw new Error("User not found");

            // Update session
            const token = Auth.getToken();
            Auth.setSession(token, {
                id: user._id,
                fullName: user.fullName,
                firstName: user.firstName,
                email: user.email,
                role: user.role,
                profilePhoto: user.profilePhoto
            });

            populateUser(user);

        } catch (error) {
            if (error?.message?.includes("authorized") || error?.message?.includes("token")) {
                Auth.logout();
                return;
            }

            Utils.toast("Failed to load profile data", "error");
        }
    };

    // ── INIT LOAD ──
    await loadDashboard();
});