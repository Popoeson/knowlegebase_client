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

    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        sidebarOverlay.classList.toggle("active");
    });
    sidebarOverlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("active");
    });

    const updateThemeIcon = () => {
        const theme = document.documentElement.getAttribute("data-theme");
        themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    };
    themeToggle.addEventListener("click", () => {
        Utils.toggleTheme();
        updateThemeIcon();
    });
    updateThemeIcon();

    const defaultAvatar = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="60%" height="60%">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;

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

    // ── TAB SWITCHING ──
    const tabs = document.querySelectorAll(".analytics-tab");
    const panels = document.querySelectorAll(".analytics-panel");
    let feedLoadedOnce = false;

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");

            if (tab.dataset.tab === "feed" && !feedLoadedOnce) {
                feedLoadedOnce = true;
                loadFeed();
            }
        });
    });

    // ── EVENT LABEL MAP ──
    const EVENT_LABELS = {
        user_registered: { label: "Registered", icon: "🆕", dot: "" },
        registration_payment_initialized: { label: "Reg. Payment Started", icon: "💳", dot: "" },
        registration_payment_verified: { label: "Registration Paid", icon: "✅", dot: "success" },
        login_success: { label: "Logged In", icon: "🔓", dot: "success" },
        login_failed: { label: "Login Failed", icon: "🔒", dot: "error" },
        password_changed: { label: "Password Changed", icon: "🔑", dot: "warning" },
        password_reset_requested: { label: "Password Reset Requested", icon: "✉️", dot: "" },
        password_reset_completed: { label: "Password Reset", icon: "🔑", dot: "warning" },
        otp_resent: { label: "OTP Resent", icon: "✉️", dot: "" },
        exam_started: { label: "Exam Started", icon: "📝", dot: "" },
        exam_passed: { label: "Exam Passed", icon: "🎉", dot: "success" },
        exam_failed: { label: "Exam Failed", icon: "❌", dot: "error" },
        exam_timed_out: { label: "Exam Timed Out", icon: "⏱️", dot: "warning" },
        certificate_generated: { label: "Certificate Generated", icon: "🏆", dot: "success" },
        certificate_payment_initialized: { label: "Exam Payment Started", icon: "💳", dot: "" },
        certificate_payment_verified: { label: "Exam Payment Verified", icon: "✅", dot: "success" }
    };

    const eventMeta = (event) => EVENT_LABELS[event] || { label: event, icon: "•", dot: "" };

    // ── FUNNEL RENDER ──
    const renderFunnel = (containerId, steps) => {
        const container = document.getElementById(containerId);
        const maxValue = Math.max(...steps.map(s => s.value), 1);

        container.innerHTML = steps.map(step => `
            <div class="funnel-step">
                <span class="funnel-step-label">${step.label}</span>
                <div class="funnel-step-bar-track">
                    <div class="funnel-step-bar-fill" style="width: ${Math.max((step.value / maxValue) * 100, step.value > 0 ? 8 : 0)}%;">
                        <span class="funnel-step-value">${step.value}</span>
                    </div>
                </div>
            </div>
        `).join("");

        const first = steps[0]?.value || 0;
        const last = steps[steps.length - 1]?.value || 0;
        const rate = first > 0 ? Math.round((last / first) * 100) : 0;

        container.insertAdjacentHTML("beforeend", `
            <div class="funnel-conversion">
                Overall conversion: <strong>${rate}%</strong> (${last} of ${first})
            </div>
        `);
    };

    // ── COURSE OUTCOMES RENDER ──
    const renderCourseOutcomes = (courseOutcomes) => {
        const container = document.getElementById("courseOutcomes");
        const courses = Object.keys(courseOutcomes);

        if (courses.length === 0) {
            container.innerHTML = `<p class="text-center text-muted" style="padding: var(--space-6) 0;">No certification exam activity in the last 30 days.</p>`;
            return;
        }

        container.innerHTML = courses.map(course => {
            const o = courseOutcomes[course];
            const total = o.passed + o.failed + o.timedOut || 1;
            return `
                <div class="outcome-row">
                    <span class="outcome-course-name" title="${course}">${course}</span>
                    <div class="outcome-bar">
                        <div class="outcome-bar-segment passed" style="width: ${(o.passed / total) * 100}%"></div>
                        <div class="outcome-bar-segment failed" style="width: ${(o.failed / total) * 100}%"></div>
                        <div class="outcome-bar-segment timedOut" style="width: ${(o.timedOut / total) * 100}%"></div>
                    </div>
                    <div class="outcome-legend">
                        <span class="outcome-legend-item"><span class="outcome-legend-dot passed"></span>${o.passed}</span>
                        <span class="outcome-legend-item"><span class="outcome-legend-dot failed"></span>${o.failed}</span>
                        <span class="outcome-legend-item"><span class="outcome-legend-dot timedOut"></span>${o.timedOut}</span>
                    </div>
                </div>
            `;
        }).join("");
    };

    // ── DIFFICULTY SIGNALS RENDER ──
    const renderSignalList = (containerId, items, renderItem, emptyText) => {
        const container = document.getElementById(containerId);
        if (!items || items.length === 0) {
            container.innerHTML = `<p class="signal-empty">${emptyText}</p>`;
            return;
        }
        container.innerHTML = items.map(renderItem).join("");
    };

    // ── LOAD OVERVIEW ──
    const loadOverview = async () => {
        try {
            const data = await api.get("/activity/stats");

            renderFunnel("registrationFunnel", [
                { label: "Registered", value: data.funnel.registered },
                { label: "Activated", value: data.funnel.activated }
            ]);

            renderFunnel("paymentFunnel", [
                { label: "Started", value: data.funnel.certPaymentInitialized },
                { label: "Completed", value: data.funnel.certPaymentVerified }
            ]);

            renderCourseOutcomes(data.courseOutcomes);

            renderSignalList("signalFailedLogins", data.difficultySignals.repeatedFailedLogins,
                item => `
                    <div class="signal-item">
                        <div>
                            <div class="signal-item-main">${item._id || "Unknown"}</div>
                            <div class="signal-item-sub">failed login attempts</div>
                        </div>
                        <span class="signal-item-count">${item.count}</span>
                    </div>
                `,
                "No accounts with repeated failed logins."
            );

            renderSignalList("signalExamFailures", data.difficultySignals.repeatedExamFailures,
                item => `
                    <div class="signal-item">
                        <div>
                            <div class="signal-item-main">${item._id.course || "Unknown course"}</div>
                            <div class="signal-item-sub">failed attempts by same user</div>
                        </div>
                        <span class="signal-item-count">${item.count}</span>
                    </div>
                `,
                "No users with repeated exam failures."
            );

            renderSignalList("signalAbandonedPayments", data.difficultySignals.abandonedPayments,
                item => `
                    <div class="signal-item">
                        <div>
                            <div class="signal-item-main">Started payment ${item.initialized}×</div>
                            <div class="signal-item-sub">never completed</div>
                        </div>
                        <span class="signal-item-count">⚠️</span>
                    </div>
                `,
                "No users with abandoned payments."
            );

        } catch (error) {
            Utils.toast(error.message || "Failed to load analytics", "error");
        }
    };

    // ── ACTIVITY FEED ──
    let feedPage = 1;
    const feedLimit = 25;

    const loadFeed = async () => {
        const feedTable = document.getElementById("feedTable");
        feedTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Loading...</td></tr>`;

        try {
            const search = document.getElementById("feedSearch").value.trim();
            const event = document.getElementById("feedEventFilter").value;

            const params = new URLSearchParams({ page: feedPage, limit: feedLimit });
            if (search) params.set("search", search);
            if (event) params.set("event", event);

            const data = await api.get(`/activity/feed?${params.toString()}`);

            if (data.entries.length === 0) {
                feedTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No matching activity found</td></tr>`;
            } else {
                feedTable.innerHTML = data.entries.map(entry => {
                    const meta = eventMeta(entry.event);
                    const userName = entry.user
                        ? `${entry.user.firstName || ""} ${entry.user.surname || ""}`.trim()
                        : (entry.email || "—");

                    return `
                        <tr>
                            <td><span class="feed-event-icon">${meta.icon}</span> ${meta.label}</td>
                            <td>
                                ${entry.user
                                    ? `<button class="feed-user-link" data-user-id="${entry.user._id}">${userName}</button>`
                                    : `<span class="text-muted">${entry.email || "—"}</span>`}
                            </td>
                            <td class="text-muted" style="font-size: var(--text-xs);">${formatMetadata(entry.event, entry.metadata)}</td>
                            <td class="text-muted" style="font-size: var(--text-xs);">${Utils.formatDate(entry.createdAt)}</td>
                        </tr>
                    `;
                }).join("");

                document.querySelectorAll(".feed-user-link").forEach(btn => {
                    btn.addEventListener("click", () => openUserTimeline(btn.dataset.userId));
                });
            }

            const totalPages = Math.max(Math.ceil(data.total / feedLimit), 1);
            document.getElementById("feedPageInfo").textContent = `Page ${feedPage} of ${totalPages} · ${data.total} total`;
            document.getElementById("feedPrevBtn").disabled = feedPage <= 1;
            document.getElementById("feedNextBtn").disabled = feedPage >= totalPages;

        } catch (error) {
            feedTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Failed to load activity feed</td></tr>`;
        }
    };

    const formatMetadata = (event, metadata) => {
        if (!metadata) return "—";
        if (metadata.courseTitle) return metadata.courseTitle + (metadata.score !== undefined ? ` — ${metadata.score}%` : "");
        if (metadata.reason) return metadata.reason.replace(/_/g, " ");
        if (metadata.amountNGN) return `₦${Number(metadata.amountNGN).toLocaleString("en-NG")}`;
        return "—";
    };

    document.getElementById("feedSearch").addEventListener("input", debounce(() => {
        feedPage = 1;
        loadFeed();
    }, 400));

    document.getElementById("feedEventFilter").addEventListener("change", () => {
        feedPage = 1;
        loadFeed();
    });

    document.getElementById("feedPrevBtn").addEventListener("click", () => {
        if (feedPage > 1) { feedPage--; loadFeed(); }
    });
    document.getElementById("feedNextBtn").addEventListener("click", () => {
        feedPage++;
        loadFeed();
    });

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    // ── USER TIMELINE PANEL ──
    const timelineOverlay = document.getElementById("timelineOverlay");

    const openUserTimeline = async (userId) => {
        timelineOverlay.classList.remove("hidden");
        document.getElementById("timelineEntries").innerHTML = `<p class="text-center text-muted">Loading...</p>`;

        try {
            const data = await api.get(`/activity/user/${userId}`);

            document.getElementById("timelineUserName").textContent =
                `${data.user.firstName || ""} ${data.user.surname || ""}`.trim() || "Unknown user";
            document.getElementById("timelineUserEmail").textContent = data.user.email || "";

            const entries = document.getElementById("timelineEntries");
            if (data.entries.length === 0) {
                entries.innerHTML = `<p class="text-muted">No recorded activity for this user yet.</p>`;
                return;
            }

            entries.innerHTML = data.entries.map(entry => {
                const meta = eventMeta(entry.event);
                return `
                    <div class="timeline-entry">
                        <div class="timeline-dot ${meta.dot}"></div>
                        <div class="timeline-content">
                            <div class="timeline-event-label">${meta.icon} ${meta.label}</div>
                            <div class="timeline-event-time">${Utils.formatDate(entry.createdAt)}</div>
                        </div>
                    </div>
                `;
            }).join("");

        } catch (error) {
            document.getElementById("timelineEntries").innerHTML = `<p class="text-muted">Failed to load this user's activity.</p>`;
        }
    };

    document.getElementById("closeTimelineBtn").addEventListener("click", () => {
        timelineOverlay.classList.add("hidden");
    });
    timelineOverlay.addEventListener("click", (e) => {
        if (e.target === timelineOverlay) timelineOverlay.classList.add("hidden");
    });

    await loadOverview();

};

init();