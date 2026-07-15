// Same file, same content on both the main and staging branches — which
// backend/keys to use is decided at runtime from the hostname, not by
// hand-editing this file per branch. This avoids ever accidentally merging
// a staging config into production (or vice versa).
const isProduction = ["www.asodem.com", "asodem.com"].includes(window.location.hostname);

const CONFIG = isProduction
    ? {
        API_BASE_URL: "https://knowlegebase-server.onrender.com/api",
        PAYSTACK_PUBLIC_KEY: "pk_live_9ea850872c6c1053cbf1530b95c65bdf4535048d"
    }
    : {
        API_BASE_URL: "https://asodem.onrender.com/api",
        PAYSTACK_PUBLIC_KEY: "pk_test_72e7641a30dcdbad32a51606354065cc5b62f20f"
    };
