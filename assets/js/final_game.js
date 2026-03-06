(function () {
    "use strict";

    const CONFIG = {
        width: 420,
        height: 720,
        maxLives: 3,
        playerSpeed: 350,
        bulletSpeed: 830,
        enemyBulletSpeed: 265,
        baseFireCooldown: 0.14,
        spawnBase: 0.92,
        spawnMin: 0.25,
        spawnRampPerSecond: 0.0055,
        pickupBaseInterval: 9.2,
        pickupMinInterval: 5.0,
        pickupRampPerSecond: 0.01,
        bombCooldownSeconds: 8,
        weaponDuration: 12,
        laserTick: 0.065,
        hitInvincibleSeconds: 1.15,
        storageKey: "plane-war-remaster-best-score",
        profileStorageKey: "plane-war-remaster-profiles-v1",
        bgmVolume: 0.35,
        sfxVolume: 0.65
    };

    const ASSETS = {
        player: "assets/images/player.png",
        enemyRed: "assets/images/enemy-red.png",
        enemyGreen: "assets/images/enemy-green.png",
        enemyBlack: "assets/images/enemy-black.png",
        enemyScout1: "assets/images/enemy-scout-1.png",
        enemyScout2: "assets/images/enemy-scout-2.png",
        enemyElite: "assets/images/enemy-elite.png",
        enemyAce: "assets/images/enemy-ace.png",
        enemyDestroyer: "assets/images/enemy-destroyer.png",
        meteor1: "assets/images/meteor-1.png",
        meteor2: "assets/images/meteor-2.png",
        bullet: "assets/images/bullet.png",
        enemyBullet: "assets/images/enemy-bullet.png",
        missilePlayer: "assets/images/missile-player.png",
        missileEnemy: "assets/images/missile-enemy.png",
        pickupLaser: "assets/images/pickup-laser.png",
        backgroundTile: "assets/images/background-tile.png",
        life: "assets/images/life.png",
        explosion1: "assets/images/explosion-1.png",
        explosion2: "assets/images/explosion-2.png",
        explosion3: "assets/images/explosion-3.png",
        explosion4: "assets/images/explosion-4.png",
        explosion5: "assets/images/explosion-5.png",
        explosion6: "assets/images/explosion-6.png",
        explosion7: "assets/images/explosion-7.png",
        explosion8: "assets/images/explosion-8.png",
        explosion9: "assets/images/explosion-9.png"
    };

    const AUDIO_ASSETS = {
        bgm: "assets/audio/bgm-out-there.ogg",
        shoot: "assets/audio/sfx-shoot.ogg",
        enemyShoot: "assets/audio/sfx-enemy-shoot.ogg",
        explosion: "assets/audio/sfx-explosion.ogg",
        hit: "assets/audio/sfx-hit.ogg",
        playerHit: "assets/audio/sfx-player-hit.ogg",
        start: "assets/audio/sfx-start.ogg"
    };

    const EXPLOSION_FRAMES = [
        "explosion1",
        "explosion2",
        "explosion3",
        "explosion4",
        "explosion5",
        "explosion6",
        "explosion7",
        "explosion8",
        "explosion9"
    ];

    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");

    const scoreEl = document.getElementById("score");
    const comboEl = document.getElementById("combo");
    const livesEl = document.getElementById("lives");
    const bestEl = document.getElementById("best");
    const weaponEl = document.getElementById("weapon");
    const weaponTimerEl = document.getElementById("weapon-timer");

    const startOverlay = document.getElementById("start-overlay");
    const gameoverOverlay = document.getElementById("gameover-overlay");
    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const finalScoreEl = document.getElementById("final-score");
    const finalBestEl = document.getElementById("final-best");
    const pausePill = document.getElementById("pause-pill");
    const loadingEl = document.getElementById("loading");
    const audioToggleBtn = document.getElementById("audio-toggle");
    const pauseToggleBtn = document.getElementById("pause-toggle");
    const hudEl = document.getElementById("hud");
    const hudControlsEl = document.getElementById("hud-controls");
    const bombControlEl = document.getElementById("bomb-control");
    const bombToggleBtn = document.getElementById("bomb-toggle");
    const bombCdEl = document.getElementById("bomb-cd");
    const gameShell = document.getElementById("game-shell");
    const profileSelectEl = document.getElementById("profile-select");
    const profileInputEl = document.getElementById("profile-input");
    const profileSaveBtn = document.getElementById("profile-save");
    const profileMetaEl = document.getElementById("profile-meta");
    const profileHistoryEl = document.getElementById("profile-history");
    const leaderboardListEl = document.getElementById("leaderboard-list");
    const leaderboardTitleEl = document.getElementById("leaderboard-title");
    const cloudStatusEl = document.getElementById("cloud-status");
    const profileOpenBtn = document.getElementById("profile-open");
    const profileDockEl = document.getElementById("profile-dock");
    const openProfileStartBtn = document.getElementById("open-profile-start");

    const CLOUD_CONFIG = window.CLOUD_CONFIG || {};
    const CLOUD = {
        supabaseUrl: normalizeCloudUrl(CLOUD_CONFIG.supabaseUrl),
        supabaseAnonKey: String(CLOUD_CONFIG.supabaseAnonKey || "").trim(),
        table: String(CLOUD_CONFIG.table || "airplane_scores").trim() || "airplane_scores",
        refreshMs: parseCloudRefreshMs(CLOUD_CONFIG.autoRefreshMs)
    };
    const CLOUD_ENABLED = Boolean(CLOUD.supabaseUrl && CLOUD.supabaseAnonKey && CLOUD.table);

    const images = Object.create(null);
    const sounds = Object.create(null);

    const state = {
        running: false,
        paused: false,
        ready: false,
        muted: false,
        masterVolume: 1,
        hudVisible: true,
        audioBooted: false,
        lastTs: 0,
        elapsed: 0,
        bgOffset: 0,
        spawnTimer: 0,
        pickupTimer: 0,
        fireTimer: 0,
        weaponTickTimer: 0,
        bombCooldown: 0,
        score: 0,
        combo: 0,
        lives: CONFIG.maxLives,
        weaponMode: "normal",
        weaponTimer: 0,
        laserDual: false,
        cloudEnabled: CLOUD_ENABLED,
        cloudLoading: false,
        cloudSyncing: false,
        cloudError: "",
        cloudLeaderboard: [],
        cloudNextRefreshAt: 0,
        bestScore: 0,
        profiles: loadProfiles(),
        activeUser: "",
        stars: createStars(95),
        bullets: [],
        enemyBullets: [],
        enemies: [],
        pickups: [],
        particles: [],
        explosions: [],
        keys: Object.create(null),
        pointer: {
            active: false,
            down: false,
            x: CONFIG.width / 2,
            y: CONFIG.height - 120
        },
        shake: {
            time: 0,
            duration: 0,
            strength: 0
        },
        player: createPlayer()
    };

    state.activeUser = state.profiles.activeUser;
    state.bestScore = getActiveProfile().bestScore;

    function createPlayer() {
        return {
            x: CONFIG.width / 2,
            y: CONFIG.height - 110,
            w: 62,
            h: 48,
            hitRadius: 10,
            spread: 1,
            invincible: 0
        };
    }

    function createStars(count) {
        const stars = [];
        for (let i = 0; i < count; i += 1) {
            stars.push({
                x: Math.random() * CONFIG.width,
                y: Math.random() * CONFIG.height,
                size: Math.random() * 1.9 + 0.4,
                speed: Math.random() * 24 + 10,
                twinkle: Math.random() * Math.PI * 2
            });
        }
        return stars;
    }

    function loadLegacyBestScore() {
        const raw = Number.parseInt(localStorage.getItem(CONFIG.storageKey) || "0", 10);
        return Number.isFinite(raw) && raw > 0 ? raw : 0;
    }

    function normalizeUserName(raw) {
        return String(raw || "").replace(/\s+/g, " ").trim().slice(0, 16);
    }

    function normalizeCloudUrl(raw) {
        return String(raw || "").trim().replace(/\/+$/, "");
    }

    function parseCloudRefreshMs(raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 8000) {
            return Math.floor(n);
        }
        return 30000;
    }

    function loadProfiles() {
        const legacyBest = loadLegacyBestScore();
        const fallbackName = "Pilot";
        const raw = localStorage.getItem(CONFIG.profileStorageKey);
        if (!raw) {
            return {
                activeUser: fallbackName,
                users: {
                    [fallbackName]: {
                        bestScore: legacyBest,
                        records: []
                    }
                }
            };
        }

        try {
            const parsed = JSON.parse(raw);
            return sanitizeProfiles(parsed, legacyBest, fallbackName);
        } catch (_err) {
            return {
                activeUser: fallbackName,
                users: {
                    [fallbackName]: {
                        bestScore: legacyBest,
                        records: []
                    }
                }
            };
        }
    }

    function sanitizeProfiles(source, legacyBest, fallbackName) {
        const users = Object.create(null);
        if (source && typeof source.users === "object" && source.users) {
            for (const [rawName, rawProfile] of Object.entries(source.users)) {
                const name = normalizeUserName(rawName);
                if (!name) continue;

                const bestRaw = Number(rawProfile && rawProfile.bestScore);
                const bestScore = Number.isFinite(bestRaw) && bestRaw > 0 ? Math.floor(bestRaw) : 0;
                const records = Array.isArray(rawProfile && rawProfile.records)
                    ? rawProfile.records
                        .map((it) => {
                            const score = Number(it && it.score);
                            const ts = Number(it && it.ts);
                            return {
                                score: Number.isFinite(score) && score > 0 ? Math.floor(score) : 0,
                                ts: Number.isFinite(ts) && ts > 0 ? Math.floor(ts) : Date.now()
                            };
                        })
                        .filter((it) => it.score > 0)
                        .slice(0, 20)
                    : [];

                users[name] = { bestScore, records };
            }
        }

        const names = Object.keys(users);
        if (names.length === 0) {
            users[fallbackName] = { bestScore: legacyBest, records: [] };
        } else if (legacyBest > 0) {
            let merged = false;
            for (const name of names) {
                if (users[name].bestScore >= legacyBest) {
                    merged = true;
                    break;
                }
            }
            if (!merged) {
                if (!users[fallbackName]) {
                    users[fallbackName] = { bestScore: legacyBest, records: [] };
                } else {
                    users[fallbackName].bestScore = Math.max(users[fallbackName].bestScore, legacyBest);
                }
            }
        }

        let activeUser = normalizeUserName(source && source.activeUser);
        if (!activeUser || !users[activeUser]) {
            activeUser = Object.keys(users)[0];
        }

        return { activeUser, users };
    }

    function saveProfiles() {
        if (!state.profiles) return;
        localStorage.setItem(
            CONFIG.profileStorageKey,
            JSON.stringify({
                activeUser: state.activeUser,
                users: state.profiles.users
            })
        );
    }

    function ensureUser(name) {
        const safeName = normalizeUserName(name);
        if (!safeName) return "";
        if (!state.profiles.users[safeName]) {
            state.profiles.users[safeName] = {
                bestScore: 0,
                records: []
            };
        }
        return safeName;
    }

    function getActiveProfile() {
        const active = ensureUser(state.activeUser || "Pilot");
        if (!active) {
            state.activeUser = "Pilot";
            ensureUser(state.activeUser);
            return state.profiles.users[state.activeUser];
        }

        state.activeUser = active;
        return state.profiles.users[state.activeUser];
    }

    function setActiveUser(name) {
        const safeName = ensureUser(name);
        if (!safeName) return;
        state.activeUser = safeName;
        state.profiles.activeUser = safeName;
        state.bestScore = getActiveProfile().bestScore;
        saveProfiles();
        updateProfilePanel();
        updateLeaderboardPanel();
        updateHud();
        if (state.cloudEnabled) {
            void syncCloudBestForUser(safeName);
            void refreshCloudLeaderboard(true);
        }
    }

    function pushProfileRecord(score) {
        const profile = getActiveProfile();
        if (score > 0) {
            profile.records.unshift({
                score,
                ts: Date.now()
            });
            if (profile.records.length > 20) {
                profile.records.length = 20;
            }
        }

        if (score > profile.bestScore) {
            profile.bestScore = score;
        }

        state.bestScore = profile.bestScore;
        state.profiles.activeUser = state.activeUser;
        saveProfiles();
        updateProfilePanel();
        updateLeaderboardPanel();
        if (state.cloudEnabled && profile.bestScore > 0) {
            void syncCloudBestForUser(state.activeUser);
        }
    }

    function formatRecordTime(ts) {
        const d = new Date(ts);
        if (!Number.isFinite(d.getTime())) return "--";
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${mm}-${dd} ${hh}:${mi}`;
    }

    function parseBestScore(raw) {
        const score = Number(raw);
        return Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
    }

    function cloudApiUrl(query) {
        return `${CLOUD.supabaseUrl}/rest/v1/${encodeURIComponent(CLOUD.table)}${query}`;
    }

    function cloudHeaders(extra) {
        return Object.assign(
            {
                apikey: CLOUD.supabaseAnonKey,
                Authorization: `Bearer ${CLOUD.supabaseAnonKey}`
            },
            extra || {}
        );
    }

    async function fetchWithTimeout(url, options, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs || 8000);
        try {
            return await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchCloudBestForUser(name) {
        const query = `?select=username,best_score&username=eq.${encodeURIComponent(name)}&limit=1`;
        const res = await fetchWithTimeout(
            cloudApiUrl(query),
            {
                method: "GET",
                headers: cloudHeaders()
            },
            9000
        );

        if (!res.ok) {
            throw new Error(`cloud_read_user_${res.status}`);
        }

        const rows = await res.json();
        if (!Array.isArray(rows) || !rows.length) return 0;
        return parseBestScore(rows[0].best_score);
    }

    async function upsertCloudBestForUser(name, bestScore) {
        const payload = [
            {
                username: name,
                best_score: bestScore,
                updated_at: new Date().toISOString()
            }
        ];

        const res = await fetchWithTimeout(
            cloudApiUrl(""),
            {
                method: "POST",
                headers: cloudHeaders({
                    "Content-Type": "application/json",
                    Prefer: "resolution=merge-duplicates,return=minimal"
                }),
                body: JSON.stringify(payload)
            },
            9000
        );

        if (!res.ok) {
            throw new Error(`cloud_upsert_${res.status}`);
        }
    }

    async function fetchCloudTopLeaderboard() {
        const query = "?select=username,best_score,updated_at&order=best_score.desc,updated_at.asc&limit=10";
        const res = await fetchWithTimeout(
            cloudApiUrl(query),
            {
                method: "GET",
                headers: cloudHeaders()
            },
            9000
        );

        if (!res.ok) {
            throw new Error(`cloud_top_${res.status}`);
        }

        const rows = await res.json();
        if (!Array.isArray(rows)) return [];

        return rows
            .map((row) => {
                return {
                    name: normalizeUserName(row && row.username),
                    bestScore: parseBestScore(row && row.best_score)
                };
            })
            .filter((row) => row.name && row.bestScore > 0)
            .slice(0, 10);
    }

    async function refreshCloudLeaderboard(force) {
        if (!state.cloudEnabled) return;

        const now = Date.now();
        if (!force && now < state.cloudNextRefreshAt) return;
        state.cloudNextRefreshAt = now + CLOUD.refreshMs;
        state.cloudLoading = true;
        updateCloudStatus();

        try {
            const rows = await fetchCloudTopLeaderboard();
            state.cloudLeaderboard = rows;
            state.cloudError = "";
        } catch (err) {
            state.cloudError = err && err.message ? err.message : "cloud_refresh_failed";
        } finally {
            state.cloudLoading = false;
            updateCloudStatus();
            updateLeaderboardPanel();
        }
    }

    async function pullCloudBestForUser(name) {
        if (!state.cloudEnabled) return;
        const safeName = normalizeUserName(name);
        if (!safeName) return;

        try {
            const remoteBest = await fetchCloudBestForUser(safeName);
            if (remoteBest <= 0) return;

            ensureUser(safeName);
            const profile = state.profiles.users[safeName];
            if (!profile || remoteBest <= profile.bestScore) return;

            profile.bestScore = remoteBest;
            if (safeName === state.activeUser) {
                state.bestScore = remoteBest;
            }
            saveProfiles();
            updateProfilePanel();
            updateLeaderboardPanel();
            updateHud();
        } catch (err) {
            state.cloudError = err && err.message ? err.message : "cloud_pull_failed";
            updateCloudStatus();
        }
    }

    async function syncCloudBestForUser(name) {
        if (!state.cloudEnabled || state.cloudSyncing) return;

        const safeName = normalizeUserName(name);
        if (!safeName) return;

        ensureUser(safeName);
        const profile = state.profiles.users[safeName];
        if (!profile) return;

        state.cloudSyncing = true;
        updateCloudStatus();
        try {
            const localBest = parseBestScore(profile.bestScore);
            const remoteBest = await fetchCloudBestForUser(safeName);

            if (localBest > remoteBest) {
                await upsertCloudBestForUser(safeName, localBest);
            } else if (remoteBest > localBest) {
                profile.bestScore = remoteBest;
                if (safeName === state.activeUser) {
                    state.bestScore = remoteBest;
                }
                saveProfiles();
                updateProfilePanel();
                updateHud();
            }

            state.cloudError = "";
            await refreshCloudLeaderboard(true);
        } catch (err) {
            state.cloudError = err && err.message ? err.message : "cloud_sync_failed";
            updateCloudStatus();
        } finally {
            state.cloudSyncing = false;
            updateCloudStatus();
        }
    }

    function updateCloudStatus() {
        if (!cloudStatusEl) return;

        if (!state.cloudEnabled) {
            cloudStatusEl.textContent = "排行模式：本机（未配置云端）";
            return;
        }

        if (state.cloudLoading && state.cloudLeaderboard.length === 0) {
            cloudStatusEl.textContent = "排行模式：云端连接中...";
            return;
        }

        if (state.cloudError && state.cloudLeaderboard.length === 0) {
            cloudStatusEl.textContent = "排行模式：云端异常，已回退本机";
            return;
        }

        if (state.cloudSyncing) {
            cloudStatusEl.textContent = "排行模式：云端同步中...";
            return;
        }

        cloudStatusEl.textContent = "排行模式：云端";
    }

    function updateProfilePanel() {
        if (!profileSelectEl) return;

        const users = Object.entries(state.profiles.users)
            .sort((a, b) => b[1].bestScore - a[1].bestScore || a[0].localeCompare(b[0]));

        const current = state.activeUser || users[0][0];
        profileSelectEl.innerHTML = "";
        for (const [name] of users) {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            if (name === current) opt.selected = true;
            profileSelectEl.appendChild(opt);
        }

        const profile = getActiveProfile();
        if (profileMetaEl) {
            profileMetaEl.textContent = `当前用户: ${state.activeUser} | Best ${profile.bestScore}`;
        }

        if (profileHistoryEl) {
            if (!profile.records.length) {
                profileHistoryEl.textContent = "暂无战绩";
            } else {
                const rows = profile.records
                    .slice(0, 5)
                    .map((r) => `${r.score}  (${formatRecordTime(r.ts)})`);
                profileHistoryEl.textContent = rows.join(" | ");
            }
        }
    }

    function updateLeaderboardPanel() {
        if (!leaderboardListEl) return;

        const localRanked = Object.entries(state.profiles.users)
            .sort((a, b) => b[1].bestScore - a[1].bestScore || a[0].localeCompare(b[0]))
            .slice(0, 10)
            .map(([name, profile]) => ({
                name,
                bestScore: parseBestScore(profile && profile.bestScore)
            }))
            .filter((it) => it.bestScore > 0);

        let ranked = localRanked;
        if (state.cloudEnabled && state.cloudLeaderboard.length) {
            ranked = state.cloudLeaderboard;
        }

        if (leaderboardTitleEl) {
            if (!state.cloudEnabled) {
                leaderboardTitleEl.textContent = "排行榜（本机 Top 10）";
            } else if (state.cloudLeaderboard.length) {
                leaderboardTitleEl.textContent = "排行榜（云端 Top 10）";
            } else if (state.cloudLoading) {
                leaderboardTitleEl.textContent = "排行榜（云端加载中...）";
            } else if (state.cloudError) {
                leaderboardTitleEl.textContent = "排行榜（云端异常，显示本机）";
            } else {
                leaderboardTitleEl.textContent = "排行榜（等待云端数据）";
            }
        }

        if (!ranked.length) {
            leaderboardListEl.textContent = state.cloudEnabled ? "暂无排行（先打一局上传分数）" : "暂无排行";
            return;
        }

        leaderboardListEl.innerHTML = "";
        for (const row of ranked) {
            const li = document.createElement("li");
            const marker = row.name === state.activeUser ? " <- 当前" : "";
            li.textContent = `${row.name}: ${row.bestScore}${marker}`;
            leaderboardListEl.appendChild(li);
        }
    }

    function updateAudioButton() {
        if (!audioToggleBtn) return;
        const volumePct = Math.round(state.masterVolume * 100);
        audioToggleBtn.textContent = state.muted ? "SOUND: OFF" : `SOUND: ON ${volumePct}%`;
    }

    function updatePauseButton() {
        if (!pauseToggleBtn) return;

        if (!state.running) {
            pauseToggleBtn.textContent = "PAUSE";
            pauseToggleBtn.disabled = true;
            updateBombButton();
            return;
        }

        pauseToggleBtn.disabled = false;
        pauseToggleBtn.textContent = state.paused ? "RESUME" : "PAUSE";
        updateBombButton();
    }

    function updateBombButton() {
        if (!bombControlEl || !bombToggleBtn) return;

        const shouldShow = state.running && state.hudVisible && !state.paused;
        bombControlEl.style.display = shouldShow ? "block" : "none";
        if (!shouldShow) {
            return;
        }

        const cooldown = Math.max(0, state.bombCooldown);
        const ratio = clamp(1 - cooldown / CONFIG.bombCooldownSeconds, 0, 1);
        bombToggleBtn.style.setProperty("--bomb-ratio", String(ratio));

        const ready = cooldown <= 0.05;
        bombToggleBtn.disabled = state.paused || !ready;
        if (bombCdEl) {
            bombCdEl.textContent = ready ? "READY" : `${cooldown.toFixed(1)}s`;
        }
    }

    function setProfileDockVisible(visible) {
        if (!profileDockEl) return;
        if (visible) {
            profileDockEl.classList.add("visible");
        } else {
            profileDockEl.classList.remove("visible");
        }
        if (openProfileStartBtn) {
            openProfileStartBtn.textContent = visible ? "收起用户面板" : "用户与排行";
        }
    }

    function setBgmVolume() {
        const bgm = sounds.bgm;
        if (!bgm) return;
        bgm.volume = clamp(CONFIG.bgmVolume * state.masterVolume, 0, 1);
    }

    function adjustMasterVolume(delta) {
        state.masterVolume = clamp(state.masterVolume + delta, 0, 1);
        setBgmVolume();
        updateAudioButton();
    }

    function playSfx(name, volume, rate) {
        if (state.muted) return;
        const base = sounds[name];
        if (!base) return;

        const a = base.cloneNode(true);
        a.volume = clamp((volume || 1) * CONFIG.sfxVolume * state.masterVolume, 0, 1);
        a.playbackRate = rate || 1;
        a.currentTime = 0;
        a.play().catch(() => {});
    }

    function startBgm() {
        if (state.muted) return;
        const bgm = sounds.bgm;
        if (!bgm) return;
        bgm.loop = true;
        setBgmVolume();
        bgm.play().catch(() => {});
    }

    function stopBgm() {
        const bgm = sounds.bgm;
        if (!bgm) return;
        bgm.pause();
    }

    function toggleMute() {
        state.muted = !state.muted;
        updateAudioButton();
        if (state.muted) {
            stopBgm();
        } else if (state.running && !state.paused) {
            startBgm();
        }
    }

    function loadAssets() {
        const imageEntries = Object.entries(ASSETS);
        const audioEntries = Object.entries(AUDIO_ASSETS);
        const total = imageEntries.length + audioEntries.length;
        let loaded = 0;

        function progress(label, ok) {
            loaded += 1;
            const suffix = ok ? "" : " (fallback)";
            loadingEl.textContent = `Loading ${loaded}/${total} - ${label}${suffix}`;
        }

        const imageJobs = imageEntries.map(([key, url]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    images[key] = img;
                    progress(key, true);
                    resolve();
                };
                img.onerror = () => {
                    progress(key, false);
                    resolve();
                };
                img.src = url;
            });
        });

        const audioJobs = audioEntries.map(([key, url]) => {
            return new Promise((resolve) => {
                const audio = new Audio();
                let settled = false;

                function done(ok) {
                    if (settled) return;
                    settled = true;
                    sounds[key] = audio;
                    progress(`audio:${key}`, ok);
                    resolve();
                }

                audio.preload = "auto";
                audio.src = url;
                audio.addEventListener("canplaythrough", () => done(true), { once: true });
                audio.addEventListener("loadeddata", () => done(true), { once: true });
                audio.addEventListener("error", () => done(false), { once: true });
                setTimeout(() => done(false), 6000);
                audio.load();
            });
        });

        return Promise.all([...imageJobs, ...audioJobs]).then(() => {
            state.ready = true;
            loadingEl.style.display = "none";
            startBtn.disabled = false;
            startBtn.textContent = "开始游戏";
            updateHud();
            updateAudioButton();
            updatePauseButton();
        });
    }
    function imageUsable(name) {
        const img = images[name];
        return !!(img && img.complete && img.naturalWidth > 0);
    }

    function startGame() {
        state.running = true;
        state.paused = false;
        state.lastTs = 0;
        state.elapsed = 0;
        state.bgOffset = 0;
        state.spawnTimer = 0;
        state.pickupTimer = 0;
        state.fireTimer = 0;
        state.weaponTickTimer = 0;
        state.bombCooldown = 0;
        state.score = 0;
        state.combo = 0;
        state.lives = CONFIG.maxLives;
        state.weaponMode = "normal";
        state.weaponTimer = 0;
        state.laserDual = false;
        state.bullets = [];
        state.enemyBullets = [];
        state.enemies = [];
        state.pickups = [];
        state.particles = [];
        state.explosions = [];
        state.pointer.down = false;
        state.pointer.active = false;
        state.player = createPlayer();
        state.shake.time = 0;
        state.shake.duration = 0;
        state.shake.strength = 0;

        startOverlay.classList.add("hidden");
        gameoverOverlay.classList.add("hidden");
        pausePill.style.display = "none";
        setProfileDockVisible(false);
        updateHud();
        updatePauseButton();

        if (!state.audioBooted) {
            state.audioBooted = true;
            playSfx("start", 0.45, 1);
        }
        startBgm();
        requestAnimationFrame(loop);
    }

    function endGame() {
        state.running = false;
        state.paused = false;
        state.weaponMode = "normal";
        state.weaponTimer = 0;
        state.laserDual = false;
        state.pickups = [];
        pausePill.style.display = "none";
        stopBgm();

        pushProfileRecord(state.score);

        finalScoreEl.textContent = String(state.score);
        finalBestEl.textContent = String(state.bestScore);
        updateHud();
        updatePauseButton();
        setProfileDockVisible(false);
        gameoverOverlay.classList.remove("hidden");
    }

    function loop(ts) {
        if (!state.running) return;

        if (state.lastTs === 0) {
            state.lastTs = ts;
        }

        const dt = Math.min((ts - state.lastTs) / 1000, 0.033);
        state.lastTs = ts;

        if (!state.paused) {
            update(dt);
        }
        render();
        requestAnimationFrame(loop);
    }

    function update(dt) {
        state.elapsed += dt;
        state.bgOffset = (state.bgOffset + dt * (70 + state.elapsed * 2.5)) % 256;

        updateStars(dt);
        updatePlayer(dt);
        updateWeaponMode(dt);
        autoShoot(dt);
        spawnEnemies(dt);
        spawnPickups(dt);
        updateBullets(dt);
        updateEnemyBullets(dt);
        updateEnemies(dt);
        updatePickups(dt);
        detectCollisions();
        updateExplosions(dt);
        updateParticles(dt);
        updateShake(dt);
        state.bombCooldown = Math.max(0, state.bombCooldown - dt);
        updateHud();
    }

    function updateStars(dt) {
        for (const star of state.stars) {
            star.y += star.speed * (1 + state.elapsed * 0.015) * dt;
            star.twinkle += dt * 3;
            if (star.y > CONFIG.height + 2) {
                star.y = -2;
                star.x = Math.random() * CONFIG.width;
            }
        }
    }

    function updatePlayer(dt) {
        const player = state.player;

        let axisX = 0;
        let axisY = 0;

        if (state.keys.ArrowLeft || state.keys.KeyA) axisX -= 1;
        if (state.keys.ArrowRight || state.keys.KeyD) axisX += 1;
        if (state.keys.ArrowUp || state.keys.KeyW) axisY -= 1;
        if (state.keys.ArrowDown || state.keys.KeyS) axisY += 1;

        const usingKeyboard = axisX !== 0 || axisY !== 0;

        if (usingKeyboard) {
            const len = Math.hypot(axisX, axisY) || 1;
            player.x += (axisX / len) * CONFIG.playerSpeed * dt;
            player.y += (axisY / len) * CONFIG.playerSpeed * dt;
        } else if (state.pointer.active) {
            const ease = Math.min(1, dt * 14);
            player.x += (state.pointer.x - player.x) * ease;
            player.y += (state.pointer.y - player.y) * ease;
        }

        const halfW = player.w / 2;
        const halfH = player.h / 2;
        player.x = clamp(player.x, halfW + 6, CONFIG.width - halfW - 6);
        player.y = clamp(player.y, halfH + 12, CONFIG.height - halfH - 12);

        player.invincible = Math.max(0, player.invincible - dt);
        player.spread = Math.min(5, 1 + Math.floor(state.score / 1000));
    }

    function updateWeaponMode(dt) {
        if (state.weaponMode === "normal") {
            return;
        }

        state.weaponTimer = Math.max(0, state.weaponTimer - dt);
        if (state.weaponMode === "laser") {
            state.weaponTickTimer -= dt;
            if (state.weaponTickTimer <= 0) {
                state.weaponTickTimer += CONFIG.laserTick;
                applyLaserDamage();
            }
        }

        if (state.weaponTimer <= 0) {
            state.weaponMode = "normal";
            state.weaponTimer = 0;
            state.weaponTickTimer = 0;
        }
    }

    function setWeaponMode(mode, duration) {
        if (!["laser", "missile"].includes(mode)) {
            state.weaponMode = "normal";
            state.weaponTimer = 0;
            state.weaponTickTimer = 0;
            state.laserDual = false;
            return;
        }

        if (state.weaponMode === mode) {
            state.weaponTimer = Math.min(CONFIG.weaponDuration + 8, state.weaponTimer + duration * 0.6);
        } else {
            state.weaponMode = mode;
            state.weaponTimer = duration;
        }

        if (mode === "laser") {
            state.weaponTickTimer = 0;
        }
    }

    function applyLaserDamage() {
        if (!state.running || state.paused) return;

        const beamXs = getLaserBeamXs();
        const beamHalfWidth = 18;
        let touched = false;
        for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
            const enemy = state.enemies[i];
            if (enemy.y > state.player.y + 8) continue;

            const hitWidth = beamHalfWidth + enemy.w * (enemy.type === "meteor" ? 0.28 : 0.4);
            let hitCount = 0;
            for (const beamX of beamXs) {
                if (Math.abs(enemy.x - beamX) <= hitWidth) {
                    hitCount += 1;
                }
            }
            if (hitCount === 0) continue;

            let damage = 2.35;
            if (enemy.type === "meteor") damage = 2.05;
            if (enemy.kind === "elite") damage = 2.5;
            if (enemy.kind === "ace") damage = 2.65;
            if (enemy.kind === "destroyer") damage = 1.75;
            damage *= 1 + (hitCount - 1) * 0.42;
            enemy.hp -= damage;
            touched = true;
            if (enemy.hp <= 0) {
                destroyEnemy(i);
            }
        }

        if (touched && Math.random() < 0.3) {
            playSfx("hit", 0.12, randomRange(1.05, 1.2));
        }
    }

    function getLaserBeamXs() {
        const centerX = state.player.x;
        if (state.weaponMode !== "laser" || !state.laserDual) {
            return [centerX];
        }
        return [centerX - 28, centerX + 28];
    }

    function spawnPickups(dt) {
        if (!state.running || state.paused) return;
        if (state.pickups.length >= 2) return;

        state.pickupTimer += dt;
        const interval = Math.max(
            CONFIG.pickupMinInterval,
            CONFIG.pickupBaseInterval - state.elapsed * CONFIG.pickupRampPerSecond
        );

        if (state.pickupTimer < interval) return;
        state.pickupTimer = randomRange(-0.8, 0.8);

        const roll = Math.random();
        if (roll < 0.34) {
            spawnPickupItem("bomb");
        } else if (roll < 0.67) {
            spawnPickupItem("laser");
        } else {
            spawnPickupItem("missile");
        }
    }

    function spawnPickupItem(type) {
        state.pickups.push({
            type,
            x: randomRange(34, CONFIG.width - 34),
            y: -24,
            w: 30,
            h: 30,
            vy: randomRange(78, 125) + state.elapsed * 0.35,
            phase: Math.random() * Math.PI * 2,
            life: 15
        });
    }

    function updatePickups(dt) {
        for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
            const p = state.pickups[i];
            p.y += p.vy * dt;
            p.x += Math.sin((state.elapsed + p.phase) * 2.4) * 24 * dt;
            p.life -= dt;

            if (p.life <= 0 || p.y - p.h / 2 > CONFIG.height + 16) {
                state.pickups.splice(i, 1);
            }
        }
    }

    function applyPickup(type, x, y) {
        if (type === "bomb") {
            detonateSmartBomb();
            burst(x, y, 24, ["#ffe9c0", "#ffd67e", "#ff8e54"]);
        } else if (type === "laser") {
            state.laserDual = true;
            setWeaponMode("laser", CONFIG.weaponDuration);
            burst(x, y, 18, ["#d8f6ff", "#87e3ff", "#43c2ff"]);
        } else if (type === "missile") {
            setWeaponMode("missile", CONFIG.weaponDuration);
            burst(x, y, 18, ["#f8e8ff", "#9dd6ff", "#5ca8ff"]);
        }

        addShake(0.25, 0.15);
        playSfx("start", 0.36, randomRange(1.03, 1.16));
    }

    function updateExplosions(dt) {
        for (let i = state.explosions.length - 1; i >= 0; i -= 1) {
            const e = state.explosions[i];
            e.frameFloat += e.fps * dt;
            if (e.frameFloat >= EXPLOSION_FRAMES.length) {
                state.explosions.splice(i, 1);
            }
        }
    }

    function updateShake(dt) {
        if (state.shake.time <= 0) return;
        state.shake.time = Math.max(0, state.shake.time - dt);
        if (state.shake.time === 0) {
            state.shake.duration = 0;
            state.shake.strength = 0;
        }
    }

    function addShake(strength, duration) {
        if (strength > state.shake.strength) {
            state.shake.strength = strength;
        }
        if (duration > state.shake.time) {
            state.shake.time = duration;
            state.shake.duration = duration;
        }
    }

    function autoShoot(dt) {
        state.fireTimer -= dt;
        if (state.fireTimer > 0) return;

        const fireRatio = state.keys.Space ? 0.74 : 1;
        const originY = state.player.y - state.player.h * 0.44;

        if (state.weaponMode === "laser") {
            state.fireTimer = 0.06 * fireRatio;
            if (Math.random() < 0.35) {
                playSfx("shoot", 0.08, randomRange(1.15, 1.35));
            }
            return;
        }

        if (state.weaponMode === "missile") {
            state.fireTimer = 0.22 * fireRatio;
            const tripleFire = state.keys.Space || state.elapsed > 68 || state.score > 12000;
            const offsets = tripleFire ? [-18, 0, 18] : [-12, 12];
            const turnRate = 10.4 + Math.min(14.5, state.elapsed * 0.09 + state.score * 0.00038);
            const maxSpeed = 920 + Math.min(620, state.elapsed * 3.8 + state.score * 0.045);
            const accel = 1280 + Math.min(860, state.elapsed * 8.1 + state.score * 0.034);
            const startSpeed = Math.min(maxSpeed * 0.9, 760 + state.elapsed * 3.1);
            const baseDamage = 2.45 + Math.min(1.5, state.elapsed * 0.008 + state.score * 0.0001);

            for (const offset of offsets) {
                state.bullets.push({
                    kind: "missile",
                    x: state.player.x + offset,
                    y: originY,
                    w: 14,
                    h: 30,
                    vx: offset * 8,
                    vy: -startSpeed,
                    speed: startSpeed,
                    maxSpeed,
                    accel,
                    turnRate,
                    damage: baseDamage,
                    proximity: 28,
                    life: 4.0,
                    launchBoost: 0.28,
                    rotation: 0,
                    trailTimer: 0
                });
            }

            playSfx("shoot", 0.2, randomRange(0.9, 1.02));
            return;
        }

        const spread = state.player.spread;
        state.fireTimer = (CONFIG.baseFireCooldown * fireRatio) / (1 + (spread - 1) * 0.13);

        const angleMap = {
            1: [0],
            2: [-0.08, 0.08],
            3: [-0.14, 0, 0.14],
            4: [-0.2, -0.07, 0.07, 0.2],
            5: [-0.24, -0.12, 0, 0.12, 0.24]
        };

        const angles = angleMap[spread] || angleMap[1];
        for (const angle of angles) {
            state.bullets.push({
                kind: "normal",
                x: state.player.x,
                y: originY,
                w: 12,
                h: 30,
                vx: Math.sin(angle) * 175,
                vy: -CONFIG.bulletSpeed * Math.cos(angle),
                damage: 1
            });
        }

        playSfx("shoot", 0.22, randomRange(0.96, 1.04));
    }

    function spawnEnemies(dt) {
        state.spawnTimer += dt;

        const interval = Math.max(
            CONFIG.spawnMin,
            CONFIG.spawnBase - state.elapsed * CONFIG.spawnRampPerSecond - Math.min(0.14, state.score * 0.000012)
        );

        if (state.spawnTimer < interval) return;
        state.spawnTimer = 0;

        const meteorChance = Math.min(0.3, 0.1 + state.elapsed * 0.004);
        if (Math.random() < meteorChance) {
            spawnMeteor();
            return;
        }

        spawnEnemyFromLibrary();
        if (Math.random() < Math.min(0.28, state.elapsed * 0.0024 + state.score * 0.0000045)) {
            spawnEnemyFromLibrary();
        }
    }

    function spawnEnemyFromLibrary() {
        const timeFactor = Math.min(1, state.elapsed / 480);
        const scoreFactor = Math.min(1, state.score / 42000);
        const diff = 1 + timeFactor * 0.44 + scoreFactor * 0.2;
        const hpScale = 1 + timeFactor * 0.55 + scoreFactor * 0.22;
        const roll = Math.random();
        let template;

        if (roll < 0.16) {
            template = {
                image: "enemyRed",
                hp: 1,
                score: 110,
                speedMin: 135,
                speedMax: 205,
                scale: 0.56,
                drift: 90,
                shootChance: 0.18,
                fireMin: 1.7,
                fireMax: 2.8
            };
        } else if (roll < 0.33) {
            template = {
                image: "enemyGreen",
                hp: 2,
                score: 185,
                speedMin: 118,
                speedMax: 178,
                scale: 0.62,
                drift: 76,
                shootChance: 0.26,
                fireMin: 1.3,
                fireMax: 2.2
            };
        } else if (roll < 0.48) {
            template = {
                image: "enemyScout1",
                hp: 2,
                score: 195,
                speedMin: 116,
                speedMax: 186,
                scale: 0.64,
                drift: 95,
                shootChance: 0.32,
                fireMin: 1.0,
                fireMax: 1.8
            };
        } else if (roll < 0.63) {
            template = {
                image: "enemyScout2",
                hp: 2,
                score: 215,
                speedMin: 124,
                speedMax: 194,
                scale: 0.64,
                drift: 98,
                shootChance: 0.38,
                fireMin: 0.9,
                fireMax: 1.6
            };
        } else if (roll < 0.86) {
            template = {
                image: "enemyBlack",
                hp: 3,
                score: 265,
                speedMin: 100,
                speedMax: 148,
                scale: 0.71,
                drift: 58,
                shootChance: 0.32,
                fireMin: 1.1,
                fireMax: 1.9
            };
        } else {
            template = {
                image: "enemyElite",
                hp: 5,
                score: 420,
                speedMin: 88,
                speedMax: 136,
                scale: 0.58,
                drift: 42,
                shootChance: 0.6,
                fireMin: 0.7,
                fireMax: 1.25,
                kind: "elite"
            };
        }

        const aceChance = state.elapsed > 26 ? Math.min(0.22, 0.08 + state.elapsed * 0.0013) : 0;
        const destroyerChance = state.elapsed > 58 ? Math.min(0.12, 0.02 + state.elapsed * 0.0008) : 0;
        const eliteRoll = Math.random();

        if (eliteRoll < destroyerChance) {
            template = {
                image: "enemyDestroyer",
                hp: 14,
                score: 980,
                speedMin: 84,
                speedMax: 130,
                scale: 0.52,
                drift: 74,
                shootChance: 0.92,
                fireMin: 0.48,
                fireMax: 0.86,
                kind: "destroyer",
                shotMode: "fan",
                burstCount: 5,
                burstSpread: 0.42,
                contactDamage: 2
            };
        } else if (eliteRoll < destroyerChance + aceChance) {
            template = {
                image: "enemyAce",
                hp: 8,
                score: 620,
                speedMin: 110,
                speedMax: 168,
                scale: 0.74,
                drift: 118,
                shootChance: 0.78,
                fireMin: 0.58,
                fireMax: 1.0,
                kind: "ace",
                shotMode: "burst",
                burstCount: 3,
                burstSpread: 0.28,
                contactDamage: 2
            };
        }

        const source = images[template.image];
        const baseW = source && source.naturalWidth ? source.naturalWidth : 96;
        const baseH = source && source.naturalHeight ? source.naturalHeight : 82;
        const w = Math.round(baseW * template.scale);
        const h = Math.round(baseH * template.scale);
        const x = randomRange(w / 2 + 10, CONFIG.width - w / 2 - 10);

        state.enemies.push({
            type: "enemy",
            image: template.image,
            x,
            y: -h / 2 - 12,
            w,
            h,
            hp: Math.max(template.hp, Math.round(template.hp * hpScale)),
            maxHp: Math.max(template.hp, Math.round(template.hp * hpScale)),
            kind: template.kind || "enemy",
            score: template.score,
            vy: randomRange(template.speedMin, template.speedMax) * diff,
            drift: template.drift,
            phase: Math.random() * Math.PI * 2,
            shootChance: Math.min(
                template.kind === "destroyer" ? 0.96 : 0.88,
                template.shootChance + state.elapsed * 0.002
            ),
            fireMin: Math.max(0.55, template.fireMin - state.elapsed * 0.0015),
            fireMax: Math.max(0.85, template.fireMax - state.elapsed * 0.0017),
            shootCooldown: randomRange(template.fireMin, template.fireMax),
            shotMode: template.shotMode || "single",
            burstCount: template.burstCount || 0,
            burstSpread: template.burstSpread || 0,
            contactDamage: template.contactDamage || 1
        });
    }

    function spawnMeteor() {
        const timeFactor = Math.min(1, state.elapsed / 520);
        const scoreFactor = Math.min(1, state.score / 50000);
        const diff = 1 + timeFactor * 0.34 + scoreFactor * 0.16;
        const hpScale = 1 + timeFactor * 0.42 + scoreFactor * 0.18;
        const template = Math.random() < 0.5
            ? { image: "meteor1", hp: 3, score: 240, speedMin: 84, speedMax: 145, scale: 0.24 }
            : { image: "meteor2", hp: 4, score: 300, speedMin: 80, speedMax: 132, scale: 0.24 };

        const source = images[template.image];
        const baseW = source && source.naturalWidth ? source.naturalWidth : 210;
        const baseH = source && source.naturalHeight ? source.naturalHeight : 210;
        const w = Math.round(baseW * template.scale);
        const h = Math.round(baseH * template.scale);
        const x = randomRange(w / 2 + 10, CONFIG.width - w / 2 - 10);

        state.enemies.push({
            type: "meteor",
            image: template.image,
            x,
            y: -h / 2 - 14,
            w,
            h,
            hp: Math.max(template.hp, Math.round(template.hp * hpScale)),
            maxHp: Math.max(template.hp, Math.round(template.hp * hpScale)),
            score: template.score,
            vy: randomRange(template.speedMin, template.speedMax) * diff,
            drift: randomRange(12, 35) * (Math.random() > 0.5 ? 1 : -1),
            phase: Math.random() * Math.PI * 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: randomRange(-1.4, 1.4)
        });
    }

    function updateBullets(dt) {
        for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
            const bullet = state.bullets[i];
            if (bullet.kind === "missile") {
                bullet.life = (bullet.life || 3) - dt;
                if (bullet.life <= 0) {
                    explodeMissile(bullet.x, bullet.y, (bullet.damage || 2.2) * 0.7);
                    state.bullets.splice(i, 1);
                    continue;
                }

                if ((bullet.launchBoost || 0) > 0) {
                    bullet.speed = Math.min(
                        bullet.maxSpeed || bullet.speed,
                        bullet.speed + (bullet.accel || 0) * dt * 1.9
                    );
                    bullet.launchBoost = Math.max(0, bullet.launchBoost - dt);
                }

                const target = findMissileTarget(bullet);
                if (target) {
                    const velocity = estimateEnemyVelocity(target);
                    const dx = target.x - bullet.x;
                    const dy = target.y - bullet.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const travelTime = clamp(dist / Math.max(280, bullet.speed || 1), 0.05, 0.4);

                    const aimX = target.x + velocity.vx * travelTime;
                    const aimY = target.y + velocity.vy * travelTime;
                    const desiredAngle = Math.atan2(aimY - bullet.y, aimX - bullet.x);
                    const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                    const nextAngle = rotateTowards(currentAngle, desiredAngle, (bullet.turnRate || 8) * dt);

                    bullet.speed = Math.min(
                        bullet.maxSpeed || bullet.speed,
                        bullet.speed + (bullet.accel || 0) * dt * 1.25
                    );
                    bullet.vx = Math.cos(nextAngle) * bullet.speed;
                    bullet.vy = Math.sin(nextAngle) * bullet.speed;

                    const proximity = bullet.proximity || 22;
                    const detonateDistance = Math.max(16, (target.w + target.h) * 0.22 + proximity);
                    if (dist <= detonateDistance) {
                        explodeMissile(bullet.x, bullet.y, bullet.damage || 2.2);
                        state.bullets.splice(i, 1);
                        continue;
                    }
                } else {
                    bullet.speed = Math.min(
                        bullet.maxSpeed || bullet.speed,
                        bullet.speed + (bullet.accel || 0) * dt * 1.1
                    );
                    const angle = Math.atan2(bullet.vy, bullet.vx);
                    bullet.vx = Math.cos(angle) * bullet.speed;
                    bullet.vy = Math.sin(angle) * bullet.speed;
                }

                bullet.rotation = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
                bullet.trailTimer -= dt;
                if (bullet.trailTimer <= 0) {
                    bullet.trailTimer = 0.04;
                    state.particles.push({
                        x: bullet.x,
                        y: bullet.y + bullet.h * 0.36,
                        vx: randomRange(-12, 12),
                        vy: randomRange(24, 76),
                        life: randomRange(0.14, 0.24),
                        maxLife: 0.24,
                        size: randomRange(1.4, 2.6),
                        color: "#ffd9a1"
                    });
                }
            }

            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            if (
                bullet.y < -60 ||
                bullet.y > CONFIG.height + 60 ||
                bullet.x < -60 ||
                bullet.x > CONFIG.width + 60
            ) {
                state.bullets.splice(i, 1);
            }
        }
    }

    function findMissileTarget(bullet) {
        let best = null;
        let bestScore = Infinity;
        for (const enemy of state.enemies) {
            const dx = enemy.x - bullet.x;
            const dy = enemy.y - bullet.y;
            if (dy > 180) continue;

            const dist = Math.hypot(dx, dy);
            if (dist > 520) continue;

            let score = dist;
            if (dy > 0) score += 85;
            if (enemy.kind === "destroyer") score -= 125;
            else if (enemy.kind === "ace") score -= 90;
            else if (enemy.kind === "elite") score -= 55;
            else if (enemy.type === "meteor") score -= 24;

            if (score < bestScore) {
                bestScore = score;
                best = enemy;
            }
        }
        return best;
    }

    function estimateEnemyVelocity(enemy) {
        return {
            vx: Math.sin(enemy.phase || 0) * (enemy.drift || 0),
            vy: enemy.vy || 0
        };
    }

    function rotateTowards(currentAngle, targetAngle, maxStep) {
        let diff = targetAngle - currentAngle;
        const fullTurn = Math.PI * 2;
        while (diff > Math.PI) diff -= fullTurn;
        while (diff < -Math.PI) diff += fullTurn;
        return currentAngle + clamp(diff, -maxStep, maxStep);
    }

    function updateEnemyBullets(dt) {
        for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
            const bullet = state.enemyBullets[i];
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            if (
                bullet.y < -60 ||
                bullet.y > CONFIG.height + 60 ||
                bullet.x < -60 ||
                bullet.x > CONFIG.width + 60
            ) {
                state.enemyBullets.splice(i, 1);
            }
        }
    }

    function updateEnemies(dt) {
        for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
            const enemy = state.enemies[i];
            enemy.phase += dt * 2.5;
            enemy.y += enemy.vy * dt;

            if (enemy.type === "meteor") {
                enemy.x += Math.sin(enemy.phase) * enemy.drift * dt;
                enemy.rotation += enemy.rotationSpeed * dt;
            } else {
                enemy.x += Math.sin(enemy.phase) * enemy.drift * dt;
                enemy.shootCooldown -= dt;

                if (enemy.shootCooldown <= 0) {
                    if (Math.random() < enemy.shootChance) {
                        if (enemy.shotMode === "burst") {
                            fireEnemySpread(enemy, enemy.burstCount || 3, enemy.burstSpread || 0.26, 1.05);
                        } else if (enemy.shotMode === "fan") {
                            fireEnemySpread(enemy, enemy.burstCount || 5, enemy.burstSpread || 0.42, 1.12);
                        } else {
                            fireEnemyBullet(enemy);
                        }
                    }
                    enemy.shootCooldown = randomRange(enemy.fireMin, enemy.fireMax);
                }
            }

            const halfW = enemy.w / 2;
            enemy.x = clamp(enemy.x, halfW + 6, CONFIG.width - halfW - 6);

            if (enemy.y - enemy.h / 2 > CONFIG.height + 8) {
                state.enemies.splice(i, 1);
            }
        }
    }

    function fireEnemyBullet(enemy) {
        const targetX = state.player.x + randomRange(-18, 18);
        const targetY = state.player.y + randomRange(-8, 8);
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        const speed = CONFIG.enemyBulletSpeed * randomRange(0.92, 1.13);
        const vx = (dx / len) * speed * 0.5;
        const vy = Math.max(165, (dy / len) * speed);
        const eliteShot = enemy.kind === "ace" || enemy.kind === "destroyer" || enemy.kind === "elite";

        state.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.h * 0.35,
            w: eliteShot ? 14 : 13,
            h: eliteShot ? 30 : 26,
            vx,
            vy,
            damage: 1,
            rotation: Math.atan2(vy, vx) + Math.PI / 2,
            skin: eliteShot ? "missile" : "default"
        });

        playSfx("enemyShoot", 0.2, randomRange(0.96, 1.04));
    }

    function fireEnemySpread(enemy, count, spread, speedScale) {
        const shots = Math.max(2, count | 0);
        const center = (shots - 1) / 2;
        const aim = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
        const bulletSpeed = CONFIG.enemyBulletSpeed * (speedScale || 1);

        for (let i = 0; i < shots; i += 1) {
            const offsetRatio = center === 0 ? 0 : (i - center) / center;
            const angle = aim + offsetRatio * spread;
            const speed = bulletSpeed * randomRange(0.9, 1.08);
            const vx = Math.cos(angle) * speed * 0.55;
            const vy = Math.max(170, Math.sin(angle) * speed);

            state.enemyBullets.push({
                x: enemy.x,
                y: enemy.y + enemy.h * 0.35,
                w: 14,
                h: 30,
                vx,
                vy,
                damage: enemy.kind === "destroyer" ? 2 : 1,
                rotation: Math.atan2(vy, vx) + Math.PI / 2,
                skin: "missile"
            });
        }

        playSfx("enemyShoot", 0.25, randomRange(0.9, 1.02));
    }

    function updateParticles(dt) {
        for (let i = state.particles.length - 1; i >= 0; i -= 1) {
            const p = state.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                state.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.985;
            p.vy *= 0.985;
        }
    }

    function detectCollisions() {
        for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
            const bullet = state.bullets[i];
            for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
                const enemy = state.enemies[j];

                if (!intersects(bullet, enemy, enemy.type === "meteor" ? 0.86 : 0.78)) {
                    continue;
                }

                state.bullets.splice(i, 1);
                if (bullet.kind === "missile") {
                    explodeMissile(bullet.x, bullet.y, bullet.damage || 2.2);
                } else {
                    enemy.hp -= bullet.damage;
                    playSfx("hit", 0.16, randomRange(0.95, 1.06));
                    if (enemy.hp <= 0) {
                        destroyEnemy(j);
                    }
                }
                break;
            }
        }

        const playerHitRadius = state.player.hitRadius || 10;
        if (state.player.invincible <= 0) {
            for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
                const bullet = state.enemyBullets[i];
                if (!circleIntersectsRect(state.player.x, state.player.y, playerHitRadius, bullet, 0.58)) {
                    continue;
                }
                state.enemyBullets.splice(i, 1);
                onPlayerHit(bullet.damage || 1);
                break;
            }
        }

        if (state.player.invincible <= 0) {
            for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
                const enemy = state.enemies[i];
                if (!circleIntersectsRect(state.player.x, state.player.y, playerHitRadius + 4, enemy, 0.52)) {
                    continue;
                }

                state.enemies.splice(i, 1);
                spawnExplosion(enemy.x, enemy.y, 1);
                burst(enemy.x, enemy.y, 14, ["#ffd7c0", "#ff8e72", "#ff564f"]);
                const hitDamage = enemy.type === "meteor" ? 2 : (enemy.contactDamage || 1);
                onPlayerHit(hitDamage);
                break;
            }
        }

        for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
            const pickup = state.pickups[i];
            if (!intersects(state.player, pickup, 0.78)) {
                continue;
            }
            state.pickups.splice(i, 1);
            applyPickup(pickup.type, pickup.x, pickup.y);
        }
    }

    function explodeMissile(x, y, baseDamage) {
        const radius = 88;
        spawnExplosion(x, y, 1.1);
        burst(x, y, 20, ["#ffe7cb", "#ffb36e", "#ff6f48"]);
        addShake(0.22, 0.2);
        playSfx("explosion", 0.35, randomRange(1.05, 1.16));

        for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
            const enemy = state.enemies[i];
            const dist = Math.hypot(enemy.x - x, enemy.y - y);
            if (dist > radius) continue;

            const ratio = 1 - dist / radius;
            const damage = Math.max(0.8, (baseDamage || 2.2) * ratio + 0.7);
            enemy.hp -= damage;
            if (enemy.hp <= 0) {
                destroyEnemy(i);
            }
        }
    }

    function detonateSmartBomb() {
        const hasTargets = state.enemies.length > 0 || state.enemyBullets.length > 0;
        if (!hasTargets) {
            return false;
        }

        state.enemyBullets.length = 0;
        while (state.enemies.length > 0) {
            destroyEnemy(state.enemies.length - 1);
        }

        addShake(0.5, 0.24);
        burst(state.player.x, state.player.y, 26, ["#89f1ff", "#d7fdff", "#ffffff"]);
        playSfx("explosion", 0.52, 0.84);
        return true;
    }

    function destroyEnemy(index) {
        const enemy = state.enemies[index];
        state.enemies.splice(index, 1);

        state.score += enemy.score;
        state.combo += 1;

        if (state.combo > 0 && state.combo % 20 === 0 && state.lives < CONFIG.maxLives) {
            state.lives += 1;
        }

        spawnExplosion(enemy.x, enemy.y, enemy.type === "meteor" ? 1.5 : 1.0);
        burst(enemy.x, enemy.y, enemy.type === "meteor" ? 30 : 20, ["#ffcf8e", "#ff8446", "#ff4a4a"]);
        burst(enemy.x, enemy.y, 12, ["#8fe7ff", "#61d2ff", "#ffffff"]);
        addShake(enemy.type === "meteor" ? 0.34 : 0.2, enemy.type === "meteor" ? 0.3 : 0.18);
        playSfx("explosion", enemy.type === "meteor" ? 0.7 : 0.45, randomRange(0.94, 1.06));

        if (state.score > state.bestScore) {
            state.bestScore = state.score;
        }
    }

    function onPlayerHit(damage) {
        if (state.player.invincible > 0) {
            return;
        }

        state.combo = 0;
        state.lives -= damage || 1;
        state.player.invincible = CONFIG.hitInvincibleSeconds;

        spawnExplosion(state.player.x, state.player.y, 1.2);
        burst(state.player.x, state.player.y, 28, ["#ffe8d3", "#ff9664", "#ff4f45"]);
        addShake(0.45, 0.36);
        playSfx("playerHit", 0.65, randomRange(0.96, 1.04));

        if (state.lives <= 0) {
            endGame();
        }
    }

    function spawnExplosion(x, y, scale) {
        state.explosions.push({
            x,
            y,
            scale: scale || 1,
            frameFloat: 0,
            fps: 26
        });
    }

    function burst(x, y, count, palette) {
        for (let i = 0; i < count; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = randomRange(60, 230);
            state.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: randomRange(0.28, 0.7),
                maxLife: 0.7,
                size: randomRange(1.4, 3.8),
                color: palette[(Math.random() * palette.length) | 0]
            });
        }
    }

    function render() {
        ctx.save();
        if (state.shake.time > 0 && state.shake.duration > 0) {
            const ratio = state.shake.time / state.shake.duration;
            const amp = state.shake.strength * ratio * 20;
            ctx.translate(randomRange(-amp, amp), randomRange(-amp, amp));
        }

        drawBackground();
        drawStars();
        drawEnemies();
        drawPickups();
        drawBullets();
        drawLaserBeam();
        drawEnemyBullets();
        drawPlayer();
        drawExplosions();
        drawParticles();
        ctx.restore();

        if (state.paused) {
            drawPauseMask();
        }
    }

    function drawBackground() {
        const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
        g.addColorStop(0, "#070f23");
        g.addColorStop(0.52, "#0d1b38");
        g.addColorStop(1, "#142949");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

        if (imageUsable("backgroundTile")) {
            const img = images.backgroundTile;
            const tileSize = 256;
            const offset = state.bgOffset;

            ctx.save();
            ctx.globalAlpha = 0.4;
            for (let y = -tileSize + offset; y < CONFIG.height + tileSize; y += tileSize) {
                for (let x = 0; x < CONFIG.width + tileSize; x += tileSize) {
                    ctx.drawImage(img, x - 20, y, tileSize, tileSize);
                }
            }
            ctx.restore();
        }
    }

    function drawStars() {
        ctx.save();
        for (const star of state.stars) {
            const twinkle = 0.55 + (Math.sin(star.twinkle) + 1) * 0.25;
            ctx.globalAlpha = twinkle;
            ctx.fillStyle = "#d8edff";
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawPlayer() {
        const player = state.player;

        if (player.invincible > 0 && Math.floor(player.invincible * 16) % 2 === 0) {
            return;
        }

        drawThruster(player);

        if (imageUsable("player")) {
            const img = images.player;
            ctx.drawImage(img, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);
        } else {
            ctx.fillStyle = "#6bd6ff";
            ctx.beginPath();
            ctx.moveTo(player.x, player.y - player.h / 2);
            ctx.lineTo(player.x + player.w / 2, player.y + player.h / 2);
            ctx.lineTo(player.x - player.w / 2, player.y + player.h / 2);
            ctx.closePath();
            ctx.fill();
        }

        if (player.invincible > 0) {
            ctx.save();
            ctx.strokeStyle = "rgba(135, 213, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, Math.max(player.w, player.h) * 0.65, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(210, 246, 255, 0.95)";
        ctx.beginPath();
        ctx.arc(player.x, player.y, Math.max(3, (player.hitRadius || 10) * 0.32), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(104, 214, 255, 0.28)";
        ctx.beginPath();
        ctx.arc(player.x, player.y, Math.max(6, (player.hitRadius || 10) * 0.9), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawThruster(player) {
        const baseY = player.y + player.h * 0.43;
        const pulse = Math.sin(state.elapsed * 30) * 4;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const offsetX of [-11, 0, 11]) {
            const flameLen = 17 + pulse + Math.random() * 6;
            ctx.fillStyle = "rgba(98, 215, 255, 0.24)";
            ctx.beginPath();
            ctx.moveTo(player.x + offsetX - 3, baseY);
            ctx.lineTo(player.x + offsetX + 3, baseY);
            ctx.lineTo(player.x + offsetX, baseY + flameLen);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function drawPickups() {
        for (const pickup of state.pickups) {
            const icon = pickup.type === "laser"
                ? "pickupLaser"
                : pickup.type === "missile"
                    ? "missileEnemy"
                    : "life";

            const pulse = 0.9 + Math.sin(state.elapsed * 5 + pickup.phase) * 0.12;
            ctx.save();
            ctx.translate(pickup.x, pickup.y);
            ctx.rotate(Math.sin(state.elapsed * 2 + pickup.phase) * 0.22);

            if (imageUsable(icon)) {
                const img = images[icon];
                const size = Math.max(24, Math.min(40, (pickup.w + pickup.h) * 0.58)) * pulse;
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
            } else {
                ctx.fillStyle = pickup.type === "bomb" ? "#ffd16a" : pickup.type === "laser" ? "#78dcff" : "#9cc8ff";
                ctx.beginPath();
                ctx.arc(0, 0, pickup.w * 0.45 * pulse, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    function drawBullets() {
        for (const bullet of state.bullets) {
            const isMissile = bullet.kind === "missile";
            const key = isMissile ? "missilePlayer" : "bullet";
            if (imageUsable(key)) {
                const img = images[key];
                const angle = isMissile ? (bullet.rotation || 0) : Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
                ctx.save();
                ctx.translate(bullet.x, bullet.y);
                ctx.rotate(angle);
                ctx.drawImage(img, -bullet.w / 2, -bullet.h / 2, bullet.w, bullet.h);
                ctx.restore();
            } else {
                ctx.fillStyle = isMissile ? "#b9f589" : "#6ad8ff";
                ctx.fillRect(bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h);
            }
        }
    }

    function drawLaserBeam() {
        if (state.weaponMode !== "laser" || !state.running || state.paused) {
            return;
        }

        const beamXs = getLaserBeamXs();
        const y0 = state.player.y - state.player.h * 0.55;
        const y1 = 0;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (let n = 0; n < beamXs.length; n += 1) {
            const x = beamXs[n];
            const wave = Math.sin(state.elapsed * 36 + n * 1.3) * 1.8;
            const glow = ctx.createLinearGradient(0, y0, 0, y1);
            glow.addColorStop(0, "rgba(144, 238, 255, 0.08)");
            glow.addColorStop(0.45, "rgba(102, 229, 255, 0.24)");
            glow.addColorStop(1, "rgba(132, 248, 255, 0.08)");
            ctx.fillStyle = glow;
            ctx.fillRect(x - 12, y1, 24, y0 - y1);

            ctx.strokeStyle = "rgba(98, 230, 255, 0.42)";
            ctx.lineWidth = 5.5;
            ctx.beginPath();
            ctx.moveTo(x + wave, y0);
            ctx.lineTo(x - wave, y1);
            ctx.stroke();

            ctx.strokeStyle = "rgba(220, 251, 255, 0.95)";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(x, y0);
            ctx.lineTo(x, y1);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawEnemyBullets() {
        for (const bullet of state.enemyBullets) {
            const key = bullet.skin === "missile" ? "missileEnemy" : "enemyBullet";
            if (imageUsable(key)) {
                const img = images[key];
                ctx.save();
                ctx.translate(bullet.x, bullet.y);
                ctx.rotate(bullet.rotation);
                ctx.drawImage(img, -bullet.w / 2, -bullet.h / 2, bullet.w, bullet.h);
                ctx.restore();
            } else {
                ctx.fillStyle = "#ff7a74";
                ctx.fillRect(bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h);
            }
        }
    }

    function drawEnemies() {
        for (const enemy of state.enemies) {
            if (enemy.type === "meteor") {
                drawMeteor(enemy);
            } else {
                drawEnemyShip(enemy);
            }

            if (enemy.maxHp > 1) {
                const width = enemy.w * 0.72;
                const hpRatio = enemy.hp / enemy.maxHp;
                ctx.fillStyle = "rgba(8, 18, 34, 0.8)";
                ctx.fillRect(enemy.x - width / 2, enemy.y + enemy.h / 2 + 4, width, 4);
                ctx.fillStyle = enemy.kind === "destroyer"
                    ? "#ff9ca0"
                    : enemy.kind === "ace"
                        ? "#ffd58a"
                        : enemy.type === "meteor"
                            ? "#eec68f"
                            : "#8af0c7";
                ctx.fillRect(enemy.x - width / 2, enemy.y + enemy.h / 2 + 4, width * hpRatio, 4);
            }
        }
    }

    function drawEnemyShip(enemy) {
        const roll = Math.sin(enemy.phase) * 0.07;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(roll);
        if (imageUsable(enemy.image)) {
            const img = images[enemy.image];
            ctx.drawImage(img, -enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
        } else {
            ctx.fillStyle = "#ff8b5c";
            ctx.fillRect(-enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
        }
        ctx.restore();
    }

    function drawMeteor(enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.rotation);
        if (imageUsable(enemy.image)) {
            const img = images[enemy.image];
            ctx.drawImage(img, -enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
        } else {
            ctx.fillStyle = "#a68566";
            ctx.beginPath();
            ctx.arc(0, 0, enemy.w * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawExplosions() {
        for (const e of state.explosions) {
            const frameIndex = Math.min(EXPLOSION_FRAMES.length - 1, Math.floor(e.frameFloat));
            const frameKey = EXPLOSION_FRAMES[frameIndex];
            if (!imageUsable(frameKey)) continue;
            const img = images[frameKey];
            const size = Math.max(32, img.naturalWidth * e.scale * 1.5);
            ctx.drawImage(img, e.x - size / 2, e.y - size / 2, size, size);
        }
    }

    function drawParticles() {
        for (const p of state.particles) {
            const alpha = clamp(p.life / p.maxLife, 0, 1);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawPauseMask() {
        ctx.fillStyle = "rgba(8, 14, 28, 0.45)";
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

        ctx.fillStyle = "rgba(220, 239, 255, 0.95)";
        ctx.font = "700 28px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", CONFIG.width / 2, CONFIG.height / 2);
    }

    function updateHud() {
        scoreEl.textContent = String(state.score);
        comboEl.textContent = String(state.combo);
        livesEl.textContent = String(Math.max(0, state.lives));
        bestEl.textContent = `Best ${state.bestScore}`;

        if (weaponEl) {
            const labelMap = {
                normal: "NORMAL",
                laser: "LASER",
                missile: "MISSILE"
            };
            weaponEl.textContent = `Weapon ${labelMap[state.weaponMode] || "NORMAL"}`;
        }

        if (weaponTimerEl) {
            if (state.weaponMode === "normal") {
                weaponTimerEl.textContent = state.bombCooldown > 0
                    ? `Bomb CD ${state.bombCooldown.toFixed(1)}s`
                    : "Bomb Ready";
            } else {
                weaponTimerEl.textContent = `Mode ${state.weaponTimer.toFixed(1)}s`;
            }
        }

        updateBombButton();
    }

    function intersects(a, b, shrink) {
        const aHalfW = (a.w || 0) * 0.5 * (shrink || 1);
        const aHalfH = (a.h || 0) * 0.5 * (shrink || 1);
        const bHalfW = (b.w || 0) * 0.5 * (shrink || 1);
        const bHalfH = (b.h || 0) * 0.5 * (shrink || 1);

        return (
            Math.abs(a.x - b.x) < aHalfW + bHalfW &&
            Math.abs(a.y - b.y) < aHalfH + bHalfH
        );
    }

    function clampRectPoint(px, py, rect, shrink) {
        const sx = (shrink || 1) * 0.5;
        const halfW = (rect.w || 0) * sx;
        const halfH = (rect.h || 0) * sx;
        return {
            x: clamp(px, rect.x - halfW, rect.x + halfW),
            y: clamp(py, rect.y - halfH, rect.y + halfH)
        };
    }

    function circleIntersectsRect(cx, cy, radius, rect, shrink) {
        const nearest = clampRectPoint(cx, cy, rect, shrink);
        const dx = cx - nearest.x;
        const dy = cy - nearest.y;
        return dx * dx + dy * dy <= radius * radius;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function togglePause() {
        if (!state.running) return;
        state.paused = !state.paused;
        pausePill.style.display = state.paused ? "block" : "none";
        if (!state.paused) {
            setProfileDockVisible(false);
        }
        updatePauseButton();
        if (state.paused) {
            stopBgm();
        } else {
            startBgm();
        }
    }

    function triggerBomb() {
        if (!state.running || state.paused) return;
        if (state.bombCooldown > 0) return;
        if (!detonateSmartBomb()) return;
        state.bombCooldown = CONFIG.bombCooldownSeconds;
        updateBombButton();
    }

    function toggleHud() {
        if (!hudEl) return;
        state.hudVisible = !state.hudVisible;
        hudEl.style.display = state.hudVisible ? "flex" : "none";
        if (hudControlsEl) {
            hudControlsEl.style.display = state.hudVisible ? "flex" : "none";
        }
        updateBombButton();
    }

    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
            return;
        }

        const target = gameShell || document.documentElement;
        if (target.requestFullscreen) {
            target.requestFullscreen().catch(() => {});
        }
    }

    function setPointerPosition(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CONFIG.width / rect.width;
        const scaleY = CONFIG.height / rect.height;

        state.pointer.x = clamp((clientX - rect.left) * scaleX, 10, CONFIG.width - 10);
        state.pointer.y = clamp((clientY - rect.top) * scaleY, 10, CONFIG.height - 10);
        state.pointer.active = true;
    }

    document.addEventListener("keydown", (event) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
            event.preventDefault();
        }

        state.keys[event.code] = true;

        if (
            event.repeat &&
            [
                "KeyP",
                "Escape",
                "KeyM",
                "KeyR",
                "KeyB",
                "BracketLeft",
                "BracketRight",
                "KeyF",
                "KeyH",
                "Enter"
            ].includes(event.code)
        ) {
            return;
        }

        if ((event.code === "KeyP" || event.code === "Escape") && state.running) {
            togglePause();
        }

        if (event.code === "KeyM") {
            toggleMute();
        }

        if (event.code === "KeyR" && state.ready) {
            startGame();
        }

        if (event.code === "KeyB") {
            triggerBomb();
        }

        if (event.code === "BracketLeft") {
            adjustMasterVolume(-0.08);
        }

        if (event.code === "BracketRight") {
            adjustMasterVolume(0.08);
        }

        if (event.code === "KeyF") {
            toggleFullscreen();
        }

        if (event.code === "KeyH") {
            toggleHud();
        }

        if (event.code === "Enter") {
            if (!state.running && !startOverlay.classList.contains("hidden") && state.ready) {
                startGame();
            } else if (!state.running && !gameoverOverlay.classList.contains("hidden")) {
                startGame();
            }
        }
    });

    document.addEventListener("keyup", (event) => {
        state.keys[event.code] = false;
    });

    canvas.addEventListener("pointerdown", (event) => {
        if (!state.running || state.paused) return;
        state.pointer.down = true;
        setPointerPosition(event.clientX, event.clientY);
        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
        if (!state.running || state.paused) return;
        if (!state.pointer.down && event.pointerType !== "mouse") return;
        setPointerPosition(event.clientX, event.clientY);
    });

    canvas.addEventListener("pointerup", (event) => {
        state.pointer.down = false;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    });

    canvas.addEventListener("pointercancel", () => {
        state.pointer.down = false;
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && state.running && !state.paused) {
            togglePause();
        }
    });

    startBtn.addEventListener("click", () => {
        if (!state.ready) return;
        startGame();
    });

    restartBtn.addEventListener("click", () => {
        startGame();
    });

    function commitProfileInput() {
        if (!profileInputEl) return;
        const name = normalizeUserName(profileInputEl.value);
        if (!name) return;
        setActiveUser(name);
        profileInputEl.value = "";
    }

    if (profileSaveBtn) {
        profileSaveBtn.addEventListener("click", () => {
            if (state.running && !state.paused) return;
            commitProfileInput();
        });
    }

    if (profileInputEl) {
        profileInputEl.addEventListener("keydown", (event) => {
            if (event.code !== "Enter") return;
            event.preventDefault();
            if (state.running && !state.paused) return;
            commitProfileInput();
        });
    }

    if (profileSelectEl) {
        profileSelectEl.addEventListener("change", () => {
            if (state.running && !state.paused) {
                profileSelectEl.value = state.activeUser;
                return;
            }
            setActiveUser(profileSelectEl.value);
        });
    }

    if (profileOpenBtn) {
        profileOpenBtn.addEventListener("click", () => {
            const opening = !(profileDockEl && profileDockEl.classList.contains("visible"));
            if (opening && state.running && !state.paused) {
                togglePause();
            }
            setProfileDockVisible(opening);
            if (opening) {
                updateProfilePanel();
                updateLeaderboardPanel();
            }
        });
    }

    if (openProfileStartBtn) {
        openProfileStartBtn.addEventListener("click", () => {
            if (state.running && !state.paused) return;
            const opening = !(profileDockEl && profileDockEl.classList.contains("visible"));
            setProfileDockVisible(opening);
            if (opening) {
                updateProfilePanel();
                updateLeaderboardPanel();
            }
        });
    }

    if (bombToggleBtn) {
        bombToggleBtn.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
        bombToggleBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            triggerBomb();
        });
    }

    if (audioToggleBtn) {
        audioToggleBtn.addEventListener("click", () => {
            toggleMute();
        });
    }

    if (pauseToggleBtn) {
        pauseToggleBtn.addEventListener("click", () => {
            togglePause();
        });
    }

    updateProfilePanel();
    updateLeaderboardPanel();
    updateHud();
    updateAudioButton();
    updatePauseButton();
    setProfileDockVisible(false);
    updateCloudStatus();

    if (state.cloudEnabled) {
        void pullCloudBestForUser(state.activeUser);
        void refreshCloudLeaderboard(true);
        setInterval(() => {
            void refreshCloudLeaderboard(false);
        }, CLOUD.refreshMs);
    }

    loadAssets().catch(() => {
        loadingEl.textContent = "素材加载失败，请刷新重试";
        loadingEl.classList.add("warning");
        startBtn.disabled = false;
        startBtn.textContent = "仍然开始（无素材模式）";
        state.ready = true;
        updatePauseButton();
    });

    render();
})();
