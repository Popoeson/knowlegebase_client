const loadDashboard = async () => {
    try {
        // ── LOAD ALL DATA IN PARALLEL ──
        const [profileResponse, statsResponse, coursesResponse] = await Promise.all([
            api.get("/user/profile"),
            api.get("/user/stats"),
            api.get("/courses")
        ]);

        // ── SAFE DATA EXTRACTION ──
        const user = profileResponse.user || profileResponse.data?.user;
        const stats = statsResponse.stats || statsResponse.data?.stats;
        const courses = coursesResponse.courses || coursesResponse.data?.courses || [];

        if (!user) throw new Error("User not found");

        // ── UPDATE SESSION ──
        const token = Auth.getToken();
        Auth.setSession(token, {
            id: user._id,
            fullName: user.fullName,
            firstName: user.firstName,
            email: user.email,
            role: user.role,
            profilePhoto: user.profilePhoto
        });

        // ── USER UI ──
        populateUser(user);

        // ── STATS UI (SAFE) ──
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

        Utils.toast("Failed to load dashboard data", "error");
        console.error(error); // 🔍 helps debugging
    }
};