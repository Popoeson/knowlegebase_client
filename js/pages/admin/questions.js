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
    const questionsTable = document.getElementById("questionsTable");
    const questionsCount = document.getElementById("questionsCount");
    const courseFilter = document.getElementById("courseFilter");
    const typeFilter = document.getElementById("typeFilter");
    const questionModal = document.getElementById("questionModal");
    const deleteModal = document.getElementById("deleteModal");
    const uploadZone = document.getElementById("uploadZone");
    const bulkFile = document.getElementById("bulkFile");
    const uploadResult = document.getElementById("uploadResult");

    // AI element references
    const generateBtn = document.getElementById("generateBtn");
    const approveBtn = document.getElementById("approveBtn");
    const rejectBtn = document.getElementById("rejectBtn");
    const reviewPanel = document.getElementById("reviewPanel");
    const aiQuestionsList = document.getElementById("aiQuestionsList");
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

    // ── MODAL HELPERS ──
    const openModal = (modal) => modal.classList.remove("hidden");
    const closeModal = (modal) => modal.classList.add("hidden");

    // ── LOAD COURSES INTO ALL SELECTS ──
    const loadCourses = async () => {
        try {
            const response = await api.get("/admin/courses");
            const courses = response.courses;

            // Populate all course selects including the new AI one
            const selects = ["courseFilter", "bulkCourse", "qCourse", "aiCourse"];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                const firstOption = select.options[0];
                select.innerHTML = "";
                select.appendChild(firstOption);

                courses.forEach(course => {
                    const option = document.createElement("option");
                    option.value = course._id;
                    option.textContent = course.title;
                    select.appendChild(option);
                });
            });

        } catch (error) {
            Utils.toast("Failed to load courses", "error");
        }
    };

    // ── LOAD QUESTIONS ──
    const loadQuestions = async () => {
        try {
            const courseId = courseFilter.value;
            const type = typeFilter.value;

            let endpoint = "/admin/questions";
            const queryParams = [];
            if (courseId) queryParams.push(`courseId=${courseId}`);
            if (type) queryParams.push(`type=${type}`);
            if (queryParams.length > 0) endpoint += `?${queryParams.join("&")}`;

            const response = await api.get(endpoint);
            const questions = response.questions;

            questionsCount.textContent = `(${questions.length})`;

            if (questions.length === 0) {
                questionsTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">No questions found</td>
                    </tr>`;
                return;
            }

            questionsTable.innerHTML = questions.map((q, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td style="max-width: 300px;">
                        <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${q.question}
                        </p>
                    </td>
                    <td>${q.course?.title || "—"}</td>
                    <td>
                        <span class="badge ${q.type === "certification" ? "badge-info" : "badge-success"}">
                            ${q.type}
                        </span>
                    </td>
                    <td><strong>${q.correctAnswer}</strong></td>
                    <td>
                        <div class="table-actions">
                            <button
                                class="btn-icon btn-icon-edit"
                                onclick="editQuestion('${q._id}')"
                                title="Edit"
                            >✏️</button>
                            <button
                                class="btn-icon btn-icon-delete"
                                onclick="confirmDelete('${q._id}')"
                                title="Delete"
                            >🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join("");

        } catch (error) {
            questionsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">Failed to load questions</td>
                </tr>`;
        }
    };

    // ── FILTER EVENTS ──
    courseFilter.addEventListener("change", loadQuestions);
    typeFilter.addEventListener("change", loadQuestions);

    // ── ADD QUESTION MODAL ──
    document.getElementById("addQuestionBtn").addEventListener("click", () => {
        document.getElementById("questionModalTitle").textContent = "Add Question";
        document.getElementById("questionId").value = "";
        document.getElementById("qCourse").value = "";
        document.getElementById("qType").value = "";
        document.getElementById("qQuestion").value = "";
        document.getElementById("qOptionA").value = "";
        document.getElementById("qOptionB").value = "";
        document.getElementById("qOptionC").value = "";
        document.getElementById("qOptionD").value = "";
        document.getElementById("qCorrectAnswer").value = "";
        document.getElementById("qExplanation").value = "";
        openModal(questionModal);
    });

    document.getElementById("closeQuestionModal").addEventListener("click", () => closeModal(questionModal));
    document.getElementById("cancelQuestionBtn").addEventListener("click", () => closeModal(questionModal));

    // ── EDIT QUESTION ──
    window.editQuestion = async (id) => {
        try {
            const response = await api.get(`/admin/questions?courseId=&type=`);
            const question = response.questions.find(q => q._id === id);
            if (!question) return;

            document.getElementById("questionModalTitle").textContent = "Edit Question";
            document.getElementById("questionId").value = question._id;
            document.getElementById("qCourse").value = question.course?._id || "";
            document.getElementById("qType").value = question.type;
            document.getElementById("qQuestion").value = question.question;
            document.getElementById("qOptionA").value = question.optionA;
            document.getElementById("qOptionB").value = question.optionB;
            document.getElementById("qOptionC").value = question.optionC;
            document.getElementById("qOptionD").value = question.optionD;
            document.getElementById("qCorrectAnswer").value = question.correctAnswer;
            document.getElementById("qExplanation").value = question.explanation || "";

            openModal(questionModal);

        } catch (error) {
            Utils.toast("Failed to load question", "error");
        }
    };

    // ── SAVE QUESTION ──
    document.getElementById("saveQuestionBtn").addEventListener("click", async () => {
        const id = document.getElementById("questionId").value;
        const saveBtn = document.getElementById("saveQuestionBtn");

        const payload = {
            course: document.getElementById("qCourse").value,
            type: document.getElementById("qType").value,
            question: document.getElementById("qQuestion").value.trim(),
            optionA: document.getElementById("qOptionA").value.trim(),
            optionB: document.getElementById("qOptionB").value.trim(),
            optionC: document.getElementById("qOptionC").value.trim(),
            optionD: document.getElementById("qOptionD").value.trim(),
            correctAnswer: document.getElementById("qCorrectAnswer").value,
            explanation: document.getElementById("qExplanation").value.trim()
        };

        if (!payload.course || !payload.type || !payload.question ||
            !payload.optionA || !payload.optionB || !payload.optionC ||
            !payload.optionD || !payload.correctAnswer) {
            Utils.toast("Please fill all required fields", "error");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {
            if (id) {
                await api.put(`/admin/questions/${id}`, payload);
                Utils.toast("Question updated successfully", "success");
            } else {
                await api.post("/admin/questions", payload);
                Utils.toast("Question added successfully", "success");
            }

            closeModal(questionModal);
            await loadQuestions();

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Question";
        }
    });

    // ── DELETE MODAL ──
    window.confirmDelete = (id) => {
        document.getElementById("deleteQuestionId").value = id;
        openModal(deleteModal);
    };

    document.getElementById("closeDeleteModal").addEventListener("click", () => closeModal(deleteModal));
    document.getElementById("cancelDeleteBtn").addEventListener("click", () => closeModal(deleteModal));

    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
        const id = document.getElementById("deleteQuestionId").value;
        const confirmBtn = document.getElementById("confirmDeleteBtn");

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Deleting...";

        try {
            await api.delete(`/admin/questions/${id}`);
            Utils.toast("Question deleted successfully", "success");
            closeModal(deleteModal);
            await loadQuestions();
        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
        }
    });

    // ── UPLOAD ZONE ──
    uploadZone.addEventListener("click", () => bulkFile.click());

    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = "var(--color-primary)";
    });

    uploadZone.addEventListener("dragleave", () => {
        uploadZone.style.borderColor = "var(--color-border)";
    });

    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = "var(--color-border)";
        const file = e.dataTransfer.files[0];
        if (file) {
            bulkFile.files = e.dataTransfer.files;
            uploadZone.querySelector(".upload-zone-text").textContent = `Selected: ${file.name}`;
        }
    });

    bulkFile.addEventListener("change", () => {
        if (bulkFile.files[0]) {
            uploadZone.querySelector(".upload-zone-text").textContent = `Selected: ${bulkFile.files[0].name}`;
        }
    });

    // ── DOWNLOAD TEMPLATE ──
    document.getElementById("downloadTemplateBtn").addEventListener("click", async () => {
        try {
            const token = Auth.getToken();
            const response = await fetch(`${CONFIG.API_BASE_URL}/admin/questions/template`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to download template");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "questions_template.xlsx";
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            Utils.toast("Failed to download template", "error");
        }
    });

    // ── BULK UPLOAD ──
    document.getElementById("uploadBtn").addEventListener("click", async () => {
        const courseId = document.getElementById("bulkCourse").value;
        const type = document.getElementById("bulkType").value;
        const file = bulkFile.files[0];
        const uploadBtn = document.getElementById("uploadBtn");

        if (!courseId) { Utils.toast("Please select a course", "error"); return; }
        if (!type) { Utils.toast("Please select a question type", "error"); return; }
        if (!file) { Utils.toast("Please select a file to upload", "error"); return; }

        uploadBtn.disabled = true;
        uploadBtn.textContent = "Uploading...";
        uploadResult.classList.add("hidden");

        try {
            const formData = new FormData();
            formData.append("courseId", courseId);
            formData.append("type", type);
            formData.append("file", file);

            const token = Auth.getToken();
            const response = await fetch(`${CONFIG.API_BASE_URL}/admin/questions/bulk-upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            uploadResult.classList.remove("hidden");
            uploadResult.innerHTML = `
                <div class="upload-result upload-result-success">
                    ✅ ${data.uploaded} question${data.uploaded !== 1 ? "s" : ""} uploaded successfully
                </div>
                ${data.skipped > 0 ? `
                <div class="upload-result upload-result-warning">
                    ⚠️ ${data.skipped} row${data.skipped !== 1 ? "s" : ""} skipped:
                    <ul style="margin-top: var(--space-2); padding-left: var(--space-4);">
                        ${data.skippedRows.map(r => `<li style="font-size: var(--text-xs);">${r}</li>`).join("")}
                    </ul>
                </div>` : ""}
            `;

            bulkFile.value = "";
            uploadZone.querySelector(".upload-zone-text").textContent = "Click to upload or drag and drop your file here";
            await loadQuestions();

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "Upload Questions";
        }
    });


        // ════════════════════════════════════════
    // ── AI QUESTION GENERATION ──
    // ════════════════════════════════════════

    let pendingQuestions = [];

    // ── RENDER QUESTION CARDS ──
    const renderQuestionCards = (questions) => {
        aiQuestionsList.innerHTML = questions.map((q, index) => `
            <div class="card mb-4" style="border: 1px solid var(--color-border);">

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
                            <span style="
                                font-size: var(--text-xs);
                                padding: 2px 8px;
                                border-radius: var(--radius-full);
                                background: var(--color-bg-muted, #f1f5f9);
                                color: var(--color-text-muted);
                            ">${document.getElementById("aiDifficulty").value}</span>
                        </div>

                        <p style="font-weight: 500; margin-bottom: var(--space-3); font-size: var(--text-sm); line-height: 1.5;">
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
                                line-height: 1.5;
                            ">
                                💡 ${q.explanation}
                            </div>
                        ` : ""}

                    </div>
                </div>

            </div>
        `).join("");

        // Sync select-all when individual checkboxes change
        aiQuestionsList.querySelectorAll(".question-checkbox").forEach(cb => {
            cb.addEventListener("change", syncSelectAll);
        });
    };

    // ── SELECT ALL SYNC ──
    const syncSelectAll = () => {
        const all = aiQuestionsList.querySelectorAll(".question-checkbox");
        const checked = aiQuestionsList.querySelectorAll(".question-checkbox:checked");
        selectAllCheckbox.checked = all.length === checked.length;
        selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < all.length;
    };

    selectAllCheckbox.addEventListener("change", () => {
        aiQuestionsList.querySelectorAll(".question-checkbox").forEach(cb => {
            cb.checked = selectAllCheckbox.checked;
        });
    });

    // ── RESET AI PANEL ──
    const resetAIPanel = () => {
        reviewPanel.classList.add("hidden");
        duplicateNotice.classList.add("hidden");
        aiQuestionsList.innerHTML = "";
        reviewStatus.textContent = "";
        pendingQuestions = [];
        document.getElementById("aiTopic").value = "";
        document.getElementById("aiCount").value = "10";
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    };

    // ── GENERATE ──
    generateBtn.addEventListener("click", async () => {
        const courseId = document.getElementById("aiCourse").value;
        const topicName = document.getElementById("aiTopic").value.trim();
        const difficulty = document.getElementById("aiDifficulty").value;
        const type = document.getElementById("aiType").value;
        const count = document.getElementById("aiCount").value;

        // Validate
        const aiCourseError = document.getElementById("aiCourseError");
        const aiTopicError = document.getElementById("aiTopicError");
        const aiCountError = document.getElementById("aiCountError");

        aiCourseError.classList.add("hidden");
        aiTopicError.classList.add("hidden");
        aiCountError.classList.add("hidden");

        let valid = true;

        if (!courseId) {
            aiCourseError.textContent = "Please select a course";
            aiCourseError.classList.remove("hidden");
            valid = false;
        }
        if (!topicName) {
            aiTopicError.textContent = "Topic name is required";
            aiTopicError.classList.remove("hidden");
            valid = false;
        }
        if (!count || Number(count) < 1 || Number(count) > 50) {
            aiCountError.textContent = "Enter a number between 1 and 50";
            aiCountError.classList.remove("hidden");
            valid = false;
        }
        if (!valid) return;

        // Reset state before new generation
        reviewPanel.classList.add("hidden");
        duplicateNotice.classList.add("hidden");
        reviewStatus.textContent = "";
        pendingQuestions = [];

        generateBtn.disabled = true;
        generateBtn.textContent = "✨ Generating...";

        try {
            const data = await api.post("/admin/questions/ai-generate", {
                courseId,
                topicName,
                difficulty,
                count: Number(count),
                type
            });

            pendingQuestions = data.questions;

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

    // ── APPROVE — SAVE SELECTED ──
    approveBtn.addEventListener("click", async () => {
        const checked = aiQuestionsList.querySelectorAll(".question-checkbox:checked");

        if (checked.length === 0) {
            Utils.toast("Select at least one question to save.", "warning");
            return;
        }

        const selected = Array.from(checked).map(cb => {
            return pendingQuestions[Number(cb.dataset.index)];
        });

        const courseId = document.getElementById("aiCourse").value;
        const difficulty = document.getElementById("aiDifficulty").value;
        const type = document.getElementById("aiType").value;

        approveBtn.disabled = true;
        approveBtn.textContent = "Saving...";

        try {
            const data = await api.post("/admin/questions/ai-save", {
                courseId,
                questions: selected,
                difficulty,
                type
            });

            Utils.toast(data.message, "success");
            resetAIPanel();
            await loadQuestions();

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
            // Best-effort — nothing was saved so failure is harmless
        }

        resetAIPanel();
        Utils.toast("Questions discarded.", "info");
    });


    // ── INIT ──
    await loadCourses();
    await loadQuestions();

};

init();