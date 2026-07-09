Utils.initTheme();

const init = async () => {

    await Auth.restoreSession();

    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
        return;
    }

    const resultBody = document.getElementById("resultBody");

    let result = null;

    const stored = sessionStorage.getItem("kb_exam_result");
    if (stored) {
        result = JSON.parse(stored);
        sessionStorage.removeItem("kb_exam_result");
    } else {
        const params = new URLSearchParams(window.location.search);
        const attemptId = params.get("id");

        if (!attemptId) {
            window.location.href = "./dashboard.html";
            return;
        }

        try {
            const response = await api.get(`/exam/result/${attemptId}`);
            result = response.result;
        } catch (error) {
            resultBody.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3 class="empty-state-title">Result not found</h3>
                    <a href="./dashboard.html" class="btn btn-primary mt-4">Go to Dashboard</a>
                </div>`;
            return;
        }
    }

    Store.invalidate("user:stats");

    const formatTimeTaken = (seconds) => {
        if (!seconds) return "—";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const escapeHTML = (str) => {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const renderReview = (review) => {
        if (!review || review.length === 0) return "";

        return review.map((q, index) => `
            <div class="review-item ${q.isCorrect ? "correct" : "incorrect"}">
                <p class="review-question-text">
                    ${index + 1}. ${escapeHTML(q.questionText)}
                </p>
                <div class="review-options">
                    ${["A", "B", "C", "D"].map(letter => {
                        let className = "review-option";
                        if (letter === q.correctAnswer) className += " correct-answer";
                        else if (letter === q.userAnswer && !q.isCorrect) className += " wrong-answer";
                        return `
                            <div class="${className}">
                                <strong>${letter}.</strong>
                                ${escapeHTML(q[`option${letter}`])}
                                ${letter === q.correctAnswer ? " ✅" : ""}
                                ${letter === q.userAnswer && !q.isCorrect ? " ❌" : ""}
                            </div>`;
                    }).join("")}
                </div>
                ${q.explanation ? `
                    <p class="review-explanation">
                        💡 ${escapeHTML(q.explanation)}
                    </p>` : ""}
            </div>
        `).join("");
    };

    const passed = result.passed;
    const isCertification = result.type === "certification";
    const isTimedOut = result.status === "timed-out";

    resultBody.innerHTML = `

        <!-- RESULT HERO -->
        <div class="result-hero">
            <div class="result-emoji">${passed ? "🎉" : "😔"}</div>

            <div class="result-score-circle ${passed ? "passed" : "failed"}">
                <span class="result-score-number">${result.score}%</span>
                <span class="result-score-label">Score</span>
            </div>

            <h2 class="result-status ${passed ? "passed" : "failed"}">
                ${passed ? "Congratulations! You Passed!" : "You Did Not Pass"}
            </h2>

            <p class="result-course">${result.courseTitle}</p>

            ${isTimedOut ? `
                <div class="badge badge-error" style="margin-bottom: var(--space-4);">
                    ⏱ Exam was auto-submitted (time expired or tab switch)
                </div>` : ""}

            <div class="result-stats-row">
                <div class="result-stat">
                    <p class="result-stat-value">${result.correct}</p>
                    <p class="result-stat-label">Correct</p>
                </div>
                <div class="result-stat">
                    <p class="result-stat-value">${result.total - result.correct}</p>
                    <p class="result-stat-label">Incorrect</p>
                </div>
                <div class="result-stat">
                    <p class="result-stat-value">${result.total}</p>
                    <p class="result-stat-label">Total</p>
                </div>
                <div class="result-stat">
                    <p class="result-stat-value">${result.passMark}%</p>
                    <p class="result-stat-label">Pass Mark</p>
                </div>
                <div class="result-stat">
                    <p class="result-stat-value">${formatTimeTaken(result.timeTaken)}</p>
                    <p class="result-stat-label">Time Taken</p>
                </div>
            </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display: flex; gap: var(--space-4); justify-content: center;
            margin-bottom: var(--space-8); flex-wrap: wrap;">

            ${passed && isCertification ? `
                <button id="getCertBtn" class="btn btn-accent btn-lg">
                    🏆 Get Your Certificate
                </button>` : ""}

            ${!passed && isCertification ? `
                <a href="./payment.html?id=${result.courseId}"
                   class="btn btn-primary btn-lg">
                    🔄 Retake Exam
                </a>` : ""}

            ${result.type === "practice" ? `
                <a href="./exam.html?id=${result.courseId}&type=practice"
                   class="btn btn-primary btn-lg">
                    🔄 Try Again
                </a>` : ""}

            <a href="./courses.html" class="btn btn-outline btn-lg">
                📚 Back to Courses
            </a>

            <a href="./dashboard.html" class="btn btn-ghost btn-lg">
                🏠 Dashboard
            </a>
        </div>

        <!-- PASSED CERTIFICATION — ready notice -->
        ${passed && isCertification ? `
            <div style="
                background: var(--color-surface);
                border: 1px solid var(--color-success);
                border-radius: var(--radius-lg);
                padding: var(--space-6);
                margin-bottom: var(--space-8);
                text-align: center;
            ">
                <p style="font-size: var(--text-base); font-weight: var(--font-semibold);
                    color: var(--color-success); margin-bottom: var(--space-2);">
                    🎓 You passed! Your certificate is ready.
                </p>
                <p style="font-size: var(--text-sm); color: var(--color-text-muted);">
                    Click "Get Your Certificate" above to generate and download it — no additional payment required.
                </p>
            </div>
        ` : ""}

        <!-- FAILED CERTIFICATION — retry notice -->
        ${!passed && isCertification ? `
            <div style="
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-6);
                margin-bottom: var(--space-8);
                text-align: center;
            ">
                <p style="font-size: var(--text-sm); color: var(--color-text-muted);">
                    Each certification attempt requires its own exam fee. Click "Retake Exam" to pay for another sitting.
                </p>
            </div>
        ` : ""}

        <!-- REVIEW SECTION -->
        ${result.review && result.review.length > 0 ? `
            <div class="section-header mb-6">
                <h2 class="section-title">Review Your Answers</h2>
                <span class="badge ${passed ? "badge-success" : "badge-error"}">
                    ${result.correct}/${result.total} correct
                </span>
            </div>
            <div class="review-list">
                ${renderReview(result.review)}
            </div>
        ` : ""}
    `;

    // ── GET CERTIFICATE — generate directly, payment already made pre-attempt ──
    if (passed && isCertification) {
        const getCertBtn = document.getElementById("getCertBtn");
        getCertBtn.addEventListener("click", async () => {
            getCertBtn.disabled = true;
            getCertBtn.textContent = "Generating your certificate...";

            try {
                const response = await api.post("/certificates/generate", {
                    attemptId: result.attemptId
                });

                Store.invalidate("user:certificates");
                window.location.href = `./certificate.html?id=${response.certificate._id}`;

            } catch (error) {
                Utils.toast(error.message, "error");
                getCertBtn.disabled = false;
                getCertBtn.textContent = "🏆 Get Your Certificate";
            }
        });
    }

};

init();
