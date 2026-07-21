Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
        window.location.href = "../login.html";
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
    const errorList = document.getElementById("errorList");
    const errorsCount = document.getElementById("errorsCount");
    const searchInput = document.getElementById("searchInput");
    const refreshBtn = document.getElementById("refreshBtn");
    const filterPills = document.querySelectorAll(".em-pill");

    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        sidebarOverlay.classList.toggle("active");
    });
    sidebarOverlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("active");
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

    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

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

    // ── DATA BACKUPS ──
    const backupStatusEl = document.getElementById("backupStatus");
    const fullBackupBtn = document.getElementById("fullBackupBtn");
    const incrementalBackupBtn = document.getElementById("incrementalBackupBtn");

    const loadBackupStatus = async () => {
        try {
            const status = await api.get("/backup/status");
            if (!status.lastBackup) {
                backupStatusEl.textContent = "No backups have been taken yet. Run a full backup now.";
            } else {
                backupStatusEl.textContent =
                    `Last backup: ${Utils.formatDate(status.lastBackup)} (${status.lastBackupType}). ` +
                    `Last full backup: ${status.lastFullBackup ? Utils.formatDate(status.lastFullBackup) : "none yet"}.`;
            }
        } catch (error) {
            backupStatusEl.textContent = "Could not check backup status.";
        }
    };

    const downloadBackup = async (mode, btn) => {
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Preparing...";

        try {
            const zipToggle = document.getElementById("zipFormatToggle");
            const format = zipToggle.checked ? "zip" : "json";

            const token = sessionStorage.getItem("kb_token");
            const response = await fetch(`${CONFIG.API_BASE_URL}/backup/export?mode=${mode}&format=${format}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.message || "Backup export failed");
            }

            const blob = await response.blob();
            const disposition = response.headers.get("Content-Disposition") || "";
            const match = disposition.match(/filename=([^;]+)/);
            const filename = match ? match[1].trim() : `asodem-backup-${mode}`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            Utils.toast("Backup downloaded successfully", "success");
            await loadBackupStatus();

        } catch (error) {
            Utils.toast(error.message || "Backup download failed", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };

    fullBackupBtn.addEventListener("click", () => downloadBackup("full", fullBackupBtn));
    incrementalBackupBtn.addEventListener("click", () => downloadBackup("incremental", incrementalBackupBtn));
    loadBackupStatus();

    // ── STATE ──
    let allErrors = [];
    let activeLevel = "all";

    // ── SPARKLINE (real 14-day trend from Sentry) ──
    const renderSparkline = (trend, level) => {
        if (!trend || trend.length < 2) return "";

        const max = Math.max(...trend, 1);
        const w = 70, h = 24;
        const step = w / (trend.length - 1);

        const points = trend.map((v, i) => {
            const x = i * step;
            const y = h - (v / max) * h;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");

        const color = (level === "fatal" || level === "error") ? "var(--color-error)"
            : level === "warning" ? "var(--color-warning)"
            : "var(--color-info)";

        return `
            <svg class="error-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
    };

    // ── LOAD ERRORS ──
    const loadErrors = async () => {
        errorList.innerHTML = `
            <div class="card">
                <p class="text-center text-muted" style="padding: var(--space-8) 0;">Loading...</p>
            </div>`;

        try {
            const response = await api.get("/error-monitor");
            allErrors = response.errors;

            document.getElementById("statTotal").textContent = response.summary.unresolved;
            document.getElementById("statOccurrences").textContent = response.summary.occurrences;
            document.getElementById("statUsers").textContent = response.summary.usersAffected;
            document.getElementById("statCritical").textContent = response.summary.critical;

            applyFilters();

        } catch (error) {
            errorList.innerHTML = `
                <div class="card">
                    <p class="text-center text-muted" style="padding: var(--space-8) 0;">
                        Failed to load error data. ${error.message || ""}
                    </p>
                </div>`;
        }
    };

    // ── RENDER ──
    const renderErrors = (errors) => {
        errorsCount.textContent = `(${errors.length})`;

        if (errors.length === 0) {
            errorList.innerHTML = `
                <div class="card error-empty-state">
                    <div class="error-empty-state-icon">🎉</div>
                    <p>No matching errors.</p>
                </div>`;
            return;
        }

        errorList.innerHTML = errors.map(err => `
            <div class="error-card" data-id="${err.id}">
                <div class="error-card-top">
                    <div class="error-card-left">
                        <span class="error-level-dot ${err.level}"></span>
                        <div class="error-card-titleblock">
                            <p class="error-card-title" title="${err.plainTitle}">${err.plainTitle}</p>
                            <div class="error-card-meta">
                                <span>🔁 ${err.count} event${err.count == 1 ? "" : "s"}</span>
                                <span>👤 ${err.userCount} user${err.userCount == 1 ? "" : "s"}</span>
                                <span>🕒 ${Utils.formatDate(err.lastSeen)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="error-card-right">
                        ${renderSparkline(err.trend, err.level)}
                        <span class="error-chevron">▼</span>
                    </div>
                </div>
                <div class="error-card-body">
                    <p class="error-card-explanation">${err.plainExplanation}</p>
                    <div class="error-card-suggestion">
                        <strong>Suggested next step:</strong> ${err.suggestion}
                    </div>
                    <div class="error-card-footer">
                        <span class="error-card-raw" title="${err.rawTitle}">${err.rawTitle}</span>
                        <a href="${err.sentryUrl}" target="_blank" rel="noopener" class="error-card-link">
                            Full technical details ↗
                        </a>
                    </div>
                </div>
            </div>
        `).join("");

        document.querySelectorAll(".error-card").forEach(card => {
            card.querySelector(".error-card-top").addEventListener("click", () => {
                card.classList.toggle("open");
            });
        });
    };

    // ── FILTERS (level pills + search) ──
    const applyFilters = () => {
        const search = searchInput.value.toLowerCase().trim();

        let filtered = allErrors;

        if (activeLevel !== "all") {
            filtered = filtered.filter(e =>
                activeLevel === "error" ? (e.level === "error") : e.level === activeLevel
            );
        }

        if (search) {
            filtered = filtered.filter(e =>
                e.plainTitle.toLowerCase().includes(search) ||
                e.rawTitle.toLowerCase().includes(search)
            );
        }

        renderErrors(filtered);
    };

    filterPills.forEach(pill => {
        pill.addEventListener("click", () => {
            filterPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeLevel = pill.dataset.level;
            applyFilters();
        });
    });

    searchInput.addEventListener("input", applyFilters);
    refreshBtn.addEventListener("click", loadErrors);

    await loadErrors();

};

init();