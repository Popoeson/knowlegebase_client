Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
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

    // ── DEFAULT AVATAR SVG ──
    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

    // ── POPULATE USER INFO ──
    const populateUser = (user) => {
        if (user.profilePhoto) {
            sidebarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
            topbarAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
        } else {
            sidebarAvatar.innerHTML = defaultAvatar;
            topbarAvatar.innerHTML = defaultAvatar;
        }

        sidebarName.textContent = user.fullName;
        welcomeTitle.textContent = `Welcome back, ${user.firstName}!`;
    };

    // ── LOAD DASHBOARD DATA ──
    try {
        const response = await api.get("/user/profile");
        const user = response.user;

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
        if (error.message.includes("authorized") || error.message.includes("token")) {
            Auth.logout();
            return;
        }
        Utils.toast("Failed to load profile data", "error");
    }

};

init();