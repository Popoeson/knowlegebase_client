Utils.initTheme();

const init = async () => {

    if (!Auth.isLoggedIn()) {
        window.location.href = "./login.html";
        return;
    }

    const resultBody = document.getElementById("resultBody");

    // ── GET RESULT FROM SESSION OR URL ──
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

    // ── FORMAT TIME ──
    const formatTimeTaken = (seconds) => {
        if (!seconds) return "—";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    // ── RENDER REVIEW QUESTIONS ──
    const renderReview = (review) => {
        if (!review || review.length === 0) return "";

        return review.map((q, index) => `
            <div class="review-item ${q.isCorrect ? "correct" : "incorrect"}">
                <p class="review-question-text">
                    ${index + 1}. ${q.questionText}
                </p>

                <div class="review-options">
                    ${["A", "B", "C", "D"].map(letter => {
                        let className = "review-option";
                        if (letter === q.correctAnswer) className += " correct-answer";
                        else if (letter === q.userAnswer && !q.isCorrect) className += " wrong-answer";

                        return `
                            <div class="${className}">
                                <strong>${letter}.</strong>
                                ${q[`option${letter}`]}
                                ${letter === q.correctAnswer ? " ✅" : ""}
                                ${letter === q.userAnswer && !q.isCorrect ? " ❌" : ""}
                            </div>`;
                    }).join("")}
                </div>

                ${q.explanation ? `
                    <p class="review-explanation">
                        💡 ${q.explanation}
                    </p>` : ""}
            </div>
        `).join("");
    };

    // ── RENDER RESULT ──
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
        <div style="display: flex; gap: var(--space-4); justify-content: center; margin-bottom: var(--space-8); flex-wrap: wrap;">
            ${passed && isCertification ? `
                <a href="./certificate.html?courseId=${result.courseId}&attemptId=${result.attemptId}"
                   class="btn btn-accent btn-lg">
                    🏆 Get Your Certificate
                </a>` : ""}

            ${!passed && isCertification ? `
                <a href="./payment.html?id=${result.courseId}"
                   class="btn btn-primary btn-lg">
                    🔄 Retry Exam
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

};

init();