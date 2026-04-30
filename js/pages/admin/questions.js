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
    const questionsTable = document.getElementById("questionsTable");
    const questionsCount = document.getElementById("questionsCount");
    const courseFilter = document.getElementById("courseFilter");
    const typeFilter = document.getElementById("typeFilter");
    const questionModal = document.getElementById("questionModal");
    const deleteModal = document.getElementById("deleteModal");
    const uploadZone = document.getElementById("uploadZone");
    const bulkFile = document.getElementById("bulkFile");
    const uploadResult = document.getElementById("uploadResult");

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

    // ── LOAD COURSES INTO SELECTS ──
    const loadCourses = async () => {
        try {
            const response = await api.get("/admin/courses");
            const courses = response.courses;

            const selects = ["courseFilter", "bulkCourse", "qCourse"];
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

    // ── EDIT QUESTION (GLOBAL) ──
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

    // ── INIT ──
    await loadCourses();
    await loadQuestions();

};

init();