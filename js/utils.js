const Utils = {
    // Toast notifications
    toast: (message, type = "info", duration = 4000) => {
        let container = document.querySelector(".toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-message">${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = `slideIn ${getComputedStyle(document.documentElement)
                .getPropertyValue('--transition-base')} ease reverse`;
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Format date
    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    },

    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN"
        }).format(amount);
    },

    // Truncate text
    truncate: (text, length = 100) => {
        return text.length > length ? text.substring(0, length) + "..." : text;
    },

    // Show/hide page loader
    showLoader: () => {
        let loader = document.querySelector(".page-loader");
        if (!loader) {
            loader = document.createElement("div");
            loader.className = "page-loader";
            loader.innerHTML = `<div class="spinner"></div>`;
            document.body.appendChild(loader);
        }
        loader.classList.remove("hidden");
    },

    hideLoader: () => {
        const loader = document.querySelector(".page-loader");
        if (loader) loader.classList.add("hidden");
    },

    // Dark mode toggle
    initTheme: () => {
        const saved = localStorage.getItem("kb_theme") || "light";
        document.documentElement.setAttribute("data-theme", saved);
    },

    toggleTheme: () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("kb_theme", next);
    },

    // Generate initials for avatar
    getInitials: (name) => {
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    }
};