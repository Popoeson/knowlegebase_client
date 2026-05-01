document.addEventListener("DOMContentLoaded", async () => {
    Utils.initTheme();

    // ── PROTECT ROUTE ──
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
            // Load everything in parallel
            const [profileResponse, statsResponse, coursesResponse] = await Promise.all([
                api.get("/user/profile"),
                api.get("/user/stats"),
                api.get("/courses")
            ]);

            // Safe extraction
            const user = profileResponse.user || profileResponse.data?.user;
            const stats = statsResponse.stats || statsResponse.data?.stats;
            const courses = coursesResponse.courses || coursesResponse.data?.courses || [];

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

            // Populate user UI
            populateUser(user);

            // ── STATS UI ──
            const statExams = document.getElementById("statExams");
            const statCerts = document.getElementById("statCerts");
            const statPassed = document.getElementById("statPassed");
            const statCourses = document.getElementById("statCourses");

            if (statExams) statExams.textContent = stats?.totalExams ?? 0;
            if (statCerts) statCerts.textContent = stats?.totalCertificates ?? 0;
            if (statPassed) statPassed.textContent = stats?.passedExams ?? 0;
            if (statCourses) statCourses.textContent = stats?.totalCourses ?? 0;

            // ── COURSES UI ──
            const coursesGrid = document.getElementById("coursesGrid");

            if (!coursesGrid) return;

            if (!courses || courses.length === 0) {
                coursesGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <h3 class="empty-state-title">No courses yet</h3>
                        <p class="empty-state-text">Courses will appear here once they are added.</p>
                    </div>`;
            } else {
                const preview = courses.slice(0, 3);

                coursesGrid.innerHTML = preview.map(course => `
                    <div class="course-card"
                        onclick="window.location.href='./course-detail.html?id=${course._id}'">
                        
                        <p class="course-card-category">
                            ${course.category?.name || "General"}
                        </p>

                        <div class="course-card-icon">📘</div>

                        <h3 class="course-card-title">${course.title}</h3>

                        <p class="course-card-desc">
                            ${Utils.truncate(course.description || "", 80)}
                        </p>

                        <div class="course-card-meta">
                            <span class="badge badge-info">${course.difficulty}</span>
                            <span class="course-card-price">$${course.price}</span>
                        </div>
                    </div>
                `).join("");
            }

        } catch (error) {
            if (error?.message?.includes("authorized") || error?.message?.includes("token")) {
                Auth.logout();
                return;
            }

            console.error(error);
            Utils.toast("Failed to load dashboard data", "error");
        }
    };

    // ── INIT LOAD ──
    await loadDashboard();
});