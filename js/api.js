const api = {
    request: async (endpoint, options = {}) => {
        const token = localStorage.getItem("kb_token");

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