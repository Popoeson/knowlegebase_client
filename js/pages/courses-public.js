Utils.initTheme();

// ── NAVBAR SETUP ──
const navbar = document.getElementById("navbar");
const themeToggle = document.getElementById("themeToggle");
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
});

const updateThemeIcon = () => {
    const theme = document.documentElement.getAttribute("data-theme");
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
};

themeToggle.addEventListener("click", () => {
    Utils.toggleTheme();
    updateThemeIcon();
});

updateThemeIcon();

hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
});

document.addEventListener("click", (e) => {
    if (!navbar.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove("open");
    }
});

// ── FOOTER YEAR ──
document.getElementById("footerYear").textContent =
    `© ${new Date().getFullYear()} KNOWLEDGEBASE. All rights reserved.`;

// ── REDIRECT IF LOGGED IN ──
if (Auth.isLoggedIn()) {
    const ctaBtn = document.querySelector(".navbar-actions .btn-primary");
    if (ctaBtn) {
        ctaBtn.textContent = "Dashboard";
        ctaBtn.href = Auth.isAdmin()
            ? "./admin/dashboard.html"
            : "./dashboard.html";
    }
}

// ── STATE ──
let allCourses = [];
let exchangeRate = 1600;

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const coursesGrid = document.getElementById("coursesGrid");
const coursesCount = document.getElementById("coursesCount");

// ── FETCH EXCHANGE RATE ──
const fetchExchangeRate = async () => {
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        exchangeRate = data.rates.NGN;
    } catch (error) {
        exchangeRate = 1600;
    }
};

// ── FORMAT PRICE ──
const formatPrice = (usd) => {
    const ngn = Math.round(usd * exchangeRate).toLocaleString("en-NG");
    return `$${usd} <span style="font-size: var(--text-xs);
        color: var(--color-text-muted);">(~₦${ngn})</span>`;
};

// ── RENDER COURSES ──
const renderCourses = (courses) => {
    coursesCount.textContent =
        `${courses.length} course${courses.length !== 1 ? "s" : ""} found`;

    if (courses.length === 0) {
        coursesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🔍</div>
                <h3 class="empty-state-title">No courses found</h3>
                <p class="empty-state-text">
                    Try adjusting your search or filter.
                </p>
            </div>`;
        return;
    }

    coursesGrid.innerHTML = courses.map(course => `
        <div class="course-card">
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
            <div class="course-card-meta" style="margin-bottom: var(--space-4);">
                <span class="badge badge-info">${course.difficulty}</span>
                <span class="course-card-price">${formatPrice(course.price)}</span>
            </div>
            <div style="display: flex; gap: var(--space-2);">
                <a
                    href="${Auth.isLoggedIn()
                        ? `./exam.html?id=${course._id}&type=practice`
                        : `./register.html`}"
                    class="btn btn-ghost btn-sm"
                    style="flex: 1; text-align: center;"
                >
                    Practice Free
                </a>
                <a
                    href="${Auth.isLoggedIn()
                        ? `./payment.html?id=${course._id}`
                        : `./register.html`}"
                    class="btn btn-primary btn-sm"
                    style="flex: 1; text-align: center;"
                >
                    Get Certified
                </a>
            </div>
        </div>
    `).join("");
};

// ── FILTER ──
const filterCourses = () => {
    const search = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;

    const filtered = allCourses.filter(course => {
        const matchesSearch = !search ||
            course.title.toLowerCase().includes(search) ||
            course.description.toLowerCase().includes(search);

        const matchesCategory = !category ||
            course.category?._id === category;

        return matchesSearch && matchesCategory;
    });

    renderCourses(filtered);
};

searchInput.addEventListener("input", filterCourses);
categoryFilter.addEventListener("change", filterCourses);

// ── LOAD CATEGORIES ──
const loadCategories = async () => {
    try {
        const response = await api.get("/courses/categories");
        response.categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat._id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load categories");
    }
};

// ── LOAD COURSES ──
const loadCourses = async () => {
    try {
        const response = await api.get("/courses");
        allCourses = response.courses;
        renderCourses(allCourses);
    } catch (error) {
        coursesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Failed to load courses</h3>
                <p class="empty-state-text">Please refresh the page.</p>
            </div>`;
    }
};

// ── INIT ──
const init = async () => {
    await fetchExchangeRate();
    await loadCategories();
    await loadCourses();
};

init();