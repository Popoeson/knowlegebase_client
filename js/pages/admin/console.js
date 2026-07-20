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
    let allErrors = [];

    // ── LEVEL BADGE CLASS ──
    const levelBadgeClass = (level) => {
        if (level === "fatal" || level === "error") return "badge-error";
        if (level === "warning") return "badge-warning";
        return "badge-info";
    };

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
            const token = sessionStorage.getItem("kb_token");
            const response = await fetch(`${CONFIG.API_BASE_URL}/backup/export?mode=${mode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.message || "Backup export failed");
            }

            const blob = await response.blob();
            const disposition = response.headers.get("Content-Disposition") || "";
            const match = disposition.match(/filename=([^;]+)/);
            const filename = match ? match[1].trim() : `asodem-backup-${mode}.json`;

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

    // ── LOAD ERRORS ──
    const loadErrors = async () => {
        errorList.innerHTML = `
            <div class="card">
                <p class="text-center text-muted" style="padding: var(--space-8) 0;">Loading...</p>
            </div>`;

        try {
            const response = await api.get("/error-monitor");
            allErrors = response.errors;

            const totalOccurrences = allErrors.reduce((sum, e) => sum + Number(e.count || 0), 0);
            const totalUsers = allErrors.reduce((sum, e) => sum + Number(e.userCount || 0), 0);

            document.getElementById("statTotal").textContent = allErrors.length;
            document.getElementById("statOccurrences").textContent = totalOccurrences;
            document.getElementById("statUsers").textContent = totalUsers;

            renderErrors(allErrors);

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
                    <p>No unresolved errors in the last 14 days.</p>
                </div>`;
            return;
        }

        errorList.innerHTML = errors.map(err => `
            <div class="error-card">
                <div class="error-card-top">
                    <h3 class="error-card-title">${err.plainTitle}</h3>
                    <span class="badge ${levelBadgeClass(err.level)}">${err.level || "error"}</span>
                </div>

                <div class="error-card-meta">
                    <span>🔁 ${err.count} occurrence${err.count == 1 ? "" : "s"}</span>
                    <span>👤 ${err.userCount} user${err.userCount == 1 ? "" : "s"} affected</span>
                    <span>🕒 Last seen ${Utils.formatDate(err.lastSeen)}</span>
                </div>

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
        `).join("");
    };

    // ── SEARCH ──
    searchInput.addEventListener("input", () => {
        const search = searchInput.value.toLowerCase().trim();
        if (!search) {
            renderErrors(allErrors);
            return;
        }
        const filtered = allErrors.filter(e =>
            e.plainTitle.toLowerCase().includes(search) ||
            e.rawTitle.toLowerCase().includes(search)
        );
        renderErrors(filtered);
    });

    // ── REFRESH ──
    refreshBtn.addEventListener("click", loadErrors);

    await loadErrors();

};

init();