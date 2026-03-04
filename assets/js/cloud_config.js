// Optional cloud leaderboard config (Supabase).
// Keep empty to run in local-only mode.
(function () {
    "use strict";

    window.CLOUD_CONFIG = window.CLOUD_CONFIG || {
        supabaseUrl: "https://gbyerkhgzeykwzxuoknj.supabase.co",
        supabaseAnonKey: "sb_publishable_BNqrdoDuc6SeBaTlGzWgSw_gRJOyWHK",
        table: "airplane_scores",
        autoRefreshMs: 30000
    };
})();
