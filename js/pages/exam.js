Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
        return;
    }

// ── ESCAPE HTML ──
const escapeHTML = (str) => {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

    // ── GET URL PARAMS ──
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");
    const type = params.get("type");

    if (!courseId || !type) {
        window.location.href = "./courses.html";
        return;
    }

    // ── STATE ──
    let attempt = null;
    let questions = [];
    let answers = {};
    let currentIndex = 0;
    let timerInterval = null;
    let timeLeft = 0;
    let tabWarned = false;
    let isSubmitting = false;

    // ── ELEMENT REFERENCES ──
    const examBody = document.getElementById("examBody");
    const examTimer = document.getElementById("examTimer");
    const progressFill = document.getElementById("progressFill");
    const examCourseTitle = document.getElementById("examCourseTitle");
    const examTypeBadge = document.getElementById("examTypeBadge");
    const warningOverlay = document.getElementById("warningOverlay");
    const submitOverlay = document.getElementById("submitOverlay");
    const submitOverlayText = document.getElementById("submitOverlayText");

    // ── SECURITY: DISABLE RIGHT CLICK ──
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // ── SECURITY: DISABLE COPY/PASTE ──
    document.addEventListener("copy", (e) => e.preventDefault());
    document.addEventListener("cut", (e) => e.preventDefault());
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && ["c", "v", "x", "u", "s", "a"].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
        // Disable F12
        if (e.key === "F12") e.preventDefault();
    });

    // ── SECURITY: TAB SWITCH DETECTION ──
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && attempt && !isSubmitting) {
            if (!tabWarned) {
                tabWarned = true;
                warningOverlay.classList.remove("hidden");
            } else {
                autoSubmit("timed-out");
            }
        }
    });

    document.getElementById("returnToExamBtn").addEventListener("click", () => {
        warningOverlay.classList.add("hidden");
        requestFullscreen();
    });

    // ── SECURITY: FULLSCREEN ──
    const requestFullscreen = () => {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    };

    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && attempt && !isSubmitting) {
            if (!tabWarned) {
                tabWarned = true;
                warningOverlay.classList.remove("hidden");
            } else {
                autoSubmit("timed-out");
            }
        }
    });

    // ── FORMAT TIME ──
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    // ── START TIMER ──
    const startTimer = (timeLimitMinutes) => {
        timeLeft = timeLimitMinutes * 60;
        examTimer.textContent = formatTime(timeLeft);

        timerInterval = setInterval(() => {
            timeLeft--;
            examTimer.textContent = formatTime(timeLeft);

            // Warning states
            if (timeLeft <= 300 && timeLeft > 60) {
                examTimer.className = "exam-timer warning";
            } else if (timeLeft <= 60) {
                examTimer.className = "exam-timer danger";
            }

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                autoSubmit("timed-out");
            }
        }, 1000);
    };

    // ── AUTO SUBMIT ──
    const autoSubmit = async (status = "timed-out") => {
        if (isSubmitting) return;
        isSubmitting = true;
        clearInterval(timerInterval);
        warningOverlay.classList.add("hidden");
        submitOverlay.classList.add("hidden");

        Utils.showLoader();

        try {
            const response = await api.post("/exam/submit", {
                attemptId: attempt._id,
                answers,
                status
            });

            sessionStorage.setItem("kb_exam_result", JSON.stringify(response.result));
            window.location.href = "./result.html";

        } catch (error) {
            Utils.toast("Failed to submit exam. Please try again.", "error");
            isSubmitting = false;
            Utils.hideLoader();
        }
    };

    // ── RENDER QUESTION ──
    const renderQuestion = () => {
        const q = questions[currentIndex];
        const answered = answers[q._id];
        const total = questions.length;
        const answeredCount = Object.keys(answers).length;

        // Update progress
        progressFill.style.width = `${((currentIndex + 1) / total) * 100}%`;

        // Update question grid
        const dots = document.querySelectorAll(".question-dot");
        dots.forEach((dot, i) => {
            dot.className = "question-dot";
            if (answers[questions[i]._id]) dot.classList.add("answered");
            if (i === currentIndex) dot.classList.add("current");
        });

        // Render question panel
        document.getElementById("questionPanel").innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${currentIndex + 1} of ${total}</span>
                <span class="question-badge">${answeredCount} of ${total} answered</span>
            </div>

            <p class="question-text">${q.question}</p>

            <div class="options-list">
                ${["A", "B", "C", "D"].map(letter => `
                    <div
                        class="option-item ${answered === letter ? "selected" : ""}"
                        onclick="selectAnswer('${q._id}', '${letter}')"
                    >
                        <div class="option-letter">${letter}</div>
                        <div class="option-text">${q[`option${letter}`]}</div>
                    </div>
                `).join("")}
            </div>

            <div class="question-nav">
                <button
                    class="btn btn-ghost"
                    onclick="navigate(-1)"
                    ${currentIndex === 0 ? "disabled" : ""}
                >← Previous</button>

                ${currentIndex < total - 1
                    ? `<button class="btn btn-primary" onclick="navigate(1)">Next →</button>`
                    : `<button class="btn btn-accent" onclick="showSubmitConfirm()">Submit Exam</button>`
                }
            </div>
        `;
    };

    // ── SELECT ANSWER ──
    window.selectAnswer = async (questionId, answer) => {
        answers[questionId] = answer;
        renderQuestion();

        // Auto-save answer to backend
        try {
            await api.post("/exam/save-answer", {
                attemptId: attempt._id,
                questionId,
                answer
            });
        } catch (error) {
            console.error("Auto-save failed:", error);
        }
    };

    // ── NAVIGATE ──
    window.navigate = (direction) => {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < questions.length) {
            currentIndex = newIndex;
            renderQuestion();
        }
    };

    // ── NAVIGATE TO QUESTION ──
    window.navigateToQuestion = (index) => {
        currentIndex = index;
        renderQuestion();
    };

    // ── SHOW SUBMIT CONFIRM ──
    window.showSubmitConfirm = () => {
        const total = questions.length;
        const answeredCount = Object.keys(answers).length;
        const unanswered = total - answeredCount;

        if (unanswered > 0) {
            submitOverlayText.innerHTML = `
                You have <strong>${unanswered} unanswered question${unanswered > 1 ? "s" : ""}</strong>.
                Unanswered questions will be marked as incorrect. Are you sure you want to submit?
            `;
        } else {
            submitOverlayText.innerHTML = `
                You have answered all <strong>${total} questions</strong>. Ready to submit?
            `;
        }

        submitOverlay.classList.remove("hidden");
    };

    document.getElementById("cancelSubmitBtn").addEventListener("click", () => {
        submitOverlay.classList.add("hidden");
    });

    document.getElementById("confirmSubmitBtn").addEventListener("click", () => {
        autoSubmit("submitted");
    });

    // ── RENDER EXAM LAYOUT ──
    const renderExamLayout = () => {
        examBody.innerHTML = `
            <div class="question-panel" id="questionPanel"></div>

            <div class="exam-sidebar">
                <div class="exam-sidebar-card">
                    <p class="exam-sidebar-title">Questions</p>
                    <div class="question-grid" id="questionGrid">
                        ${questions.map((q, i) => `
                            <div
                                class="question-dot ${answers[q._id] ? "answered" : ""} ${i === 0 ? "current" : ""}"
                                onclick="navigateToQuestion(${i})"
                            >${i + 1}</div>
                        `).join("")}
                    </div>
                </div>

                <div class="exam-sidebar-card">
                    <p class="exam-sidebar-title">Legend</p>
                    <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                        <div style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--color-text-muted);">
                            <div style="width:16px;height:16px;border-radius:4px;background:var(--color-primary);"></div>
                            Answered
                        </div>
                        <div style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--color-text-muted);">
                            <div style="width:16px;height:16px;border-radius:4px;border:2px solid var(--color-accent);"></div>
                            Current
                        </div>
                        <div style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--color-text-muted);">
                            <div style="width:16px;height:16px;border-radius:4px;background:var(--color-surface-2);border:2px solid var(--color-border);"></div>
                            Unanswered
                        </div>
                    </div>
                </div>

                <button class="btn btn-accent exam-submit-btn" onclick="showSubmitConfirm()">
                    Submit Exam
                </button>
            </div>
        `;

        renderQuestion();
    };

    // ── START EXAM ──
    Utils.showLoader();

    try {
        const response = await api.post("/exam/start", { courseId, type });
        attempt = response.attempt;
        questions = attempt.questions;
        answers = attempt.answers || {};

        // Set course title and badge
        examCourseTitle.textContent = params.get("title") || "Exam";
        examTypeBadge.textContent = type === "certification" ? "Certification" : "Practice";
        examTypeBadge.className = `badge ${type === "certification" ? "badge-info" : "badge-success"}`;

        // Calculate remaining time
        const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
        const remainingSeconds = Math.max((attempt.timeLimit * 60) - elapsed, 0);

        Utils.hideLoader();
        renderExamLayout();

        // Request fullscreen
        requestFullscreen();

        // Start timer with remaining time
        timeLeft = remainingSeconds;
        examTimer.textContent = formatTime(timeLeft);

        timerInterval = setInterval(() => {
            timeLeft--;
            examTimer.textContent = formatTime(timeLeft);

            if (timeLeft <= 300 && timeLeft > 60) {
                examTimer.className = "exam-timer warning";
            } else if (timeLeft <= 60) {
                examTimer.className = "exam-timer danger";
            }

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                autoSubmit("timed-out");
            }
        }, 1000);

    } catch (error) {
        Utils.hideLoader();

        if (error.message.includes("Payment required")) {
            Utils.toast("Payment required to take certification exam", "warning");
            setTimeout(() => {
                window.location.href = `./payment.html?id=${courseId}`;
            }, 1500);
            return;
        }

        examBody.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">${error.message}</h3>
                <a href="./courses.html" class="btn btn-primary mt-4">Back to Courses</a>
            </div>`;
    }

};

init();