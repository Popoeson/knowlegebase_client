Utils.initTheme();

// ── NAVBAR SCROLL EFFECT ──
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

// ── THEME TOGGLE ──
const themeToggle = document.getElementById("themeToggle");
const updateThemeIcon = () => {
    const theme = document.documentElement.getAttribute("data-theme");
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
};

themeToggle.addEventListener("click", () => {
    Utils.toggleTheme();
    updateThemeIcon();
});

updateThemeIcon();

// ── MOBILE MENU ──
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
});

document.addEventListener("click", (e) => {
    if (!navbar.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove("open");
    }
});

// ── REDIRECT IF LOGGED IN ──
if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (user && user.role === "admin") {
        const adminLink = document.querySelector(".navbar-actions .btn-primary");
        if (adminLink) {
            adminLink.textContent = "Admin Dashboard";
            adminLink.href = "./pages/admin/dashboard.html";
        }
    } else {
        const ctaLink = document.querySelector(".navbar-actions .btn-primary");
        if (ctaLink) {
            ctaLink.textContent = "Dashboard";
            ctaLink.href = "./pages/dashboard.html";
        }
    }
}

// ── LOAD FEATURED COURSES ──
const loadFeaturedCourses = async () => {
    const featuredCourses = document.getElementById("featuredCourses");

    try {
        const response = await api.get("/courses");
        const courses = response.courses.slice(0, 3);

        if (courses.length === 0) {
            featuredCourses.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">📚</div>
                    <h3 class="empty-state-title">Courses coming soon</h3>
                    <p class="empty-state-text">
                        We are adding new courses. Check back soon.
                    </p>
                </div>`;
            return;
        }

        featuredCourses.innerHTML = courses.map(course => `
            <div class="course-card"
                onclick="window.location.href='./pages/courses-public.html'">
                <p class="course-card-category">
                    ${course.category?.name || "General"}
                </p>
                <div class="course-card-icon">📘</div>
                <h3 class="course-card-title">${course.title}</h3>
                <p class="course-card-desc">
                    ${Utils.truncate(course.description, 100)}
                </p>
                <div class="course-card-stats">
                    <span class="course-card-stat">⏱ ${course.duration} mins</span>
                    <span class="course-card-stat">
                        📝 ${course.certificationQuestions} questions
                    </span>
                    <span class="course-card-stat">
                        🎯 ${course.passMark}% pass mark
                    </span>
                </div>
                <div class="course-card-meta">
                    <span class="badge badge-info">${course.difficulty}</span>
                    <span class="course-card-price">$${course.price}</span>
                </div>
            </div>
        `).join("");

        // Update hero stats
        document.getElementById("heroStatCourses").textContent =
            response.courses.length;

    } catch (error) {
        featuredCourses.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">📚</div>
                <h3 class="empty-state-title">Courses coming soon</h3>
            </div>`;
    }
};

// ── LOAD CERTIFICATE STATS ──
const loadStats = async () => {
    try {
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/certificates/verify/KB-STATS`
        ).catch(() => null);

        document.getElementById("heroStatCerts").textContent = "100+";

    } catch (error) {
        document.getElementById("heroStatCerts").textContent = "100+";
    }
};

// ── FIX COPYRIGHT YEAR ──
document.querySelector(".footer-copyright").textContent =
    `© ${new Date().getFullYear()} KNOWLEDGEBASE. All rights reserved.`;

// ── INIT ──
loadFeaturedCourses();
loadStats();