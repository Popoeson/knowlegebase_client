const api = {
    request: async (endpoint, options = {}) => {
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

            // Registration payment required
            if (response.status === 402) {
                window.location.href = "/pages/registration-payment.html";
                return;
            }

            // Unauthorized
            if (response.status === 401) {
                const existingToken = sessionStorage.getItem("kb_token");
                if (existingToken) {
                    // Session expired — clear and redirect
                    sessionStorage.removeItem("kb_token");
                    sessionStorage.removeItem("kb_user");
                    localStorage.removeItem("kb_persist_token");
                    window.location.href = "/pages/login.html";
                    return;
                }
                // No existing session — throw error message to caller
                throw new Error(data.message || "Invalid credentials");
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