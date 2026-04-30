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
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const coursesGrid = document.getElementById("coursesGrid");
    const coursesCount = document.getElementById("coursesCount");

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

    // ── STATE ──
    let allCourses = [];
    let exchangeRate = null;

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
        if (!exchangeRate) return `$${usd}`;
        const ngn = (usd * exchangeRate).toLocaleString("en-NG", {
            maximumFractionDigits: 0
        });
        return `$${usd} <span class="course-card-price-sub">(~₦${ngn})</span>`;
    };

    // ── RENDER COURSES ──
    const renderCourses = (courses) => {
        coursesCount.textContent = `${courses.length} course${courses.length !== 1 ? "s" : ""} found`;

        if (courses.length === 0) {
            coursesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3 class="empty-state-title">No courses found</h3>
                    <p class="empty-state-text">Try adjusting your search or filter.</p>
                </div>`;
            return;
        }

        coursesGrid.innerHTML = courses.map(course => `
            <div class="course-card" onclick="window.location.href='./course-detail.html?id=${course._id}'">
                <p class="course-card-category">${course.category?.name || "General"}</p>
                <div class="course-card-icon">📘</div>
                <h3 class="course-card-title">${course.title}</h3>
                <p class="course-card-desc">${Utils.truncate(course.description, 100)}</p>
                <div class="course-card-stats">
                    <span class="course-card-stat">⏱ ${course.duration} mins</span>
                    <span class="course-card-stat">📝 ${course.certificationQuestions} questions</span>
                    <span class="course-card-stat">🎯 ${course.passMark}% pass mark</span>
                </div>
                <div class="course-card-meta">
                    <span class="badge badge-info">${course.difficulty}</span>
                    <span class="course-card-price">${formatPrice(course.price)}</span>
                </div>
            </div>
        `).join("");
    };

    // ── FILTER COURSES ──
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

    // ── LOAD CATEGORIES ──
    const loadCategories = async () => {
        try {
            const response = await api.get("/courses/categories");
            const categories = response.categories;

            categories.forEach(cat => {
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
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3 class="empty-state-title">Failed to load courses</h3>
                    <p class="empty-state-text">Please refresh the page.</p>
                </div>`;
        }
    };

    // ── EVENT LISTENERS ──
    searchInput.addEventListener("input", filterCourses);
    categoryFilter.addEventListener("change", filterCourses);

    // ── INIT ──
    await fetchExchangeRate();
    await loadCategories();
    await loadCourses();

};

init();