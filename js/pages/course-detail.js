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
    const courseContent = document.getElementById("courseContent");

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

    // ── GET COURSE ID FROM URL ──
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    if (!courseId) {
        window.location.href = "./courses.html";
        return;
    }

    // ── FETCH EXCHANGE RATE ──
    let exchangeRate = 1600;
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        exchangeRate = data.rates.NGN;
    } catch (error) {
        exchangeRate = 1600;
    }

    // ── FORMAT PRICE ──
    const formatNGN = (usd) => {
        const ngn = (usd * exchangeRate).toLocaleString("en-NG", {
            maximumFractionDigits: 0
        });
        return `~₦${ngn}`;
    };

    // ── LOAD COURSE ──
    try {
        const response = await api.get(`/courses/${courseId}`);
        const { course, questionCounts } = response;

        // Update page title
        document.title = `${course.title} — KNOWLEDGEBASE`;

        // ── RENDER TOPICS ──
        const topicsHTML = course.topics && course.topics.length > 0
            ? course.topics.map(topic => `
                <div class="topic-item">
                    <div class="topic-bullet"></div>
                    <span>${topic}</span>
                </div>`).join("")
            : "<p class='text-muted'>No topics listed.</p>";

        // ── RENDER FULL PAGE ──
        courseContent.innerHTML = `
            <div style="margin-bottom: var(--space-6);">
                <a href="./courses.html" class="btn btn-ghost btn-sm">← Back to Courses</a>
            </div>

            <div class="course-detail-layout">

                <!-- MAIN CONTENT -->
                <div class="course-detail-main">

                    <!-- HEADER -->
                    <div class="course-header">
                        <div class="course-header-meta">
                            <span class="course-category-tag">${course.category?.name || "General"}</span>
                            <span class="badge badge-info">${course.difficulty}</span>
                        </div>
                        <h1 class="course-detail-title">${course.title}</h1>
                        <div class="course-detail-stats">
                            <span class="course-detail-stat">
                                <span class="course-detail-stat-icon">⏱</span>
                                ${course.duration} min exam
                            </span>
                            <span class="course-detail-stat">
                                <span class="course-detail-stat-icon">📝</span>
                                ${course.certificationQuestions} questions
                            </span>
                            <span class="course-detail-stat">
                                <span class="course-detail-stat-icon">🎯</span>
                                ${course.passMark}% pass mark
                            </span>
                        </div>
                    </div>

                    <!-- DESCRIPTION -->
                    <div class="course-section">
                        <h2 class="course-section-title">About This Certification</h2>
                        <p class="course-description">${course.description}</p>
                    </div>

                    <!-- TOPICS -->
                    <div class="course-section">
                        <h2 class="course-section-title">What You'll Be Tested On</h2>
                        <div class="topics-list">${topicsHTML}</div>
                    </div>

                    <!-- EXAM STRUCTURE -->
                    <div class="course-section">
                        <h2 class="course-section-title">Exam Structure</h2>
                        <div class="exam-structure-grid">
                            <div class="exam-structure-item">
                                <span class="exam-structure-label">Questions</span>
                                <span class="exam-structure-value">${course.certificationQuestions} MCQs</span>
                            </div>
                            <div class="exam-structure-item">
                                <span class="exam-structure-label">Time Limit</span>
                                <span class="exam-structure-value">${course.timeLimit} minutes</span>
                            </div>
                            <div class="exam-structure-item">
                                <span class="exam-structure-label">Pass Mark</span>
                                <span class="exam-structure-value">${course.passMark}%</span>
                            </div>
                            <div class="exam-structure-item">
                                <span class="exam-structure-label">Question Type</span>
                                <span class="exam-structure-value">Multiple Choice</span>
                            </div>
                            <div class="exam-structure-item">
                                <span class="exam-structure-label">Practice Bank</span>
                                <span class="exam-structure-value">${questionCounts.practice} questions</span>
                            </div>
                            <div class="exam-structure-item">
                                <span class="exam-structure-label">Cert. Bank</span>
                                <span class="exam-structure-value">${questionCounts.certification} questions</span>
                            </div>
                        </div>
                    </div>

                    <!-- CERTIFICATE INFO -->
                    <div class="course-section">
                        <h2 class="course-section-title">Certificate</h2>
                        <div class="topics-list">
                            <div class="topic-item">
                                <div class="topic-bullet"></div>
                                <span>Certificate issued immediately upon passing</span>
                            </div>
                            <div class="topic-item">
                                <div class="topic-bullet"></div>
                                <span>Includes a unique verifiable certificate ID</span>
                            </div>
                            <div class="topic-item">
                                <div class="topic-bullet"></div>
                                <span>Publicly verifiable at knowledgebase.com/verify</span>
                            </div>
                            <div class="topic-item">
                                <div class="topic-bullet"></div>
                                <span>Downloadable as PDF</span>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- SIDEBAR -->
                <div class="course-detail-sidebar">
                    <div class="pricing-card">

                        <div class="pricing-card-price">
                            <div class="pricing-usd">$${course.price}</div>
                            <div class="pricing-ngn">${formatNGN(course.price)} NGN</div>
                            <div class="pricing-note">Payment accepted in Naira at current rate</div>
                        </div>

                        <div class="pricing-features">
                            <div class="pricing-feature">
                                <span class="pricing-feature-icon">✅</span>
                                <span>Official certificate on passing</span>
                            </div>
                            <div class="pricing-feature">
                                <span class="pricing-feature-icon">✅</span>
                                <span>Unique verification ID</span>
                            </div>
                            <div class="pricing-feature">
                                <span class="pricing-feature-icon">✅</span>
                                <span>Downloadable PDF certificate</span>
                            </div>
                            <div class="pricing-feature">
                                <span class="pricing-feature-icon">✅</span>
                                <span>${course.certificationQuestions} randomized questions</span>
                            </div>
                            <div class="pricing-feature">
                                <span class="pricing-feature-icon">✅</span>
                                <span>${course.timeLimit} minute time limit</span>
                            </div>
                        </div>

                        <button
                            class="btn btn-primary w-full btn-lg"
                            id="startExamBtn"
                            onclick="window.location.href='./exam.html?id=${course._id}&type=certification'"
                        >
                            Take Certification Exam
                        </button>

                        <div class="pricing-free-tag">
                            <strong>Free practice test available</strong> —
                            <a
                                href="./exam.html?id=${course._id}&type=practice"
                                style="color: var(--color-primary);"
                            >Start practicing</a>
                        </div>

                    </div>
                </div>

            </div>
        `;

    } catch (error) {
        courseContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Course not found</h3>
                <p class="empty-state-text">This course may have been removed.</p>
                <a href="./courses.html" class="btn btn-primary mt-4">Back to Courses</a>
            </div>`;
    }

};

init();