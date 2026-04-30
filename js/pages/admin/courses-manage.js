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
    const categoriesTable = document.getElementById("categoriesTable");
    const coursesTable = document.getElementById("coursesTable");
    const categoryModal = document.getElementById("categoryModal");
    const deleteModal = document.getElementById("deleteModal");

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

    // ── CATEGORY MODAL ──
    document.getElementById("addCategoryBtn").addEventListener("click", () => {
        document.getElementById("categoryModalTitle").textContent = "Add Category";
        document.getElementById("categoryName").value = "";
        document.getElementById("categoryId").value = "";
        document.getElementById("categoryNameError").classList.add("hidden");
        openModal(categoryModal);
    });

    document.getElementById("closeCategoryModal").addEventListener("click", () => closeModal(categoryModal));
    document.getElementById("cancelCategoryBtn").addEventListener("click", () => closeModal(categoryModal));

    // ── DELETE MODAL ──
    document.getElementById("closeDeleteModal").addEventListener("click", () => closeModal(deleteModal));
    document.getElementById("cancelDeleteBtn").addEventListener("click", () => closeModal(deleteModal));

    // ── LOAD CATEGORIES ──
    const loadCategories = async () => {
        try {
            const response = await api.get("/admin/categories");
            const categories = response.categories;

            if (categories.length === 0) {
                categoriesTable.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-muted">No categories yet</td>
                    </tr>`;
                return;
            }

            categoriesTable.innerHTML = categories.map(cat => `
                <tr>
                    <td>${cat.name}</td>
                    <td>
                        <span class="badge ${cat.isActive ? "badge-success" : "badge-error"}">
                            ${cat.isActive ? "Active" : "Inactive"}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button
                                class="btn-icon btn-icon-edit"
                                onclick="editCategory('${cat._id}', '${cat.name}')"
                                title="Edit"
                            >✏️</button>
                            <button
                                class="btn-icon btn-icon-delete"
                                onclick="confirmDelete('${cat._id}', '${cat.name}', 'category')"
                                title="Delete"
                            >🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join("");

        } catch (error) {
            categoriesTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">Failed to load categories</td>
                </tr>`;
        }
    };

    // ── LOAD COURSES ──
    const loadCourses = async () => {
        try {
            const response = await api.get("/admin/courses");
            const courses = response.courses;

            if (courses.length === 0) {
                coursesTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">No courses yet. <a href="./add-course.html" style="color:var(--color-primary)">Add one</a></td>
                    </tr>`;
                return;
            }

            coursesTable.innerHTML = courses.map(course => `
                <tr>
                    <td><strong>${course.title}</strong></td>
                    <td>${course.category?.name || "—"}</td>
                    <td>$${course.price}</td>
                    <td>${course.passMark}%</td>
                    <td>
                        <span class="badge ${course.isActive ? "badge-success" : "badge-error"}">
                            ${course.isActive ? "Active" : "Inactive"}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button
                                class="btn-icon btn-icon-edit"
                                onclick="window.location.href='./add-course.html?id=${course._id}'"
                                title="Edit"
                            >✏️</button>
                            <button
                                class="btn-icon btn-icon-toggle"
                                onclick="toggleCourse('${course._id}')"
                                title="${course.isActive ? "Deactivate" : "Activate"}"
                            >${course.isActive ? "🔴" : "🟢"}</button>
                            <button
                                class="btn-icon btn-icon-delete"
                                onclick="confirmDelete('${course._id}', '${course.title}', 'course')"
                                title="Delete"
                            >🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join("");

        } catch (error) {
            coursesTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">Failed to load courses</td>
                </tr>`;
        }
    };

    // ── SAVE CATEGORY ──
    document.getElementById("saveCategoryBtn").addEventListener("click", async () => {
        const name = document.getElementById("categoryName").value.trim();
        const id = document.getElementById("categoryId").value;
        const errorEl = document.getElementById("categoryNameError");

        if (!name) {
            errorEl.textContent = "Category name is required";
            errorEl.classList.remove("hidden");
            return;
        }

        errorEl.classList.add("hidden");
        const saveBtn = document.getElementById("saveCategoryBtn");
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {
            if (id) {
                await api.put(`/admin/categories/${id}`, { name });
                Utils.toast("Category updated successfully", "success");
            } else {
                await api.post("/admin/categories", { name });
                Utils.toast("Category created successfully", "success");
            }

            closeModal(categoryModal);
            await loadCategories();

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Category";
        }
    });

    // ── EDIT CATEGORY (GLOBAL) ──
    window.editCategory = (id, name) => {
        document.getElementById("categoryModalTitle").textContent = "Edit Category";
        document.getElementById("categoryName").value = name;
        document.getElementById("categoryId").value = id;
        document.getElementById("categoryNameError").classList.add("hidden");
        openModal(categoryModal);
    };

    // ── TOGGLE COURSE (GLOBAL) ──
    window.toggleCourse = async (id) => {
        try {
            const response = await api.request(`/admin/courses/${id}/toggle`, { method: "PATCH" });
            Utils.toast(response.message, "success");
            await loadCourses();
        } catch (error) {
            Utils.toast(error.message, "error");
        }
    };

    // ── CONFIRM DELETE (GLOBAL) ──
    window.confirmDelete = (id, name, type) => {
        document.getElementById("deleteItemName").textContent = name;
        document.getElementById("deleteItemId").value = id;
        document.getElementById("deleteItemType").value = type;
        openModal(deleteModal);
    };

    // ── CONFIRM DELETE BTN ──
    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
        const id = document.getElementById("deleteItemId").value;
        const type = document.getElementById("deleteItemType").value;
        const confirmBtn = document.getElementById("confirmDeleteBtn");

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Deleting...";

        try {
            if (type === "category") {
                await api.delete(`/admin/categories/${id}`);
                Utils.toast("Category deleted successfully", "success");
                await loadCategories();
            } else if (type === "course") {
                await api.delete(`/admin/courses/${id}`);
                Utils.toast("Course deleted successfully", "success");
                await loadCourses();
            }

            closeModal(deleteModal);

        } catch (error) {
            Utils.toast(error.message, "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Delete";
        }
    });

    // ── INIT ──
    await loadCategories();
    await loadCourses();

};

init();