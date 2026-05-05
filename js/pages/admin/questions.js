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
    const courseAccordion = document.getElementById("courseAccordion");
    const questionModal = document.getElementById("questionModal");
    const deleteModal = document.getElementById("deleteModal");
    const bulkDeleteModal = document.getElementById("bulkDeleteModal");
    const uploadZone = document.getElementById("uploadZone");
    const bulkFile = document.getElementById("bulkFile");
    const uploadResult = document.getElementById("uploadResult");

    // AI references
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4
                7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6
                4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

    // ── LOAD USER ──
    const user = Auth.getUser();
    if (user) {
        sidebarName.textContent = user.fullName;
        if (user.profilePhoto) {
            sidebarAvatar.innerHTML =
                `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
            topbarAvatar.innerHTML =
                `<img src="${user.profilePhoto}" alt="${user.fullName}">`;
        } else {
            sidebarAvatar.innerHTML = defaultAvatar;
            topbarAvatar.innerHTML = defaultAvatar;
        }
    }

    // ── MODAL HELPERS ──
    const openModal = (modal) => modal.classList.remove("hidden");
    const closeModal = (modal) => modal.classList.add("hidden");

    // ── STATE ──
    let allCourses = [];
    // courseId -> { practice: [...], certification: [...] }
    let questionCache = {};

    // ── LOAD COURSES ──
    const loadCourses = async () => {
        try {
            const response = await api.get("/admin/courses");
            allCourses = response.courses;

            const selects = ["bulkCourse", "qCourse", "aiCourse"];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                const firstOption = select.options[0];
                select.innerHTML = "";
                select.appendChild(firstOption);
                allCourses.forEach(course => {
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

    // ── FETCH QUESTIONS FOR A COURSE + TYPE ──
    const fetchQuestions = async (courseId, type) => {
        const key = `${courseId}_${type}`;
        if (questionCache[key]) return questionCache[key];

        const response = await api.get(
            `/admin/questions?courseId=${courseId}&type=${type}`
        );
        questionCache[key] = response.questions;
        return response.questions;
    };

    // ── INVALIDATE CACHE ──
    const invalidateCache = (courseId, type) => {
        delete questionCache[`${courseId}_${type}`];
    };

    // ── GET QUESTION COUNTS ──
    const getQuestionCounts = async (courseId) => {
        try {
            const [practiceRes, certRes] = await Promise.all([
                api.get(`/admin/questions?courseId=${courseId}&type=practice`),
                api.get(`/admin/questions?courseId=${courseId}&type=certification`)
            ]);
            return {
                practice: practiceRes.questions.length,
                certification: certRes.questions.length
            };
        } catch {
            return { practice: 0, certification: 0 };
        }
    };

    // ── RENDER QUESTION TABLE FOR A COURSE + TYPE ──
    const renderQuestionTable = (questions, courseId, type, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (questions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: var(--space-8);">
                    <div class="empty-state-icon">📝</div>
                    <h3 class="empty-state-title">No ${type} questions yet</h3>
                    <p class="empty-state-text">
                        Add questions manually or upload via Excel.
                    </p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="bulk-toolbar">
                <div class="bulk-toolbar-left">
                    <label class="bulk-select-all">
                        <input type="checkbox" class="q-checkbox"
                            id="selectAll_${courseId}_${type}"
                            onchange="toggleSelectAll('${courseId}', '${type}')">
                        Select All
                    </label>
                    <span class="bulk-selected-count"
                        id="selectedCount_${courseId}_${type}">
                        0 selected
                    </span>
                </div>
                <button
                    class="btn btn-accent btn-sm"
                    id="deleteSelectedBtn_${courseId}_${type}"
                    onclick="deleteSelected('${courseId}', '${type}')"
                    disabled
                >
                    🗑 Delete Selected
                </button>
                <button
                    class="btn btn-ghost btn-sm"
                    style="color: var(--color-error);"
                    onclick="confirmDeleteAll('${courseId}', '${type}', ${questions.length})"
                >
                    🗑 Delete All ${type} (${questions.length})
                </button>
            </div>

            <div class="admin-table-wrapper">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"></th>
                            <th>#</th>
                            <th>Question</th>
                            <th>Answer</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${questions.map((q, index) => `
                            <tr>
                                <td>
                                    <input
                                        type="checkbox"
                                        class="q-checkbox question-row-checkbox"
                                        data-course="${courseId}"
                                        data-type="${type}"
                                        data-id="${q._id}"
                                        onchange="updateSelectedCount('${courseId}', '${type}')"
                                    >
                                </td>
                                <td>${index + 1}</td>
                                <td style="max-width: 400px;">
                                    <p style="white-space: nowrap; overflow: hidden;
                                        text-overflow: ellipsis; font-size: var(--text-sm);">
                                        ${q.question}
                                    </p>
                                </td>
                                <td>
                                    <strong>${q.correctAnswer}</strong>
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button
                                            class="btn-icon btn-icon-edit"
                                            onclick="editQuestion('${q._id}', '${courseId}', '${type}')"
                                            title="Edit"
                                        >✏️</button>
                                        <button
                                            class="btn-icon btn-icon-delete"
                                            onclick="confirmDeleteOne('${q._id}', '${courseId}', '${type}')"
                                            title="Delete"
                                        >🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    };

    // ── BUILD ACCORDION ──
    const buildAccordion = async () => {
        if (allCourses.length === 0) {
            courseAccordion.innerHTML = `
                <div class="card" style="text-align: center; padding: var(--space-8);">
                    <div class="empty-state-icon">📚</div>
                    <h3 class="empty-state-title">No courses found</h3>
                    <p class="empty-state-text">
                        Create a course first before adding questions.
                    </p>
                </div>`;
            return;
        }

        // Build cards with loading counts
        courseAccordion.innerHTML = allCourses.map(course => `
            <div class="course-accordion-card" id="accordionCard_${course._id}">
                <div class="course-accordion-header"
                    onclick="toggleAccordion('${course._id}')">
                    <div class="course-accordion-left">
                        <div class="course-accordion-icon">📘</div>
                        <div>
                            <p class="course-accordion-title">${course.title}</p>
                            <div class="course-accordion-badges"
                                id="badges_${course._id}">
                                <span class="count-badge count-badge-practice">
                                    Practice: —
                                </span>
                                <span class="count-badge count-badge-cert">
                                    Certification: —
                                </span>
                            </div>
                        </div>
                    </div>
                    <span class="course-accordion-arrow"
                        id="arrow_${course._id}">▼</span>
                </div>

                <div class="course-accordion-body" id="body_${course._id}">
                    <div class="type-tabs">
                        <button
                            class="type-tab active"
                            id="tab_practice_${course._id}"
                            onclick="switchTab('${course._id}', 'practice')"
                        >
                            Practice
                        </button>
                        <button
                            class="type-tab"
                            id="tab_certification_${course._id}"
                            onclick="switchTab('${course._id}', 'certification')"
                        >
                            Certification
                        </button>
                    </div>
                    <div id="tableContainer_${course._id}">
                        <div style="text-align: center; padding: var(--space-6);">
                            <div class="spinner" style="margin: 0 auto;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join("");

        // Load counts for all courses
        allCourses.forEach(async (course) => {
            const counts = await getQuestionCounts(course._id);
            const badgesEl = document.getElementById(`badges_${course._id}`);
            if (badgesEl) {
                badgesEl.innerHTML = `
                    <span class="count-badge count-badge-practice">
                        Practice: ${counts.practice}
                    </span>
                    <span class="count-badge count-badge-cert">
                        Certification: ${counts.certification}
                    </span>
                `;
            }
        });
    };

    // ── TOGGLE ACCORDION ──
    window.toggleAccordion = async (courseId) => {
        const body = document.getElementById(`body_${courseId}`);
        const header = body.previousElementSibling;
        const arrow = document.getElementById(`arrow_${courseId}`);

        const isOpen = body.classList.contains("open");

        if (isOpen) {
            body.classList.remove("open");
            header.classList.remove("open");
            arrow.classList.remove("open");
        } else {
            body.classList.add("open");
            header.classList.add("open");
            arrow.classList.add("open");

            // Load practice questions by default
            await loadTabQuestions(courseId, "practice");
        }
    };

    // ── SWITCH TAB ──
    window.switchTab = async (courseId, type) => {
        const practiceTab = document.getElementById(`tab_practice_${courseId}`);
        const certTab = document.getElementById(`tab_certification_${courseId}`);

        practiceTab.classList.toggle("active", type === "practice");
        certTab.classList.toggle("active", type === "certification");

        await loadTabQuestions(courseId, type);
    };

    // ── LOAD TAB QUESTIONS ──
    const loadTabQuestions = async (courseId, type) => {
        const container = document.getElementById(`tableContainer_${courseId}`);
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-6);">
                <div class="spinner" style="margin: 0 auto;"></div>
            </div>`;

        try {
            const questions = await fetchQuestions(courseId, type);
            renderQuestionTable(
                questions,
                courseId,
                type,
                `tableContainer_${courseId}`
            );
        } catch (error) {
            container.innerHTML = `
                <p class="text-center text-muted" style="padding: var(--space-6);">
                    Failed to load questions
                </p>`;
        }
    };

    // ── UPDATE SELECTED COUNT ──
    window.updateSelectedCount = (courseId, type) => {
        const checkboxes = document.querySelectorAll(
            `.question-row-checkbox[data-course="${courseId}"][data-type="${type}"]`
        );
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        const countEl = document.getElementById(
            `selectedCount_${courseId}_${type}`
        );
        const deleteBtn = document.getElementById(
            `deleteSelectedBtn_${courseId}_${type}`
        );

        if (countEl) countEl.textContent = `${checked.length} selected`;
        if (deleteBtn) deleteBtn.disabled = checked.length === 0;

        // Update select all checkbox state
        const selectAllCb = document.getElementById(
            `selectAll_${courseId}_${type}`
        );
        if (selectAllCb) {
            selectAllCb.checked = checked.length === checkboxes.length;
            selectAllCb.indeterminate =
                checked.length > 0 && checked.length < checkboxes.length;
        }
    };

    // ── TOGGLE SELECT ALL ──
    window.toggleSelectAll = (courseId, type) => {
        const selectAllCb = document.getElementById(
            `selectAll_${courseId}_${type}`
        );
        const checkboxes = document.querySelectorAll(
            `.question-row-checkbox[data-course="${courseId}"][data-type="${type}"]`
        );
        checkboxes.forEach(cb => { cb.checked = selectAllCb.checked; });
        updateSelectedCount(courseId, type);
    };

    // ── DELETE SELECTED ──
    window.deleteSelected = async (courseId, type) => {
        const checkboxes = document.querySelectorAll(
            `.question-row-checkbox[data-course="${courseId}"][data-type="${type}"]:checked`
        );
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (ids.length === 0) return;

        document.getElementById("bulkDeleteTitle").textContent =
            `Delete ${ids.length} Question${ids.length > 1 ? "s" : ""}`;
        document.getElementById("bulkDeleteText").innerHTML =
            `Are you sure you want to delete
            <strong>${ids.length} selected question${ids.length > 1 ? "s" : ""}</strong>?
            This cannot be undone.`;
        document.getElementById("bulkDeleteCourseId").value = courseId;
        document.getElementById("bulkDeleteType").value = type;

        // Store ids for confirmation
        window._bulkDeleteIds = ids;
        window._bulkDeleteMode = "selected";

        openModal(bulkDeleteModal);
    };

    // ── CONFIRM DELETE ALL ──
    window.confirmDeleteAll = (courseId, type, count) => {
        document.getElementById("bulkDeleteTitle").textContent =
            `Delete All ${type} Questions`;
        document.getElementById("bulkDeleteText").innerHTML =
            `Are you sure you want to delete <strong>all ${count} ${type} questions</strong>
            for this course? This cannot be undone.`;
        document.getElementById("bulkDeleteCourseId").value = courseId;
        document.getElementById("bulkDeleteType").value = type;

        window._bulkDeleteIds = null;
        window._bulkDeleteMode = "all";

        openModal(bulkDeleteModal);
    };

        // ── BULK DELETE MODAL CONTROLS ──
    document.getElementById("closeBulkDeleteModal").addEventListener("click",
        () => closeModal(bulkDeleteModal));
    document.getElementById("cancelBulkDeleteBtn").addEventListener("click",
        () => closeModal(bulkDeleteModal));

    document.getElementById("confirmBulkDeleteBtn").addEventListener("click",
        async () => {
            const courseId = document.getElementById("bulkDeleteCourseId").value;
            const type = document.getElementById("bulkDeleteType").value;
            const confirmBtn = document.getElementById("confirmBulkDeleteBtn");

            confirmBtn.disabled = true;
            confirmBtn.textContent = "Deleting...";

            try {
                let payload;
                if (window._bulkDeleteMode === "selected" && window._bulkDeleteIds) {
                    payload = { questionIds: window._bulkDeleteIds };
                } else {
                    payload = { courseId, type };
                }

                const response = await api.request("/admin/questions/bulk-delete", {
                    method: "DELETE",
                    body: JSON.stringify(payload),
                    headers: { "Content-Type": "application/json" }
                });

                Utils.toast(response.message, "success");
                closeModal(bulkDeleteModal);

                // Invalidate cache and reload
                invalidateCache(courseId, type);
                await loadTabQuestions(courseId, type);

                // Refresh counts
                const counts = await getQuestionCounts(courseId);
                const badgesEl = document.getElementById(`badges_${courseId}`);
                if (badgesEl) {
                    badgesEl.innerHTML = `
                        <span class="count-badge count-badge-practice">
                            Practice: ${counts.practice}
                        </span>
                        <span class="count-badge count-badge-cert">
                            Certification: ${counts.certification}
                        </span>
                    `;
                }

            } catch (error) {
                Utils.toast(error.message, "error");
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Delete";
            }
        }
    );

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

    document.getElementById("closeQuestionModal").addEventListener("click",
        () => closeModal(questionModal));
    document.getElementById("cancelQuestionBtn").addEventListener("click",
        () => closeModal(questionModal));

    // ── EDIT QUESTION ──
    window.editQuestion = async (id, courseId, type) => {
        try {
            const questions = await fetchQuestions(courseId, type);
            const question = questions.find(q => q._id === id);
            if (!question) return;

            document.getElementById("questionModalTitle").textContent =
                "Edit Question";
            document.getElementById("questionId").value = question._id;
            document.getElementById("qCourse").value =
                question.course?._id || courseId;
            document.getElementById("qType").value = question.type;
            document.getElementById("qQuestion").value = question.question;
            document.getElementById("qOptionA").value = question.optionA;
            document.getElementById("qOptionB").value = question.optionB;
            document.getElementById("qOptionC").value = question.optionC;
            document.getElementById("qOptionD").value = question.optionD;
            document.getElementById("qCorrectAnswer").value =
                question.correctAnswer;
            document.getElementById("qExplanation").value =
                question.explanation || "";

            // Store context for cache invalidation after save
            window._editingCourseId = courseId;
            window._editingType = type;

            openModal(questionModal);

        } catch (error) {
            Utils.toast("Failed to load question", "error");
        }
    };

    // ── SAVE QUESTION ──
    document.getElementById("saveQuestionBtn").addEventListener("click",
        async () => {
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

                // Invalidate cache and reload
                const cId = window._editingCourseId || payload.course;
                const t = window._editingType || payload.type;
                invalidateCache(cId, t);

                // Also invalidate new course/type if changed
                invalidateCache(payload.course, payload.type);

                // Reload if accordion is open
                const body = document.getElementById(`body_${payload.course}`);
                if (body && body.classList.contains("open")) {
                    await loadTabQuestions(payload.course, payload.type);
                }

                // Refresh counts
                const counts = await getQuestionCounts(payload.course);
                const badgesEl = document.getElementById(
                    `badges_${payload.course}`
                );
                if (badgesEl) {
                    badgesEl.innerHTML = `
                        <span class="count-badge count-badge-practice">
                            Practice: ${counts.practice}
                        </span>
                        <span class="count-badge count-badge-cert">
                            Certification: ${counts.certification}
                        </span>
                    `;
                }

            } catch (error) {
                Utils.toast(error.message, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save Question";
                window._editingCourseId = null;
                window._editingType = null;
            }
        }
    );

    // ── DELETE SINGLE QUESTION ──
    window.confirmDeleteOne = (id, courseId, type) => {
        document.getElementById("deleteQuestionId").value = id;
        window._deleteCourseId = courseId;
        window._deleteType = type;
        openModal(deleteModal);
    };

    document.getElementById("closeDeleteModal").addEventListener("click",
        () => closeModal(deleteModal));
    document.getElementById("cancelDeleteBtn").addEventListener("click",
        () => closeModal(deleteModal));

    document.getElementById("confirmDeleteBtn").addEventListener("click",
        async () => {
            const id = document.getElementById("deleteQuestionId").value;
            const confirmBtn = document.getElementById("confirmDeleteBtn");

            confirmBtn.disabled = true;
            confirmBtn.textContent = "Deleting...";

            try {
                await api.delete(`/admin/questions/${id}`);
                Utils.toast("Question deleted successfully", "success");
                closeModal(deleteModal);

                const cId = window._deleteCourseId;
                const t = window._deleteType;

                invalidateCache(cId, t);
                await loadTabQuestions(cId, t);

                const counts = await getQuestionCounts(cId);
                const badgesEl = document.getElementById(`badges_${cId}`);
                if (badgesEl) {
                    badgesEl.innerHTML = `
                        <span class="count-badge count-badge-practice">
                            Practice: ${counts.practice}
                        </span>
                        <span class="count-badge count-badge-cert">
                            Certification: ${counts.certification}
                        </span>
                    `;
                }

            } catch (error) {
                Utils.toast(error.message, "error");
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Delete";
            }
        }
    );

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
            uploadZone.querySelector(".upload-zone-text").textContent =
                `Selected: ${file.name}`;
        }
    });

    bulkFile.addEventListener("change", () => {
        if (bulkFile.files[0]) {
            uploadZone.querySelector(".upload-zone-text").textContent =
                `Selected: ${bulkFile.files[0].name}`;
        }
    });

    // ── DOWNLOAD TEMPLATE ──
    document.getElementById("downloadTemplateBtn").addEventListener("click",
        async () => {
            try {
                const token = Auth.getToken();
                const response = await fetch(
                    `${CONFIG.API_BASE_URL}/admin/questions/template`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

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
        }
    );

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
            const response = await fetch(
                `${CONFIG.API_BASE_URL}/admin/questions/bulk-upload`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            uploadResult.classList.remove("hidden");
            uploadResult.innerHTML = `
                <div class="upload-result upload-result-success">
                    ✅ ${data.uploaded} question${data.uploaded !== 1 ? "s" : ""}
                    uploaded successfully
                </div>
                ${data.skipped > 0 ? `
                <div class="upload-result upload-result-warning">
                    ⚠️ ${data.skipped} row${data.skipped !== 1 ? "s" : ""} skipped:
                    <ul style="margin-top: var(--space-2); padding-left: var(--space-4);">
                        ${data.skippedRows.map(r =>
                            `<li style="font-size: var(--text-xs);">${r}</li>`
                        ).join("")}
                    </ul>
                </div>` : ""}
            `;

            bulkFile.value = "";
            uploadZone.querySelector(".upload-zone-text").textContent =
                "Click to upload or drag and drop your file here";

            // Invalidate cache and refresh accordion
            invalidateCache(courseId, type);
            const body = document.getElementById(`body_${courseId}`);
            if (body && body.classList.contains("open")) {
                await loadTabQuestions(courseId, type);
            }

            const counts = await getQuestionCounts(courseId);
            const badgesEl = document.getElementById(`badges_${courseId}`);
            if (badgesEl) {
                badgesEl.innerHTML = `
                    <span class="count-badge count-badge-practice">
                        Practice: ${counts.practice}
                    </span>
                    <span class="count-badge count-badge-cert">
                        Certification: ${counts.certification}
                    </span>
                `;
            }

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

    const renderQuestionCards = (questions) => {
        aiQuestionsList.innerHTML = questions.map((q, index) => `
            <div class="card mb-4" style="border: 1px solid var(--color-border);">
                <div style="display: flex; align-items: flex-start; gap: var(--space-3);">
                    <input
                        type="checkbox"
                        class="question-checkbox"
                        data-index="${index}"
                        checked
                        style="margin-top: 3px; flex-shrink: 0;
                            width: 16px; height: 16px; cursor: pointer;"
                    >
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center;
                            gap: var(--space-2); margin-bottom: var(--space-3);">
                            <span style="font-size: var(--text-xs); font-weight: 600;
                                padding: 2px 8px; border-radius: var(--radius-full);
                                background: rgba(37,99,235,0.1);
                                color: var(--color-primary);">
                                Q${index + 1}
                            </span>
                            <span style="font-size: var(--text-xs); padding: 2px 8px;
                                border-radius: var(--radius-full);
                                background: var(--color-surface-2);
                                color: var(--color-text-muted);">
                                ${document.getElementById("aiDifficulty").value}
                            </span>
                        </div>
                        <p style="font-weight: 500; margin-bottom: var(--space-3);
                            font-size: var(--text-sm); line-height: 1.5;">
                            ${q.question}
                        </p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr;
                            gap: var(--space-2); margin-bottom: var(--space-3);">
                            ${["A", "B", "C", "D"].map(letter => `
                                <div style="padding: var(--space-2) var(--space-3);
                                    border-radius: var(--radius-md);
                                    font-size: var(--text-sm);
                                    border: 1px solid ${q.correctAnswer === letter
                                        ? "var(--color-success)"
                                        : "var(--color-border)"};
                                    background: ${q.correctAnswer === letter
                                        ? "rgba(16,185,129,0.08)"
                                        : "transparent"};
                                    color: ${q.correctAnswer === letter
                                        ? "var(--color-success)"
                                        : "var(--color-text-secondary)"};">
                                    <strong>${letter}.</strong> ${q[`option${letter}`]}
                                    ${q.correctAnswer === letter ? " ✓" : ""}
                                </div>
                            `).join("")}
                        </div>
                        ${q.explanation ? `
                            <p style="font-size: var(--text-xs);
                                color: var(--color-text-muted); font-style: italic;
                                border-top: 1px solid var(--color-border);
                                padding-top: var(--space-2);">
                                💡 ${q.explanation}
                            </p>` : ""}
                    </div>
                </div>
            </div>
        `).join("");
    };

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", () => {
            document.querySelectorAll(".question-checkbox").forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
        });
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", () => {
            document.querySelectorAll(".question-checkbox").forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener("click", async () => {
            const courseId = document.getElementById("aiCourse").value;
            const topic = document.getElementById("aiTopic").value.trim();
            const difficulty = document.getElementById("aiDifficulty").value;
            const type = document.getElementById("aiType").value;
            const count = parseInt(document.getElementById("aiCount").value);

            if (!courseId) {
                Utils.toast("Please select a course", "error"); return;
            }
            if (!topic) {
                Utils.toast("Please enter a topic", "error"); return;
            }
            if (!count || count < 1 || count > 50) {
                Utils.toast("Enter a number between 1 and 50", "error"); return;
            }

            generateBtn.disabled = true;
            generateBtn.textContent = "✨ Generating...";
            reviewPanel.classList.add("hidden");
            duplicateNotice.classList.add("hidden");

            try {
                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 4000,
                        messages: [{
                            role: "user",
                            content: `Generate exactly ${count} multiple choice questions about "${topic}" for a ${difficulty} level certification exam.

Return ONLY a JSON array with no markdown, no explanation, no preamble. Each object must have these exact keys:
- question (string)
- optionA (string)
- optionB (string)
- optionC (string)
- optionD (string)
- correctAnswer (string, must be exactly "A", "B", "C", or "D")
- explanation (string, brief explanation of why the answer is correct)

Example format:
[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]`
                        }]
                    })
                });

                const data = await response.json();
                const raw = data.content?.[0]?.text || "";
                const clean = raw.replace(/```json|```/g, "").trim();
                const parsed = JSON.parse(clean);

                if (!Array.isArray(parsed) || parsed.length === 0) {
                    throw new Error("No questions returned");
                }

                // Check for duplicates against existing questions
                const existing = await fetchQuestions(courseId, type);
                const existingTexts = new Set(
                    existing.map(q => q.question.toLowerCase().trim())
                );

                const unique = parsed.filter(
                    q => !existingTexts.has(q.question.toLowerCase().trim())
                );
                const dupeCount = parsed.length - unique.length;

                if (dupeCount > 0) {
                    duplicateNotice.classList.remove("hidden");
                    duplicateNoticeText.textContent =
                        `${dupeCount} question${dupeCount > 1 ? "s were" : " was"}
                        already in the question bank and removed.`;
                }

                if (unique.length === 0) {
                    Utils.toast("All generated questions already exist in the bank.",
                        "warning");
                    return;
                }

                pendingQuestions = unique;
                renderQuestionCards(unique);
                reviewPanel.classList.remove("hidden");
                reviewStatus.textContent = "";

            } catch (error) {
                Utils.toast("Failed to generate questions. Try again.", "error");
                console.error(error);
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = "✨ Generate Questions";
            }
        });
    }

    if (approveBtn) {
        approveBtn.addEventListener("click", async () => {
            const courseId = document.getElementById("aiCourse").value;
            const type = document.getElementById("aiType").value;
            const checked = document.querySelectorAll(
                ".question-checkbox:checked"
            );
            const selectedIndexes = Array.from(checked).map(
                cb => parseInt(cb.dataset.index)
            );
            const toSave = selectedIndexes.map(i => pendingQuestions[i]);

            if (toSave.length === 0) {
                Utils.toast("No questions selected", "error"); return;
            }

            approveBtn.disabled = true;
            approveBtn.textContent = "Saving...";

            try {
                const questionsToSave = toSave.map(q => ({
                    course: courseId,
                    type,
                    question: q.question,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || ""
                }));

                for (const q of questionsToSave) {
                    await api.post("/admin/questions", q);
                }

                Utils.toast(
                    `${toSave.length} question${toSave.length > 1 ? "s" : ""}
                    saved successfully`, "success"
                );

                reviewPanel.classList.add("hidden");
                duplicateNotice.classList.add("hidden");
                pendingQuestions = [];

                // Refresh accordion
                invalidateCache(courseId, type);
                const body = document.getElementById(`body_${courseId}`);
                if (body && body.classList.contains("open")) {
                    await loadTabQuestions(courseId, type);
                }

                const counts = await getQuestionCounts(courseId);
                const badgesEl = document.getElementById(`badges_${courseId}`);
                if (badgesEl) {
                    badgesEl.innerHTML = `
                        <span class="count-badge count-badge-practice">
                            Practice: ${counts.practice}
                        </span>
                        <span class="count-badge count-badge-cert">
                            Certification: ${counts.certification}
                        </span>
                    `;
                }

            } catch (error) {
                Utils.toast("Failed to save some questions", "error");
            } finally {
                approveBtn.disabled = false;
                approveBtn.textContent = "✅ Save Selected Questions";
            }
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener("click", () => {
            reviewPanel.classList.add("hidden");
            duplicateNotice.classList.add("hidden");
            pendingQuestions = [];
        });
    }

    // ── INIT ──
    await loadCourses();
    await buildAccordion();

};

init();