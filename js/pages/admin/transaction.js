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
    const typeFilter = document.getElementById("typeFilter");
    const downloadBtn = document.getElementById("downloadBtn");
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    const selectedCount = document.getElementById("selectedCount");
    const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
    const deleteModal = document.getElementById("deleteModal");
    const bulkDeleteModal = document.getElementById("bulkDeleteModal");

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

    // ── MODAL HELPERS ──
    const openModal = (modal) => modal.classList.remove("hidden");
    const closeModal = (modal) => modal.classList.add("hidden");

    // ── STATE ──
    let allPayments = [];
    let currentlyDisplayed = [];

    // ── FORMAT AMOUNT ──
    const formatAmount = (kobo) => {
        const naira = kobo / 100;
        return `₦${naira.toLocaleString("en-NG")}`;
    };

    // ── TYPE LABEL ──
    const typeLabel = (type) => {
        if (type === "registration") return "Registration";
        if (type === "certificate") return "Exam Payment";
        return type || "—";
    };

    // ── LOAD TRANSACTIONS ──
    const loadTransactions = async () => {
        try {
            const response = await api.get("/admin/transactions");
            allPayments = response.payments;
            const totalRevenue = response.totalRevenue;

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
                    <td colspan="11" class="text-center text-muted">Failed to load transactions</td>
                </tr>`;
        }
    };

    // ── RENDER TRANSACTIONS ──
    const renderTransactions = (payments) => {
        currentlyDisplayed = payments;
        transactionsCount.textContent = `(${payments.length})`;

        if (payments.length === 0) {
            transactionsTable.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center text-muted">No transactions found</td>
                </tr>`;
            updateSelectedCount();
            return;
        }

        transactionsTable.innerHTML = payments.map((payment, index) => `
            <tr>
                <td>
                    <input
                        type="checkbox"
                        class="q-checkbox transaction-row-checkbox"
                        data-id="${payment._id}"
                        onchange="updateSelectedCount()"
                    >
                </td>
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
                <td>
                    <span class="badge ${payment.type === "registration" ? "badge-warning" : "badge-info"}">
                        ${typeLabel(payment.type)}
                    </span>
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
                <td>
                    <div class="table-actions">
                        <button
                            class="btn-icon btn-icon-delete"
                            onclick="confirmDeleteOne('${payment._id}')"
                            title="Delete"
                        >🗑️</button>
                    </div>
                </td>
            </tr>
        `).join("");

        updateSelectedCount();
    };

    // ── FILTER ──
    const filterTransactions = () => {
        const search = searchInput.value.toLowerCase().trim();
        const status = statusFilter.value;
        const type = typeFilter.value;

        const filtered = allPayments.filter(payment => {
            const fullName = payment.user
                ? `${payment.user.firstName || ""} ${payment.user.otherName || ""} ${payment.user.surname || ""}`.trim().toLowerCase()
                : "";

            const matchesSearch = !search ||
                fullName.includes(search) ||
                payment.user?.email?.toLowerCase().includes(search) ||
                payment.course?.title?.toLowerCase().includes(search) ||
                payment.reference.toLowerCase().includes(search);

            const matchesStatus = !status || payment.status === status;
            const matchesType = !type || payment.type === type;

            return matchesSearch && matchesStatus && matchesType;
        });

        renderTransactions(filtered);
    };

    searchInput.addEventListener("input", filterTransactions);
    statusFilter.addEventListener("change", filterTransactions);
    typeFilter.addEventListener("change", filterTransactions);

    // ── SELECTION HANDLING ──
    window.updateSelectedCount = () => {
        const checkboxes = document.querySelectorAll(".transaction-row-checkbox");
        const checked = Array.from(checkboxes).filter(cb => cb.checked);

        selectedCount.textContent = `${checked.length} selected`;
        deleteSelectedBtn.disabled = checked.length === 0;

        selectAllCheckbox.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
        selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
    };

    selectAllCheckbox.addEventListener("change", () => {
        document.querySelectorAll(".transaction-row-checkbox").forEach(cb => {
            cb.checked = selectAllCheckbox.checked;
        });
        updateSelectedCount();
    });

    // ── DELETE SINGLE ──
    window.confirmDeleteOne = (id) => {
        document.getElementById("deleteTransactionId").value = id;
        openModal(deleteModal);
    };

    document.getElementById("closeDeleteModal").addEventListener("click", () => closeModal(deleteModal));
    document.getElementById("cancelDeleteBtn").addEventListener("click", () => closeModal(deleteModal));

    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
        const id = document.getElementById("deleteTransactionId").value;
        const confirmBtn = document.getElementById("confirmDeleteBtn");

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Deleting...";

        try {
            await api.delete(`/admin/transactions/${id}`);
            Utils.toast("Transaction deleted successfully", "success");
            closeModal(deleteModal);
            await loadTransactions();
            filterTransactions();

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
        }
    });

    // ── DELETE SELECTED (BULK) ──
    deleteSelectedBtn.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll(".transaction-row-checkbox:checked");
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (ids.length === 0) return;

        document.getElementById("bulkDeleteTitle").textContent =
            `Delete ${ids.length} Transaction${ids.length > 1 ? "s" : ""}`;
        document.getElementById("bulkDeleteText").innerHTML =
            `Are you sure you want to delete
            <strong>${ids.length} selected transaction${ids.length > 1 ? "s" : ""}</strong>?
            This cannot be undone.`;

        window._bulkDeleteTransactionIds = ids;

        openModal(bulkDeleteModal);
    });

    document.getElementById("closeBulkDeleteModal").addEventListener("click", () => closeModal(bulkDeleteModal));
    document.getElementById("cancelBulkDeleteBtn").addEventListener("click", () => closeModal(bulkDeleteModal));

    document.getElementById("confirmBulkDeleteBtn").addEventListener("click", async () => {
        const confirmBtn = document.getElementById("confirmBulkDeleteBtn");
        const ids = window._bulkDeleteTransactionIds || [];

        if (ids.length === 0) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Deleting...";

        try {
            const response = await api.request("/admin/transactions/bulk-delete", {
                method: "DELETE",
                body: JSON.stringify({ transactionIds: ids }),
                headers: { "Content-Type": "application/json" }
            });

            Utils.toast(response.message, "success");
            closeModal(bulkDeleteModal);
            window._bulkDeleteTransactionIds = null;
            await loadTransactions();
            filterTransactions();

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
        }
    });

    // ── DOWNLOAD (CURRENTLY FILTERED VIEW) ──
    downloadBtn.addEventListener("click", () => {
        if (!currentlyDisplayed || currentlyDisplayed.length === 0) {
            Utils.toast("No transactions to download", "info");
            return;
        }

        const rows = currentlyDisplayed.map(payment => ({
            user_name: payment.user
                ? `${payment.user.firstName || ""} ${payment.user.otherName || ""} ${payment.user.surname || ""}`.trim()
                : "",
            user_email: payment.user?.email || "",
            type: typeLabel(payment.type),
            course: payment.course?.title || "",
            reference: payment.reference,
            amount_ngn: payment.amount / 100,
            channel: payment.channel || "",
            status: payment.status,
            date: new Date(payment.createdAt).toISOString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows, {
            header: [
                "user_name", "user_email", "type", "course", "reference",
                "amount_ngn", "channel", "status", "date"
            ]
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

        const dateStamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `asodem_transactions_${dateStamp}.xlsx`);
    });

    await loadTransactions();

};

init();
