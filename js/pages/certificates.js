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
    const certificatesGrid = document.getElementById("certificatesGrid");
    const certCount = document.getElementById("certCount");

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

    // ── LOAD CERTIFICATES ──
    try {
        const response = await api.get("/certificates");
        const certificates = response.certificates;

        certCount.textContent = `(${certificates.length})`;

        if (certificates.length === 0) {
            certificatesGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">🏆</div>
                    <h3 class="empty-state-title">No certificates yet</h3>
                    <p class="empty-state-text">
                        Pass a certification exam to earn your first certificate.
                    </p>
                    <a href="./courses.html" class="btn btn-primary mt-4">
                        Browse Courses
                    </a>
                </div>`;
            return;
        }

        certificatesGrid.innerHTML = certificates.map(cert => `
            <div class="certificate-card"
                onclick="window.location.href='./certificate.html?id=${cert._id}'">
                <div class="certificate-card-icon">🏆</div>
                <h3 class="certificate-card-course">${cert.course?.title || "—"}</h3>
                <span class="certificate-card-id">${cert.certificateId}</span>
                <p class="certificate-card-date">
                    Issued ${Utils.formatDate(cert.issuedAt)}
                </p>
                <div class="certificate-card-actions">
                    <a
                        href="./certificate.html?id=${cert._id}"
                        class="btn btn-primary btn-sm"
                        onclick="event.stopPropagation()"
                    >
                        View Certificate
                    </a>
                    ${cert.pdfUrl ? `
                        <a
                            href="${cert.pdfUrl}"
                            target="_blank"
                            download
                            class="btn btn-outline btn-sm"
                            onclick="event.stopPropagation()"
                        >
                            ⬇ PDF
                        </a>` : ""}
                </div>
            </div>
        `).join("");

    } catch (error) {
        certificatesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Failed to load certificates</h3>
                <p class="empty-state-text">Please refresh the page.</p>
            </div>`;
    }

};

init();