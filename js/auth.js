const Auth = {

    getToken: () => sessionStorage.getItem("kb_token"),

    getUser: () => {
        const user = sessionStorage.getItem("kb_user");
        return user ? JSON.parse(user) : null;
    },

    setSession: (token, user) => {
        sessionStorage.setItem("kb_token", token);
        sessionStorage.setItem("kb_user", JSON.stringify(user));
        localStorage.setItem("kb_persist_token", token);
    },

    clearSession: () => {
        sessionStorage.removeItem("kb_token");
        sessionStorage.removeItem("kb_user");
        localStorage.removeItem("kb_persist_token");
    },

    isLoggedIn: () => !!sessionStorage.getItem("kb_token"),

    isAdmin: () => {
        const user = Auth.getUser();
        return user && user.role === "admin";
    },

    restoreSession: async () => {
        console.log("sessionStorage token:", sessionStorage.getItem("kb_token"));
        console.log("localStorage persist token:", localStorage.getItem("kb_persist_token"));

        if (sessionStorage.getItem("kb_token")) return true;

        const persistedToken = localStorage.getItem("kb_persist_token");
        if (!persistedToken) return false;

        console.log("Calling /auth/me with token:", persistedToken);

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${persistedToken}`
                }
            });

            console.log("me response status:", response.status);

            if (!response.ok) {
                localStorage.removeItem("kb_persist_token");
                return false;
            }

            const data = await response.json();
            sessionStorage.setItem("kb_token", data.token);
            sessionStorage.setItem("kb_user", JSON.stringify(data.user));

            return true;

        } catch (error) {
            console.error("Session restore failed:", error);
            localStorage.removeItem("kb_persist_token");
            return false;
        }
    },

    requireAuth: () => {
        if (!Auth.isLoggedIn()) {
            window.location.href = "/pages/login.html";
            return false;
        }
        return true;
    },

    requireAdmin: () => {
        if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
            window.location.href = "/pages/login.html";
            return false;
        }
        return true;
    },

    logout: () => {
        if (typeof Store !== "undefined") Store.invalidateAll();
        Auth.clearSession();
        window.location.href = "/pages/login.html";
    }
};