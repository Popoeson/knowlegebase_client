Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
        window.location.href = "../../pages/login.html";
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
    const courseForm = document.getElementById("courseForm");
    const submitBtn = document.getElementById("submitBtn");
    const pageTitle = document.getElementById("pageTitle");
    const topicInput = document.getElementById("topicInput");
    const topicsTags = document.getElementById("topicsTags");
    const thumbnailInput = document.getElementById("thumbnail");
    const thumbnailPreview = document.getElementById("thumbnailPreview");

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

    // ── CHECK IF EDIT MODE ──
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");
    const isEditMode = !!courseId;

    if (isEditMode) {
        pageTitle.textContent = "Edit Course";
        submitBtn.textContent = "Update Course";
    }

    // ── TOPICS STATE ──
    let topics = [];

    const renderTopics = () => {
        topicsTags.innerHTML = topics.map((topic, index) => `
            <span class="topic-tag">
                ${topic}
                <button type="button" class="topic-tag-remove" onclick="removeTopic(${index})">✕</button>
            </span>
        `).join("");
    };

    const addTopic = () => {
        const value = topicInput.value.trim();
        if (!value) return;
        if (topics.includes(value)) {
            Utils.toast("Topic already added", "warning");
            return;
        }
        topics.push(value);
        topicInput.value = "";
        renderTopics();
    };

    window.removeTopic = (index) => {
        topics.splice(index, 1);
        renderTopics();
    };

    document.getElementById("addTopicBtn").addEventListener("click", addTopic);

    topicInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTopic();
        }
    });

    // ── THUMBNAIL PREVIEW ──
    thumbnailInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        thumbnailPreview.innerHTML = `
            <img src="${url}" alt="Preview"
                style="width: 200px; height: 120px; object-fit: cover;
                border-radius: var(--radius-md); border: 1px solid var(--color-border);">`;
    });

    // ── LOAD CATEGORIES ──
    const loadCategories = async () => {
        try {
            const response = await api.get("/admin/categories");
            const categories = response.categories;
            const select = document.getElementById("category");

            categories.forEach(cat => {
                const option = document.createElement("option");
                option.value = cat._id;
                option.textContent = cat.name;
                select.appendChild(option);
            });
        } catch (error) {
            Utils.toast("Failed to load categories", "error");
        }
    };

    // ── LOAD COURSE FOR EDIT ──
    const loadCourse = async () => {
        try {
            const response = await api.get(`/courses/${courseId}`);
            const { course } = response;

            document.getElementById("title").value = course.title;
            document.getElementById("category").value = course.category?._id || "";
            document.getElementById("description").value = course.description;
            document.getElementById("difficulty").value = course.difficulty;
            document.getElementById("duration").value = course.duration;
            document.getElementById("certificationQuestions").value = course.certificationQuestions;
            document.getElementById("practiceQuestions").value = course.practiceQuestions;
            document.getElementById("timeLimit").value = course.timeLimit;
            document.getElementById("passMark").value = course.passMark;
            document.getElementById("price").value = course.price;

            topics = course.topics || [];
            renderTopics();

            if (course.thumbnail) {
                thumbnailPreview.innerHTML = `
                    <img src="${course.thumbnail}" alt="Current thumbnail"
                        style="width: 200px; height: 120px; object-fit: cover;
                        border-radius: var(--radius-md); border: 1px solid var(--color-border);">
                    <p style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-1);">
                        Current thumbnail. Upload a new one to replace it.
                    </p>`;
            }

        } catch (error) {
            Utils.toast("Failed to load course data", "error");
        }
    };

    // ── VALIDATION ──
    const showError = (id, message) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = message;
            el.classList.remove("hidden");
        }
    };

    const clearErrors = () => {
        ["titleError", "categoryError", "descriptionError", "durationError",
         "certQError", "practiceQError", "timeLimitError", "passMarkError", "priceError"]
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = "";
                    el.classList.add("hidden");
                }
            });
    };

    const validateForm = () => {
        let valid = true;
        clearErrors();

        if (!document.getElementById("title").value.trim()) {
            showError("titleError", "Course title is required");
            valid = false;
        }
        if (!document.getElementById("category").value) {
            showError("categoryError", "Please select a category");
            valid = false;
        }
        if (!document.getElementById("description").value.trim()) {
            showError("descriptionError", "Description is required");
            valid = false;
        }
        if (!document.getElementById("duration").value) {
            showError("durationError", "Duration is required");
            valid = false;
        }
        if (!document.getElementById("certificationQuestions").value) {
            showError("certQError", "Number of certification questions is required");
            valid = false;
        }
        if (!document.getElementById("practiceQuestions").value) {
            showError("practiceQError", "Number of practice questions is required");
            valid = false;
        }
        if (!document.getElementById("timeLimit").value) {
            showError("timeLimitError", "Time limit is required");
            valid = false;
        }
        if (!document.getElementById("passMark").value) {
            showError("passMarkError", "Pass mark is required");
            valid = false;
        }
        if (!document.getElementById("price").value) {
            showError("priceError", "Price is required");
            valid = false;
        }

        return valid;
    };

    // ── FORM SUBMIT ──
    courseForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        submitBtn.disabled = true;
        submitBtn.textContent = isEditMode ? "Updating..." : "Saving...";

        try {
            const formData = new FormData();
            formData.append("title", document.getElementById("title").value.trim());
            formData.append("category", document.getElementById("category").value);
            formData.append("description", document.getElementById("description").value.trim());
            formData.append("difficulty", document.getElementById("difficulty").value);
            formData.append("duration", document.getElementById("duration").value);
            formData.append("certificationQuestions", document.getElementById("certificationQuestions").value);
            formData.append("practiceQuestions", document.getElementById("practiceQuestions").value);
            formData.append("timeLimit", document.getElementById("timeLimit").value);
            formData.append("passMark", document.getElementById("passMark").value);
            formData.append("price", document.getElementById("price").value);
            formData.append("topics", JSON.stringify(topics));

            const file = thumbnailInput.files[0];
            if (file) formData.append("thumbnail", file);

            const token = Auth.getToken();
            const url = isEditMode
                ? `${CONFIG.API_BASE_URL}/admin/courses/${courseId}`
                : `${CONFIG.API_BASE_URL}/admin/courses`;
            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            Utils.toast(data.message, "success");

            setTimeout(() => {
                window.location.href = "./courses.html";
            }, 1500);

        } catch (error) {
            Utils.toast(error.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? "Update Course" : "Save Course";
        }
    });

    // ── INIT ──
    await loadCategories();
    if (isEditMode) await loadCourse();

};

init();