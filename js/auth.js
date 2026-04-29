const Auth = {
    getToken: () => localStorage.getItem("kb_token"),

    getUser: () => {
        const user = localStorage.getItem("kb_user");
        return user ? JSON.parse(user) : null;
    },

    setSession: (token, user) => {
        localStorage.setItem("kb_token", token);
        localStorage.setItem("kb_user", JSON.stringify(user));
    },

    clearSession: () => {
        localStorage.removeItem("kb_token");
        localStorage.removeItem("kb_user");
    },

    isLoggedIn: () => !!localStorage.getItem("kb_token"),

    isAdmin: () => {
        const user = Auth.getUser();
        return user && user.role === "admin";
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
        Auth.clearSession();
        window.location.href = "/pages/login.html";
    }
};