const api = {
    request: async (endpoint, options = {}) => {
        // Read from sessionStorage 
        const token = sessionStorage.getItem("kb_token");

        const headers = {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            // Registration payment required — redirect to payment page
            if (response.status === 402) {
                window.location.href = "/pages/registration-payment.html";
                return;
            }

// Unauthorized — token invalid or expired, force logout
if (response.status === 401) {
    console.error("401 intercepted by api.js — url:", `${CONFIG.API_BASE_URL}${endpoint}`);
    sessionStorage.removeItem("kb_token");
    sessionStorage.removeItem("kb_user");
    localStorage.removeItem("kb_persist_token");
    window.location.href = "/pages/login.html";
    return;
}

            // Unauthorized — token invalid or expired, force logout
            if (response.status === 401) {
                sessionStorage.removeItem("kb_token");
                sessionStorage.removeItem("kb_user");
                localStorage.removeItem("kb_persist_token");
                window.location.href = "/pages/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            return data;

        } catch (error) {
            throw error;
        }
    },

    get: (endpoint) => api.request(endpoint, { method: "GET" }),

    post: (endpoint, body) => api.request(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
    }),

    put: (endpoint, body) => api.request(endpoint, {
        method: "PUT",
        body: JSON.stringify(body)
    }),

    delete: (endpoint) => api.request(endpoint, { method: "DELETE" })
};