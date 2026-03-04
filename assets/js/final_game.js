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
        spawnRampPerSecond: 0.008,
        hitInvincibleSeconds: 1.15,
        storageKey: "plane-war-remaster-best-score",
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
        meteor1: "assets/images/meteor-1.png",
        meteor2: "assets/images/meteor-2.png",
        bullet: "assets/images/bullet.png",
        enemyBullet: "assets/images/enemy-bullet.png",
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

    const startOverlay = document.getElementById("start-overlay");
    const gameoverOverlay = document.getElementById("gameover-overlay");
    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const finalScoreEl = document.getElementById("final-score");
    const finalBestEl = document.getElementById("final-best");
    const pausePill = document.getElementById("pause-pill");
    const loadingEl = document.getElementById("loading");
    const audioToggleBtn = document.getElementById("audio-toggle");
    const hudEl = document.getElementById("hud");
    const gameShell = document.getElementById("game-shell");

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
        fireTimer: 0,
        bombCooldown: 0,
        score: 0,
        combo: 0,
        lives: CONFIG.maxLives,
        bestScore: loadBestScore(),
        stars: createStars(95),
        bullets: [],
        enemyBullets: [],
        enemies: [],
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

    function createPlayer() {
        return {
            x: CONFIG.width / 2,
            y: CONFIG.height - 110,
            w: 62,
            h: 48,
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

    function loadBestScore() {
        const raw = Number.parseInt(localStorage.getItem(CONFIG.storageKey) || "0", 10);
        return Number.isFinite(raw) && raw > 0 ? raw : 0;
    }

    function saveBestScore(value) {
        localStorage.setItem(CONFIG.storageKey, String(value));
    }

    function updateAudioButton() {
        if (!audioToggleBtn) return;
        const volumePct = Math.round(state.masterVolume * 100);
        audioToggleBtn.textContent = state.muted ? "SOUND: OFF" : `SOUND: ON ${volumePct}%`;
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
            startBtn.textContent = "Start Game";
            updateHud();
            updateAudioButton();
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
        state.fireTimer = 0;
        state.bombCooldown = 0;
        state.score = 0;
        state.combo = 0;
        state.lives = CONFIG.maxLives;
        state.bullets = [];
        state.enemyBullets = [];
        state.enemies = [];
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
        updateHud();

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
        pausePill.style.display = "none";
        stopBgm();

        if (state.score > state.bestScore) {
            state.bestScore = state.score;
            saveBestScore(state.bestScore);
        }

        finalScoreEl.textContent = String(state.score);
        finalBestEl.textContent = String(state.bestScore);
        updateHud();
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
        autoShoot(dt);
        spawnEnemies(dt);
        updateBullets(dt);
        updateEnemyBullets(dt);
        updateEnemies(dt);
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

        const spread = state.player.spread;
        const fireRatio = state.keys.Space ? 0.74 : 1;
        state.fireTimer = (CONFIG.baseFireCooldown * fireRatio) / (1 + (spread - 1) * 0.13);

        const angleMap = {
            1: [0],
            2: [-0.08, 0.08],
            3: [-0.14, 0, 0.14],
            4: [-0.2, -0.07, 0.07, 0.2],
            5: [-0.24, -0.12, 0, 0.12, 0.24]
        };

        const angles = angleMap[spread] || angleMap[1];
        const originY = state.player.y - state.player.h * 0.44;

        for (const angle of angles) {
            state.bullets.push({
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
            CONFIG.spawnBase - state.elapsed * CONFIG.spawnRampPerSecond
        );

        if (state.spawnTimer < interval) return;
        state.spawnTimer = 0;

        const meteorChance = Math.min(0.3, 0.1 + state.elapsed * 0.004);
        if (Math.random() < meteorChance) {
            spawnMeteor();
            return;
        }

        spawnEnemyFromLibrary();
        if (Math.random() < Math.min(0.25, state.elapsed * 0.004)) {
            spawnEnemyFromLibrary();
        }
    }

    function spawnEnemyFromLibrary() {
        const diff = 1 + state.elapsed * 0.045 + state.score * 0.00025;
        const roll = Math.random();
        let template;

        if (roll < 0.16) {
            template = {
                image: "enemyRed",
                hp: 1,
                score: 110,
                speedMin: 150,
                speedMax: 230,
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
                speedMin: 130,
                speedMax: 195,
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
                speedMin: 130,
                speedMax: 210,
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
                speedMin: 140,
                speedMax: 220,
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
                speedMin: 110,
                speedMax: 165,
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
                speedMin: 95,
                speedMax: 150,
                scale: 0.58,
                drift: 42,
                shootChance: 0.6,
                fireMin: 0.7,
                fireMax: 1.25
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
            hp: template.hp,
            maxHp: template.hp,
            score: template.score,
            vy: randomRange(template.speedMin, template.speedMax) * diff,
            drift: template.drift,
            phase: Math.random() * Math.PI * 2,
            shootChance: Math.min(0.82, template.shootChance + state.elapsed * 0.002),
            fireMin: Math.max(0.55, template.fireMin - state.elapsed * 0.0015),
            fireMax: Math.max(0.85, template.fireMax - state.elapsed * 0.0017),
            shootCooldown: randomRange(template.fireMin, template.fireMax)
        });
    }

    function spawnMeteor() {
        const diff = 1 + state.elapsed * 0.03 + state.score * 0.00019;
        const template = Math.random() < 0.5
            ? { image: "meteor1", hp: 3, score: 240, speedMin: 95, speedMax: 165, scale: 0.24 }
            : { image: "meteor2", hp: 4, score: 300, speedMin: 90, speedMax: 150, scale: 0.24 };

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
            hp: template.hp,
            maxHp: template.hp,
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
                        fireEnemyBullet(enemy);
                    }
                    enemy.shootCooldown = randomRange(enemy.fireMin, enemy.fireMax);
                }
            }

            const halfW = enemy.w / 2;
            enemy.x = clamp(enemy.x, halfW + 6, CONFIG.width - halfW - 6);

            if (enemy.y - enemy.h / 2 > CONFIG.height + 8) {
                state.enemies.splice(i, 1);
                onPlayerHit();
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

        state.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.h * 0.35,
            w: 13,
            h: 26,
            vx,
            vy,
            damage: 1,
            rotation: Math.atan2(vy, vx) + Math.PI / 2
        });

        playSfx("enemyShoot", 0.2, randomRange(0.96, 1.04));
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
                enemy.hp -= bullet.damage;
                playSfx("hit", 0.16, randomRange(0.95, 1.06));

                if (enemy.hp <= 0) {
                    destroyEnemy(j);
                }
                break;
            }
        }

        if (state.player.invincible <= 0) {
            for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
                const bullet = state.enemyBullets[i];
                if (!intersects(state.player, bullet, 0.7)) {
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
                if (!intersects(state.player, enemy, 0.75)) {
                    continue;
                }

                state.enemies.splice(i, 1);
                spawnExplosion(enemy.x, enemy.y, 1);
                burst(enemy.x, enemy.y, 14, ["#ffd7c0", "#ff8e72", "#ff564f"]);
                onPlayerHit(enemy.type === "meteor" ? 2 : 1);
                break;
            }
        }
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
        drawBullets();
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

    function drawBullets() {
        for (const bullet of state.bullets) {
            if (imageUsable("bullet")) {
                const img = images.bullet;
                const angle = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
                ctx.save();
                ctx.translate(bullet.x, bullet.y);
                ctx.rotate(angle);
                ctx.drawImage(img, -bullet.w / 2, -bullet.h / 2, bullet.w, bullet.h);
                ctx.restore();
            } else {
                ctx.fillStyle = "#6ad8ff";
                ctx.fillRect(bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h);
            }
        }
    }

    function drawEnemyBullets() {
        for (const bullet of state.enemyBullets) {
            if (imageUsable("enemyBullet")) {
                const img = images.enemyBullet;
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
                ctx.fillStyle = enemy.type === "meteor" ? "#eec68f" : "#8af0c7";
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
        if (state.paused) {
            stopBgm();
        } else {
            startBgm();
        }
    }

    function triggerBomb() {
        if (!state.running || state.paused) return;
        if (state.bombCooldown > 0) return;

        const hasTargets = state.enemies.length > 0 || state.enemyBullets.length > 0;
        if (!hasTargets) return;

        state.bombCooldown = 8;
        state.enemyBullets.length = 0;

        while (state.enemies.length > 0) {
            destroyEnemy(state.enemies.length - 1);
        }

        addShake(0.5, 0.24);
        burst(state.player.x, state.player.y, 26, ["#89f1ff", "#d7fdff", "#ffffff"]);
        playSfx("explosion", 0.52, 0.84);
    }

    function toggleHud() {
        if (!hudEl) return;
        state.hudVisible = !state.hudVisible;
        hudEl.style.display = state.hudVisible ? "flex" : "none";
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

    if (audioToggleBtn) {
        audioToggleBtn.addEventListener("click", () => {
            toggleMute();
        });
    }

    updateHud();
    updateAudioButton();

    loadAssets().catch(() => {
        loadingEl.textContent = "素材加载失败，请刷新重试";
        loadingEl.classList.add("warning");
        startBtn.disabled = false;
        startBtn.textContent = "仍然开始（无素材模式）";
        state.ready = true;
    });

    render();
})();
