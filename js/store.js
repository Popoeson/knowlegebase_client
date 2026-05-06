// Client-side session store
// Data lives in memory only — cleared on tab close or logout
// Nothing touches localStorage for security

const Store = (() => {
    const _cache = {};

    // Store data with a TTL in minutes (0 = never expires until invalidated)
    function set(key, data, ttlMinutes = 0) {
        _cache[key] = {
            data,
            expiresAt: ttlMinutes > 0 ? Date.now() + ttlMinutes * 60 * 1000 : null
        };
    }

    // Retrieve data — returns null if missing or expired
    function get(key) {
        const entry = _cache[key];
        if (!entry) {
            console.log(`[Store MISS] ${key}`);
            return null;
        }
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            delete _cache[key];
            console.log(`[Store EXPIRED] ${key}`);
            return null;
        }
        console.log(`[Store HIT] ${key}`);
        return entry.data;
    }

    // Remove a specific key
    function invalidate(key) {
        delete _cache[key];
    }

    // Clear everything — call on logout
    function invalidateAll() {
        Object.keys(_cache).forEach(k => delete _cache[k]);
    }

    // Called once after login — fetches all shared data in parallel
    async function prefetch() {
        try {
            const [profileRes, coursesRes, categoriesRes] = await Promise.all([
                api.get("/user/profile"),
                api.get("/courses"),
                api.get("/courses/categories")
            ]);

            if (profileRes.user) set("user:profile", profileRes.user, 0);
            if (coursesRes.courses) set("courses:all", coursesRes.courses, 10);
            if (categoriesRes.categories) set("categories:all", categoriesRes.categories, 30);

        } catch (err) {
            console.warn("Store prefetch failed:", err.message);
        }
    }

    return { set, get, invalidate, invalidateAll, prefetch };
})();