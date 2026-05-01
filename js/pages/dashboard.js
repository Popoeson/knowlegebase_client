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
    const loadDashboard = async () => {
    try {
        // Load profile and stats and courses in parallel
        const [profileResponse, statsResponse, coursesResponse] = await Promise.all([
            api.get("/user/profile"),
            api.get("/user/stats"),
            api.get("/courses")
        ]);

        const user = profileResponse.user;
        const stats = statsResponse.stats;
        const courses = coursesResponse.courses;

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

        // Populate user info
        populateUser(user);

        // Populate stats
        document.getElementById("statExams").textContent = stats.totalExams;
        document.getElementById("statCerts").textContent = stats.totalCertificates;
        document.getElementById("statPassed").textContent = stats.passedExams;
        document.getElementById("statCourses").textContent = stats.totalCourses;

        // Populate courses
        const coursesGrid = document.getElementById("coursesGrid");
        if (courses.length === 0) {
            coursesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <h3 class="empty-state-title">No courses yet</h3>
                    <p class="empty-state-text">Courses will appear here once they are added.</p>
                </div>`;
        } else {
            // Show max 3 courses on dashboard
            const preview = courses.slice(0, 3);
            coursesGrid.innerHTML = preview.map(course => `
                <div class="course-card"
                    onclick="window.location.href='./course-detail.html?id=${course._id}'">
                    <p class="course-card-category">${course.category?.name || "General"}</p>
                    <div class="course-card-icon">📘</div>
                    <h3 class="course-card-title">${course.title}</h3>
                    <p class="course-card-desc">${Utils.truncate(course.description, 80)}</p>
                    <div class="course-card-meta">
                        <span class="badge badge-info">${course.difficulty}</span>
                        <span class="course-card-price">$${course.price}</span>
                    </div>
                </div>
            `).join("");
        }

    } catch (error) {
        if (error.message.includes("authorized") || error.message.includes("token")) {
            Auth.logout();
            return;
        }
        Utils.toast("Failed to load dashboard data", "error");
    }
};

init();