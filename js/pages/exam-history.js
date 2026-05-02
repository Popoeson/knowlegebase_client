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
    const attemptsTable = document.getElementById("attemptsTable");
    const attemptsCount = document.getElementById("attemptsCount");
    const searchInput = document.getElementById("searchInput");
    const typeFilter = document.getElementById("typeFilter");
    const resultFilter = document.getElementById("resultFilter");

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

    // ── FORMAT TIME ──
    const formatTimeTaken = (seconds) => {
        if (!seconds) return "—";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    // ── STATE ──
    let allAttempts = [];

    // ── LOAD ATTEMPTS ──
    const loadAttempts = async () => {
        try {
            const response = await api.get("/exam/attempts");
            allAttempts = response.attempts;

            const passed = allAttempts.filter(a => a.passed).length;
            const failed = allAttempts.length - passed;
            const passRate = allAttempts.length > 0
                ? Math.round((passed / allAttempts.length) * 100)
                : 0;

            document.getElementById("statTotal").textContent = allAttempts.length;
            document.getElementById("statPassed").textContent = passed;
            document.getElementById("statFailed").textContent = failed;
            document.getElementById("statPassRate").textContent = `${passRate}%`;

            renderAttempts(allAttempts);

        } catch (error) {
            attemptsTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        Failed to load exam history
                    </td>
                </tr>`;
        }
    };

    // ── RENDER ATTEMPTS ──
    const renderAttempts = (attempts) => {
        attemptsCount.textContent = `(${attempts.length})`;

        if (attempts.length === 0) {
            attemptsTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        No exam attempts yet.
                        <a href="./courses.html" style="color: var(--color-primary);">
                            Browse courses
                        </a>
                    </td>
                </tr>`;
            return;
        }

        attemptsTable.innerHTML = attempts.map((attempt, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${attempt.course?.title || "—"}</strong>
                </td>
                <td>
                    <span class="badge ${attempt.type === "certification"
                        ? "badge-info"
                        : "badge-success"}">
                        ${attempt.type}
                    </span>
                </td>
                <td>
                    <strong style="color: ${attempt.passed
                        ? "var(--color-success)"
                        : "var(--color-error)"}">
                        ${attempt.score}%
                    </strong>
                </td>
                <td>
                    <span class="badge ${attempt.passed
                        ? "badge-success"
                        : "badge-error"}">
                        ${attempt.passed ? "✅ Passed" : "❌ Failed"}
                    </span>
                    ${attempt.status === "timed-out"
                        ? `<span class="badge badge-warning" style="margin-left: 4px;">
                               ⏱ Timed Out
                           </span>`
                        : ""}
                </td>
                <td>${formatTimeTaken(attempt.timeTaken)}</td>
                <td>${Utils.formatDate(attempt.submittedAt)}</td>
                <td>
                    <div class="table-actions">
                        <a
                            href="./result.html?id=${attempt._id}"
                            class="btn btn-outline btn-sm"
                        >
                            View Result
                        </a>
                        ${attempt.passed && attempt.type === "certification"
                            ? `<a
                                href="./certificate.html?attemptId=${attempt._id}"
                                class="btn btn-primary btn-sm"
                               >
                                🏆 Certificate
                               </a>`
                            : ""}
                        ${!attempt.passed && attempt.type === "certification"
                            ? `<a
                                href="./payment.html?id=${attempt.course?._id}"
                                class="btn btn-accent btn-sm"
                               >
                                🔄 Retry
                               </a>`
                            : ""}
                    </div>
                </td>
            </tr>
        `).join("");
    };

    // ── FILTER ──
    const filterAttempts = () => {
        const search = searchInput.value.toLowerCase().trim();
        const type = typeFilter.value;
        const result = resultFilter.value;

        const filtered = allAttempts.filter(attempt => {
            const matchesSearch = !search ||
                attempt.course?.title?.toLowerCase().includes(search);

            const matchesType = !type || attempt.type === type;

            const matchesResult = !result ||
                (result === "passed" && attempt.passed) ||
                (result === "failed" && !attempt.passed);

            return matchesSearch && matchesType && matchesResult;
        });

        renderAttempts(filtered);
    };

    searchInput.addEventListener("input", filterAttempts);
    typeFilter.addEventListener("change", filterAttempts);
    resultFilter.addEventListener("change", filterAttempts);

    await loadAttempts();

};

init();