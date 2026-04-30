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
    const profilePhoto = document.getElementById("profilePhoto");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileRole = document.getElementById("profileRole");
    const photoInput = document.getElementById("photoInput");
    const editProfileForm = document.getElementById("editProfileForm");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const changePasswordForm = document.getElementById("changePasswordForm");
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const logoutBtn = document.getElementById("logoutBtn");

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

    // ── PASSWORD TOGGLES ──
    const setupToggle = (btnId, inputId) => {
        document.getElementById(btnId).addEventListener("click", () => {
            const input = document.getElementById(inputId);
            const type = input.type === "password" ? "text" : "password";
            input.type = type;
            document.getElementById(btnId).textContent = type === "password" ? "👁" : "🙈";
        });
    };

    setupToggle("toggleCurrent", "currentPassword");
    setupToggle("toggleNew", "newPassword");
    setupToggle("toggleConfirmNew", "confirmNewPassword");

    // ── DEFAULT AVATAR SVG ──
    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

    // ── POPULATE USER DATA ──
    const populateUser = (user) => {
        sidebarName.textContent = user.fullName;

        if (user.profilePhoto) {
            const imgHTML = `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
            sidebarAvatar.innerHTML = imgHTML;
            topbarAvatar.innerHTML = imgHTML;
            profilePhoto.innerHTML = imgHTML;
        } else {
            sidebarAvatar.innerHTML = defaultAvatar;
            topbarAvatar.innerHTML = defaultAvatar;
            profilePhoto.innerHTML = defaultAvatar;
        }

        profileName.textContent = user.fullName;
        profileEmail.textContent = user.email;
        profileRole.textContent = user.role === "admin" ? "Admin" : "Student";

        document.getElementById("infoFirstName").textContent = user.firstName || "—";
        document.getElementById("infoSurname").textContent = user.surname || "—";
        document.getElementById("infoOtherName").textContent = user.otherName || "—";
        document.getElementById("infoEmail").textContent = user.email || "—";

        document.getElementById("phone").value = user.phone || "";
        document.getElementById("bio").value = user.bio || "";
    };

    // ── LOAD PROFILE ──
    try {
        const response = await api.get("/user/profile");
        populateUser(response.user);
    } catch (error) {
        if (error.message.includes("authorized") || error.message.includes("token")) {
            Auth.logout();
            return;
        }
        Utils.toast("Failed to load profile", "error");
    }

    // ── PHOTO UPLOAD ──
    photoInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("profilePhoto", file);

        Utils.showLoader();

        try {
            const token = Auth.getToken();
            const response = await fetch(`${CONFIG.API_BASE_URL}/user/profile`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            Utils.toast("Profile photo updated", "success");

            const imgHTML = `<img src="${data.user.profilePhoto}" alt="${data.user.fullName}">`;
            profilePhoto.innerHTML = imgHTML;
            sidebarAvatar.innerHTML = imgHTML;
            topbarAvatar.innerHTML = imgHTML;

            Auth.setSession(Auth.getToken(), {
                ...Auth.getUser(),
                profilePhoto: data.user.profilePhoto
            });

        } catch (error) {
            Utils.toast(error.message || "Failed to upload photo", "error");
        } finally {
            Utils.hideLoader();
        }
    });

    // ── EDIT PROFILE FORM ──
    editProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving...";

        try {
            const response = await api.put("/user/profile", {
                phone: document.getElementById("phone").value.trim(),
                bio: document.getElementById("bio").value.trim()
            });

            Utils.toast(response.message, "success");

            Auth.setSession(Auth.getToken(), {
                ...Auth.getUser(),
                ...response.user
            });

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Save Changes";
        }
    });

    // ── CHANGE PASSWORD FORM ──
    changePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById("newPassword").value;
        const confirmNewPassword = document.getElementById("confirmNewPassword").value;

        if (newPassword !== confirmNewPassword) {
            Utils.toast("New passwords do not match", "error");
            return;
        }

        if (newPassword.length < 6) {
            Utils.toast("Password must be at least 6 characters", "error");
            return;
        }

        changePasswordBtn.disabled = true;
        changePasswordBtn.textContent = "Changing...";

        try {
            const response = await api.put("/user/change-password", {
                currentPassword: document.getElementById("currentPassword").value,
                newPassword,
                confirmNewPassword
            });

            Utils.toast(response.message, "success");
            changePasswordForm.reset();

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            changePasswordBtn.disabled = false;
            changePasswordBtn.textContent = "Change Password";
        }
    });

    // ── LOGOUT ──
    logoutBtn.addEventListener("click", () => {
        Auth.logout();
    });

};

init();