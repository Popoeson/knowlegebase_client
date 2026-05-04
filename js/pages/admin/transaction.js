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
    const transactionsTable = document.getElementById("transactionsTable");
    const transactionsCount = document.getElementById("transactionsCount");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");

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
    let allPayments = [];

    // ── FORMAT AMOUNT ──
    const formatAmount = (kobo) => {
        const naira = kobo / 100;
        return `₦${naira.toLocaleString("en-NG")}`;
    };

    // ── LOAD TRANSACTIONS ──
    const loadTransactions = async () => {
        try {
            const response = await api.get("/admin/transactions");
            allPayments = response.payments;
            const totalRevenue = response.totalRevenue;

            // Stats
            const successful = allPayments.filter(p => p.status === "success");
            const failed = allPayments.filter(p => p.status === "failed");

            document.getElementById("statRevenue").textContent = formatAmount(totalRevenue);
            document.getElementById("statTotal").textContent = allPayments.length;
            document.getElementById("statSuccessful").textContent = successful.length;
            document.getElementById("statFailed").textContent = failed.length;

            renderTransactions(allPayments);

        } catch (error) {
            transactionsTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">Failed to load transactions</td>
                </tr>`;
        }
    };

    // ── RENDER TRANSACTIONS ──
    const renderTransactions = (payments) => {
        transactionsCount.textContent = `(${payments.length})`;

        if (payments.length === 0) {
            transactionsTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">No transactions found</td>
                </tr>`;
            return;
        }

        transactionsTable.innerHTML = payments.map((payment, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <p style="font-weight: var(--font-semibold);">
                        ${payment.user
    ? `${payment.user.firstName || ""} ${payment.user.otherName || ""} ${payment.user.surname || ""}`.trim()
    : "—"}
                    </p>
                    <p style="font-size: var(--text-xs); color: var(--color-text-muted);">
                        ${payment.user?.email || ""}
                    </p>
                </td>
                <td>${payment.course?.title || "—"}</td>
                <td>
                    <span style="font-size: var(--text-xs); font-family: monospace;
                        color: var(--color-text-muted);">
                        ${payment.reference}
                    </span>
                </td>
                <td>
                    <strong>${formatAmount(payment.amount)}</strong>
                </td>
                <td>
                    ${payment.channel
                        ? `<span class="badge badge-info">${payment.channel}</span>`
                        : "—"}
                </td>
                <td>
                    <span class="badge ${
                        payment.status === "success" ? "badge-success" :
                        payment.status === "pending" ? "badge-warning" :
                        "badge-error"
                    }">
                        ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                </td>
                <td>${Utils.formatDate(payment.createdAt)}</td>
            </tr>
        `).join("");
    };

    // ── FILTER ──
    const filterTransactions = () => {
        const search = searchInput.value.toLowerCase().trim();
        const status = statusFilter.value;

        const filtered = allPayments.filter(payment => {
            const matchesSearch = !search ||
                payment.user?.fullName?.toLowerCase().includes(search) ||
                payment.user?.email?.toLowerCase().includes(search) ||
                payment.course?.title?.toLowerCase().includes(search) ||
                payment.reference.toLowerCase().includes(search);

            const matchesStatus = !status || payment.status === status;

            return matchesSearch && matchesStatus;
        });

        renderTransactions(filtered);
    };

    searchInput.addEventListener("input", filterTransactions);
    statusFilter.addEventListener("change", filterTransactions);

    await loadTransactions();

};

init();