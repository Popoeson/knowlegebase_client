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
    const courseForm = document.getElementById("courseForm");
    const submitBtn = document.getElementById("submitBtn");
    const pageTitle = document.getElementById("pageTitle");
    const topicInput = document.getElementById("topicInput");
    const topicsTags = document.getElementById("topicsTags");
    const thumbnailInput = document.getElementById("thumbnail");
    const thumbnailPreview = document.getElementById("thumbnailPreview");

    // AI panel elements
    const aiPanel = document.getElementById("aiPanel");
    const skipAiRow = document.getElementById("skipAiRow");
    const generateBtn = document.getElementById("generateBtn");
    const approveBtn = document.getElementById("approveBtn");
    const rejectBtn = document.getElementById("rejectBtn");
    const reviewPanel = document.getElementById("reviewPanel");
    const questionsList = document.getElementById("questionsList");
    const reviewStatus = document.getElementById("reviewStatus");
    const duplicateNotice = document.getElementById("duplicateNotice");
    const duplicateNoticeText = document.getElementById("duplicateNoticeText");
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");

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
    const urlCourseId = params.get("id");
    const isEditMode = !!urlCourseId;

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
            const response = await api.get(`/courses/${urlCourseId}`);
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
    // savedCourseId is set after a successful save and used by the AI panel
    let savedCourseId = urlCourseId || null;

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
                ? `${CONFIG.API_BASE_URL}/admin/courses/${urlCourseId}`
                : `${CONFIG.API_BASE_URL}/admin/courses`;
            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Store the course ID for the AI panel
            savedCourseId = data.course._id;

            Utils.toast(data.message, "success");

            // Reveal AI panel instead of redirecting immediately
            submitBtn.textContent = isEditMode ? "Update Course" : "Save Course";
            submitBtn.disabled = false;
            courseForm.style.opacity = "0.5";
            courseForm.style.pointerEvents = "none";
            aiPanel.style.display = "block";
            skipAiRow.style.display = "block";
            aiPanel.scrollIntoView({ behavior: "smooth", block: "start" });

        } catch (error) {
            Utils.toast(error.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? "Update Course" : "Save Course";
        }
    });


    // ════════════════════════════════════════
    // ── AI QUESTION GENERATION ──
    // ════════════════════════════════════════

    // Holds the questions returned by Gemini before admin approves
    let pendingQuestions = [];

    // ── RENDER QUESTION CARDS ──
    const renderQuestionCards = (questions) => {
        questionsList.innerHTML = questions.map((q, index) => `
            <div class="card mb-4" id="qCard-${index}" style="border: 1px solid var(--color-border);">

                <div style="display: flex; align-items: flex-start; gap: var(--space-3);">
                    <input
                        type="checkbox"
                        class="question-checkbox"
                        data-index="${index}"
                        checked
                        style="margin-top: 3px; flex-shrink: 0; width: 16px; height: 16px; cursor: pointer;"
                    >
                    <div style="flex: 1;">

                        <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3);">
                            <span style="
                                font-size: var(--text-xs);
                                font-weight: 600;
                                padding: 2px 8px;
                                border-radius: var(--radius-full);
                                background: var(--color-primary-soft, #ede9fe);
                                color: var(--color-primary);
                            ">Q${index + 1}</span>
                        </div>

                        <p style="font-weight: 500; margin-bottom: var(--space-3); font-size: var(--text-sm);">
                            ${q.question}
                        </p>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-bottom: var(--space-3);">
                            ${["A", "B", "C", "D"].map(letter => `
                                <div style="
                                    padding: var(--space-2) var(--space-3);
                                    border-radius: var(--radius-md);
                                    font-size: var(--text-sm);
                                    border: 1px solid ${q.correctAnswer === letter
                                        ? "var(--color-success, #22c55e)"
                                        : "var(--color-border)"};
                                    background: ${q.correctAnswer === letter
                                        ? "var(--color-success-soft, #f0fdf4)"
                                        : "transparent"};
                                    color: ${q.correctAnswer === letter
                                        ? "var(--color-success-dark, #15803d)"
                                        : "var(--color-text)"};
                                    font-weight: ${q.correctAnswer === letter ? "600" : "400"};
                                ">
                                    <strong>${letter}.</strong> ${q["option" + letter]}
                                </div>
                            `).join("")}
                        </div>

                        ${q.explanation ? `
                            <div style="
                                padding: var(--space-2) var(--space-3);
                                background: var(--color-bg-muted, #f8fafc);
                                border-radius: var(--radius-md);
                                font-size: var(--text-xs);
                                color: var(--color-text-muted);
                                border-left: 3px solid var(--color-primary);
                            ">
                                💡 ${q.explanation}
                            </div>
                        ` : ""}

                    </div>
                </div>
            </div>
        `).join("");

        // Update select-all state when individual checkboxes change
        questionsList.querySelectorAll(".question-checkbox").forEach(cb => {
            cb.addEventListener("change", syncSelectAll);
        });
    };

    // ── SELECT ALL TOGGLE ──
    const syncSelectAll = () => {
        const all = questionsList.querySelectorAll(".question-checkbox");
        const checked = questionsList.querySelectorAll(".question-checkbox:checked");
        selectAllCheckbox.checked = all.length === checked.length;
        selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < all.length;
    };

    selectAllCheckbox.addEventListener("change", () => {
        questionsList.querySelectorAll(".question-checkbox").forEach(cb => {
            cb.checked = selectAllCheckbox.checked;
        });
    });

    // ── GENERATE QUESTIONS ──
    generateBtn.addEventListener("click", async () => {
        const topicName = document.getElementById("aiTopic").value.trim();
        const difficulty = document.getElementById("aiDifficulty").value;
        const type = document.getElementById("aiType").value;
        const count = document.getElementById("aiCount").value;

        // Validate AI form
        const aiTopicError = document.getElementById("aiTopicError");
        const aiCountError = document.getElementById("aiCountError");
        aiTopicError.classList.add("hidden");
        aiCountError.classList.add("hidden");

        let aiValid = true;
        if (!topicName) {
            aiTopicError.textContent = "Topic name is required";
            aiTopicError.classList.remove("hidden");
            aiValid = false;
        }
        if (!count || Number(count) < 1 || Number(count) > 50) {
            aiCountError.textContent = "Enter a number between 1 and 50";
            aiCountError.classList.remove("hidden");
            aiValid = false;
        }
        if (!aiValid) return;

        // Reset review panel
        reviewPanel.classList.add("hidden");
        duplicateNotice.classList.add("hidden");
        reviewStatus.textContent = "";
        pendingQuestions = [];

        generateBtn.disabled = true;
        generateBtn.textContent = "✨ Generating...";

        try {
            const data = await api.post("/admin/questions/ai-generate", {
                courseId: savedCourseId,
                topicName,
                difficulty,
                count: Number(count),
                type
            });

            pendingQuestions = data.questions;

                   // Show duplicate notice if any were removed
            if (data.duplicatesRemoved > 0) {
                duplicateNoticeText.textContent =
                    `${data.duplicatesRemoved} question${data.duplicatesRemoved > 1 ? "s were" : " was"} identical to existing questions and removed automatically.`;
                duplicateNotice.classList.remove("hidden");
            }

            renderQuestionCards(pendingQuestions);
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
            reviewPanel.classList.remove("hidden");
            reviewStatus.textContent = `${pendingQuestions.length} question${pendingQuestions.length !== 1 ? "s" : ""} generated. Review and select which to save.`;
            reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });

        } catch (error) {
            Utils.toast(error.message || "Generation failed. Please try again.", "error");
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "✨ Generate Questions";
        }
    });


    // ── APPROVE — SAVE SELECTED QUESTIONS ──
    approveBtn.addEventListener("click", async () => {
        const checked = questionsList.querySelectorAll(".question-checkbox:checked");

        if (checked.length === 0) {
            Utils.toast("Select at least one question to save.", "warning");
            return;
        }

        // Collect only selected questions by their index
        const selected = Array.from(checked).map(cb => {
            return pendingQuestions[Number(cb.dataset.index)];
        });

        approveBtn.disabled = true;
        approveBtn.textContent = "Saving...";

        try {
            const difficulty = document.getElementById("aiDifficulty").value;
            const type = document.getElementById("aiType").value;

            const data = await api.post("/admin/questions/ai-save", {
                courseId: savedCourseId,
                questions: selected,
                difficulty,
                type
            });

            Utils.toast(data.message, "success");

            // Clear the review panel and reset for next generation
            reviewPanel.classList.add("hidden");
            duplicateNotice.classList.add("hidden");
            questionsList.innerHTML = "";
            pendingQuestions = [];
            reviewStatus.textContent = "";
            document.getElementById("aiTopic").value = "";
            document.getElementById("aiCount").value = "10";
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;

        } catch (error) {
            Utils.toast(error.message || "Failed to save questions.", "error");
        } finally {
            approveBtn.disabled = false;
            approveBtn.textContent = "✅ Save Selected Questions";
        }
    });


    // ── REJECT — DISCARD ALL ──
    rejectBtn.addEventListener("click", async () => {
        try {
            await api.post("/admin/questions/ai-reject", {});
        } catch (_) {
            // Rejection is best-effort — no user-facing error needed
        }

        reviewPanel.classList.add("hidden");
        duplicateNotice.classList.add("hidden");
        questionsList.innerHTML = "";
        pendingQuestions = [];
        reviewStatus.textContent = "";
        document.getElementById("aiTopic").value = "";
        document.getElementById("aiCount").value = "10";
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;

        Utils.toast("Questions discarded.", "info");
    });


    // ── INIT ──
    await loadCategories();
    if (isEditMode) {
        await loadCourse();
        // In edit mode, AI panel is available immediately since the course exists
        aiPanel.style.display = "block";
        skipAiRow.style.display = "block";
    }

};

init();