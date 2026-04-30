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

// ── POPULATE USER INFO ──
const populateUser = (user) => {
    const initials = Utils.getInitials(user.fullName);

    // Sidebar avatar
    if (user.profilePhoto) {
        sidebarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
    } else {
        sidebarAvatar.textContent = initials;
    }

    // Topbar avatar
    if (user.profilePhoto) {
        topbarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
    } else {
        topbarAvatar.textContent = initials;
    }

    sidebarName.textContent = user.fullName;
    welcomeTitle.textContent = `Welcome back, ${user.firstName}!`;
};

// ── LOAD DASHBOARD DATA ──
const loadDashboard = async () => {
    try {
        const response = await api.get("/user/profile");
        const user = response.user;

        // Update session with latest user data
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
        // If token is invalid, log out
        if (error.message.includes("authorized") || error.message.includes("token")) {
            Auth.logout();
        }
        Utils.toast("Failed to load profile data", "error");
    }
};

loadDashboard();