Utils.initTheme();

const init = async () => {

    await Auth.restoreSession();

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

    const loadingState = document.getElementById("loadingState");
    const signupState = document.getElementById("signupState");
    const partnerState = document.getElementById("partnerState");
    const signupBtn = document.getElementById("signupBtn");

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

    // ── SIGN UP FOR AFFILIATION ──
    signupBtn.addEventListener("click", async () => {
        signupBtn.disabled = true;
        signupBtn.textContent = "Signing up...";
        try {
            const response = await api.post("/referral/signup", {});
            Utils.toast(response.message, "success");
            await loadPartnerInfo();
        } catch (error) {
            Utils.toast(error.message, "error");
            signupBtn.disabled = false;
            signupBtn.textContent = "Sign Up for Referral Program";
        }
    });

    // ── COPY CODE / LINK ──
    const setupCopyButtons = (partner) => {
        const copyCodeBtn = document.getElementById("copyCodeBtn");
        const copyLinkBtn = document.getElementById("copyLinkBtn");
        const referralLink = `${window.location.origin}/pages/register.html?ref=${partner.referralCode}`;

        copyCodeBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(partner.referralCode);
            Utils.toast("Referral code copied", "success");
        });

        copyLinkBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(referralLink);
            Utils.toast("Referral link copied", "success");
        });
    };

    // ── LOAD BANK LIST + PAYOUT SETUP ──
    const setupPayoutForm = async () => {
        const bankSelect = document.getElementById("bankSelect");
        const accountNumberInput = document.getElementById("accountNumberInput");
        const setupPayoutBtn = document.getElementById("setupPayoutBtn");

        try {
            const response = await api.get("/referral/banks");
            bankSelect.innerHTML = `<option value="">Select your bank...</option>` +
                response.banks.map(b => `<option value="${b.code}">${Utils.escapeHTML(b.name)}</option>`).join("");
        } catch (error) {
            Utils.toast("Failed to load bank list", "error");
        }

        setupPayoutBtn.addEventListener("click", async () => {
            const bankCode = bankSelect.value;
            const accountNumber = accountNumberInput.value.trim();

            if (!bankCode || !accountNumber) {
                Utils.toast("Please select a bank and enter your account number", "error");
                return;
            }

            setupPayoutBtn.disabled = true;
            setupPayoutBtn.textContent = "Verifying...";

            try {
                const response = await api.put("/referral/payout-account", { bankCode, accountNumber });
                Utils.toast(response.message, "success");
                document.getElementById("payoutSetupCard").classList.add("hidden");
                document.getElementById("payoutAccountConfirmed").classList.remove("hidden");
                document.getElementById("confirmedAccountName").textContent = response.accountName;
            } catch (error) {
                Utils.toast(error.message, "error");
            } finally {
                setupPayoutBtn.disabled = false;
                setupPayoutBtn.textContent = "Save Payout Account";
            }
        });
    };

    // ── RENDER REFERRED STUDENTS ──
    const renderReferredStudents = (students) => {
        const table = document.getElementById("referredStudentsTable");

        if (!students || students.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">No referred students yet</td>
                </tr>`;
            return;
        }

        table.innerHTML = students.map((s, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${Utils.escapeHTML(s.fullName)}</td>
                <td>${Utils.escapeHTML(s.email)}</td>
                <td>${Utils.formatDate(s.joinedAt)}</td>
                <td>${Utils.formatCurrency(s.totalGenerated / 100)}</td>
            </tr>
        `).join("");
    };

    // ── LOAD PARTNER INFO ──
    const loadPartnerInfo = async () => {
        try {
            const response = await api.get("/referral/me");
            const { partner, payoutBreakdown, referredStudentCount, referredStudents } = response;

            loadingState.classList.add("hidden");
            signupState.classList.add("hidden");
            partnerState.classList.remove("hidden");

            document.getElementById("partnerWelcome").textContent = `Hi ${user.firstName}, here's your referral overview`;
            document.getElementById("partnerTierLabel").textContent =
                partner.tier === "lifetime"
                    ? "You're a lifetime partner — you earn on every registration and exam payment from your referrals."
                    : "You're a one-time affiliate — you earn once, when a referred student pays their registration fee.";
            document.getElementById("referralCodeDisplay").textContent = partner.referralCode;
            document.getElementById("statReferred").textContent = referredStudentCount;

            const paidOut = payoutBreakdown.find(p => p._id === "paid_to_partner");
            const pending = payoutBreakdown
                .filter(p => p._id === "pending_subaccount" || p._id === "transfer_failed")
                .reduce((sum, p) => sum + p.total, 0);

            document.getElementById("statPaidOut").textContent = Utils.formatCurrency((paidOut?.total || 0) / 100);
            document.getElementById("statPending").textContent = Utils.formatCurrency(pending / 100);

            setupCopyButtons(partner);
            renderReferredStudents(referredStudents);

            if (!partner.hasSubaccount) {
                document.getElementById("payoutSetupCard").classList.remove("hidden");
                await setupPayoutForm();
            } else {
                document.getElementById("payoutAccountConfirmed").classList.remove("hidden");
            }

        } catch (error) {
            if (error.status === 404) {
                // Not a partner yet — show signup CTA
                loadingState.classList.add("hidden");
                signupState.classList.remove("hidden");
                return;
            }
            loadingState.classList.add("hidden");
            Utils.toast("Failed to load referral info", "error");
        }
    };

    await loadPartnerInfo();

};

init();