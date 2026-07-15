(function () {
    'use strict';

    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const overlay = document.getElementById('mobileOverlay');
    const scrollFill = document.querySelector('.scroll-progress-fill');

    const mobileMq = matchMedia('(max-width: 768px)');
    const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
    const coarseMq = matchMedia('(pointer: coarse)');

    let mobile = mobileMq.matches;
    let reduced = reducedMq.matches;
    let coarsePointer = coarseMq.matches;

    const layoutListeners = new Set();
    const onLayoutChange = () => layoutListeners.forEach((fn) => fn());
    const syncPrefs = () => {
        mobile = mobileMq.matches;
        reduced = reducedMq.matches;
        coarsePointer = coarseMq.matches;
        onLayoutChange();
    };
    [mobileMq, reducedMq, coarseMq].forEach((mq) => mq.addEventListener('change', syncPrefs));

    const rafThrottle = (fn) => {
        let scheduled = false;
        return (...args) => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                fn(...args);
            });
        };
    };

    const navOffset = () => nav?.offsetHeight || 0;

    /* ── Scroll progress + nav shrink ── */
    const updateScrollProgress = () => {
        const root = document.documentElement;
        const max = root.scrollHeight - root.clientHeight;
        const pct = max > 0 ? (root.scrollTop / max) * 100 : 0;
        if (scrollFill) scrollFill.style.height = `${pct}%`;
    };

    const onScroll = rafThrottle(() => {
        nav?.classList.toggle('scrolled', scrollY > 60);
        updateScrollProgress();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    updateScrollProgress();

    /* ── Mobile menu ── */
    function closeMenu() {
        if (!toggle || !navLinks || !overlay) return;
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        navLinks.classList.remove('open');
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        if (mobileMq.matches) {
            navLinks.setAttribute('aria-hidden', 'true');
        } else {
            navLinks.removeAttribute('aria-hidden');
        }
        document.body.style.overflow = '';
    }

    function openMenu() {
        if (!toggle || !navLinks || !overlay || !mobileMq.matches) return;
        navLinks.classList.add('open');
        toggle.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close menu');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        navLinks.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    const syncNavMode = () => {
        if (!navLinks) return;
        if (!mobileMq.matches) {
            closeMenu();
            navLinks.removeAttribute('aria-hidden');
        } else if (!navLinks.classList.contains('open')) {
            navLinks.setAttribute('aria-hidden', 'true');
        }
        onLayoutChange();
    };

    syncNavMode();

    if (toggle && navLinks && overlay) {
        mobileMq.addEventListener('change', syncNavMode);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });

        toggle.addEventListener('click', () => {
            navLinks.classList.contains('open') ? closeMenu() : openMenu();
        });

        overlay.addEventListener('click', closeMenu);
        navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    }

    /* ── Section fade-in ── */
    const fadeObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-in').forEach((el) => fadeObserver.observe(el));

    /* ── Smooth in-page anchors ── */
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (!id || id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const top = target.getBoundingClientRect().top + scrollY - navOffset();
            scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
        });
    });

    /* ── Client Love spotlight ── */
    const loveSpotlight = document.getElementById('loveSpotlight');
    const loveFlow = document.getElementById('loveFlow');
    const lovePrev = document.getElementById('loveCarouselPrev');
    const loveNext = document.getElementById('loveCarouselNext');
    const loveDots = document.getElementById('loveDots');

    if (loveSpotlight) {
        const quotes = [...loveSpotlight.querySelectorAll('.love-quote')];
        const total = quotes.length;
        let index = 0;
        let paused = false;
        let isAnimating = false;
        let autoId = null;
        const duration = 420;

        const dotButtons = [];
        if (loveDots) {
            loveDots.innerHTML = '';
            for (let i = 0; i < total; i++) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'love-dot';
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-label', `Show review ${i + 1}`);
                dot.addEventListener('click', () => {
                    if (isAnimating || index === i) return;
                    go(i);
                    restartAuto(8000);
                });
                loveDots.appendChild(dot);
                dotButtons.push(dot);
            }
        }

        let lockedHeight = 0;

        const measureMaxHeight = () => {
            const width = loveSpotlight.clientWidth;
            if (!width) return lockedHeight;

            const probe = document.createElement('div');
            probe.className = 'love-spotlight';
            probe.setAttribute('aria-hidden', 'true');
            probe.style.cssText = [
                'position:absolute',
                'left:-9999px',
                'top:0',
                'visibility:hidden',
                'pointer-events:none',
                'height:auto',
                'width:' + width + 'px',
            ].join(';');

            document.body.appendChild(probe);

            let max = 0;
            quotes.forEach((quote) => {
                const clone = quote.cloneNode(true);
                clone.classList.add('is-active');
                clone.style.cssText = 'position:relative;opacity:1;visibility:visible;transform:none;';
                probe.appendChild(clone);
                max = Math.max(max, probe.scrollHeight);
                probe.removeChild(clone);
            });

            probe.remove();
            lockedHeight = Math.ceil(max);
            loveSpotlight.style.height = `${lockedHeight}px`;
            return lockedHeight;
        };

        const syncLoveUi = () => {
            quotes.forEach((quote, i) => {
                quote.classList.toggle('is-active', i === index);
            });
            dotButtons.forEach((dot, i) => {
                const active = i === index;
                dot.classList.toggle('is-active', active);
                dot.setAttribute('aria-selected', active ? 'true' : 'false');
            });
        };

        const go = (i) => {
            if (!total || i === index) return;
            isAnimating = true;
            index = ((i % total) + total) % total;
            syncLoveUi();
            window.setTimeout(() => {
                isAnimating = false;
            }, duration);
        };

        const next = () => go(index + 1);
        const prev = () => go(index - 1);

        lovePrev?.addEventListener('click', () => {
            prev();
            restartAuto(8000);
        });
        loveNext?.addEventListener('click', () => {
            next();
            restartAuto(8000);
        });

        if (loveFlow) {
            loveFlow.addEventListener('mouseenter', () => { paused = true; });
            loveFlow.addEventListener('mouseleave', () => {
                paused = false;
                restartAuto();
            });
        }

        let touchStartX = 0;
        let touchStartY = 0;
        loveSpotlight.addEventListener(
            'touchstart',
            (e) => {
                touchStartX = e.changedTouches[0].clientX;
                touchStartY = e.changedTouches[0].clientY;
            },
            { passive: true }
        );
        loveSpotlight.addEventListener(
            'touchend',
            (e) => {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
                dx < 0 ? next() : prev();
                restartAuto(8000);
            },
            { passive: true }
        );

        function restartAuto(delay = 6000) {
            clearInterval(autoId);
            if (reduced) return;
            autoId = setInterval(() => {
                if (!paused && !document.hidden && !isAnimating) next();
            }, delay);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(autoId);
            } else if (!paused) {
                restartAuto();
            }
        });

        const onSpotlightLayout = () => {
            measureMaxHeight();
            syncLoveUi();
        };

        layoutListeners.add(onSpotlightLayout);
        new ResizeObserver(onSpotlightLayout).observe(loveSpotlight);

        measureMaxHeight();
        syncLoveUi();
        restartAuto();

        if (document.fonts?.ready) {
            document.fonts.ready.then(() => {
                measureMaxHeight();
                syncLoveUi();
            });
        }
    }

    /* ── Star field canvas ── */
    const canvas = document.getElementById('starCanvas');
    const ctx = canvas?.getContext('2d', { alpha: true });

    let stars = [];
    let shooters = [];
    let running = false;
    let mouseX = -9999;
    let mouseY = -9999;
    let nextShoot = performance.now() + 1500 + Math.random() * 2500;
    let maxShooters = mobile ? 2 : 6;
    let hoverRadius = mobile ? 100 : 155;
    let starDensity = mobile ? 5200 : 1650;

    if (ctx && !coarsePointer) {
        document.addEventListener(
            'mousemove',
            (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            },
            { passive: true }
        );
        document.addEventListener('mouseleave', () => {
            mouseX = mouseY = -9999;
        });
    }

    const syncStarSettings = () => {
        maxShooters = mobile ? 2 : 6;
        hoverRadius = mobile ? 100 : 155;
        starDensity = mobile ? 5200 : 1650;
    };

    function resizeStars() {
        if (!ctx) return;
        syncStarSettings();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const w = innerWidth;
        const h = innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const n = Math.floor((w * h) / starDensity);
        stars = Array.from({ length: n }, () => {
            const roll = Math.random();
            const planet = roll > 0.68;
            return {
                x: Math.random() * w,
                y: Math.random() * h,
                r: planet ? Math.random() * 1.1 + 0.55 : Math.random() * 0.35 + 0.1,
                o: planet ? Math.random() * 0.22 + 0.42 : Math.random() * 0.28 + 0.22,
                s: Math.random() * 0.0025 + 0.0008,
                s2: Math.random() * 0.004 + 0.0015,
                p: Math.random() * 6.28,
                p2: Math.random() * 6.28,
                tw: Math.random() * 0.12 + 0.06,
                planet,
                c: roll > 0.88 ? '196,176,214' : roll > 0.72 ? '220,188,204' : roll > 0.5 ? '232,220,236' : '248,244,250',
            };
        });
        shooters.length = 0;
    }

    function spawnShooter() {
        const roll = Math.random();
        const w = innerWidth;
        const h = innerHeight;
        let x;
        let y;
        let angle;

        if (roll < 0.4) {
            x = Math.random() * w;
            y = -10;
            angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
        } else if (roll < 0.7) {
            x = -10;
            y = Math.random() * h * 0.55;
            angle = Math.PI / 5.5 + Math.random() * 0.2;
        } else {
            x = w + 10;
            y = Math.random() * h * 0.45;
            angle = Math.PI * 0.72 + (Math.random() - 0.5) * 0.2;
        }

        shooters.push({
            x,
            y,
            len: 32 + Math.random() * 48,
            spd: 2.8 + Math.random() * 2.5,
            ang: angle,
            life: 0,
            max: 45 + Math.random() * 40,
            o: 0.18 + Math.random() * 0.22,
        });
        nextShoot = performance.now() + 1800 + Math.random() * 3200;
    }

    function draw(now) {
        if (!running || !ctx) return;

        const w = innerWidth;
        const h = innerHeight;
        ctx.clearRect(0, 0, w, h);
        const t = now * 0.001;

        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const baseAlpha = s.o * 0.8;
            let near = 0;

            if (!coarsePointer) {
                const dist = Math.hypot(s.x - mouseX, s.y - mouseY);
                if (dist < hoverRadius) {
                    near = Math.pow(1 - dist / hoverRadius, 1.3);
                }
            }

            if (near < 0.025) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, 6.28);
                ctx.fillStyle = `rgba(${s.c},${baseAlpha})`;
                ctx.fill();
                continue;
            }

            const wave1 = Math.sin(t * s.s * 10 + s.p);
            const wave2 = Math.sin(t * s.s2 * 10 + s.p2);
            const breathe = s.planet
                ? 0.92 + s.tw * (0.1 + 0.06 * wave1 + 0.03 * wave2)
                : 0.86 + s.tw * (0.15 + 0.1 * wave1 + 0.04 * wave2);
            const liveAlpha = Math.min(1, s.o * breathe * (1 + near * 0.45));
            const alpha = baseAlpha + (liveAlpha - baseAlpha) * Math.min(1, near * 1.2);
            const color = near > 0.45 ? '252,246,252' : s.c;

            if (s.planet && near > 0.1) {
                const haloR = s.r * (1.9 + near * 1.6 + 0.1 * wave1);
                const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
                halo.addColorStop(0, `rgba(${color},${Math.min(1, alpha * 1.05 * near)})`);
                halo.addColorStop(0.38, `rgba(${color},${alpha * 0.34 * near})`);
                halo.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.beginPath();
                ctx.arc(s.x, s.y, haloR, 0, 6.28);
                ctx.fillStyle = halo;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r * (0.9 + near * 0.18 + 0.04 * wave2), 0, 6.28);
                ctx.fillStyle = `rgba(255,250,254,${Math.min(1, alpha * (0.9 + near * 0.35))})`;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r * (1 + near * 0.4), 0, 6.28);
                ctx.fillStyle = `rgba(${color},${alpha})`;
                ctx.fill();
            }
        }

        if (now >= nextShoot && shooters.length < maxShooters) spawnShooter();

        for (let i = shooters.length - 1; i >= 0; i--) {
            const sh = shooters[i];
            sh.life++;
            sh.x += Math.cos(sh.ang) * sh.spd;
            sh.y += Math.sin(sh.ang) * sh.spd;
            const prog = sh.life / sh.max;
            const fade = sh.o * (prog < 0.15 ? prog / 0.15 : 1 - (prog - 0.15) / 0.85);

            if (sh.life >= sh.max || sh.y > h + 20 || sh.x > w + 20 || sh.x < -20) {
                shooters.splice(i, 1);
                continue;
            }

            const tx = sh.x - Math.cos(sh.ang) * sh.len;
            const ty = sh.y - Math.sin(sh.ang) * sh.len;
            const g = ctx.createLinearGradient(tx, ty, sh.x, sh.y);
            g.addColorStop(0, 'rgba(255,248,252,0)');
            g.addColorStop(0.6, `rgba(230,190,220,${fade * 0.45})`);
            g.addColorStop(1, `rgba(255,220,240,${fade})`);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(sh.x, sh.y);
            ctx.strokeStyle = g;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sh.x, sh.y, 0.9, 0, 6.28);
            ctx.fillStyle = `rgba(255,235,245,${fade * 0.7})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    const onStarResize = rafThrottle(resizeStars);
    const startStars = () => {
        if (!ctx || reduced) return;
        resizeStars();
        running = true;
        requestAnimationFrame(draw);
    };

    const stopStars = () => {
        running = false;
        ctx?.clearRect(0, 0, innerWidth, innerHeight);
    };

    if (ctx) {
        startStars();
        window.addEventListener('resize', onStarResize, { passive: true });
        mobileMq.addEventListener('change', onStarResize);
        reducedMq.addEventListener('change', (e) => (e.matches ? stopStars() : startStars()));
        document.addEventListener('visibilitychange', () => {
            if (reduced || !ctx) return;
            running = !document.hidden;
            if (running) requestAnimationFrame(draw);
            else stopStars();
        });
    }

    /* ── Hero heart-powered line galaxy flower ── */
    const heroSection = document.getElementById('hero');
    const heroLinesCanvas = document.getElementById('heroLinesCanvas');
    const heroLinesCtx = heroLinesCanvas?.getContext('2d', { alpha: true });

    if (heroSection && heroLinesCtx && !reduced) {
        let heroLinesRunning = true;
        let heroAngle = 0;
        let arms = [];
        let filaments = [];
        let fieldStars = [];
        let powerRays = [];
        let energyOrbs = [];
        let rimCharges = [];
        const PETALS = 12;

        const rimNodes = [
            [0, -1], [0.433, -0.75], [0.75, -0.433], [0.85, 0],
            [0.75, 0.433], [0.433, 0.75], [0, 1], [-0.433, 0.75],
            [-0.85, 0.433], [-0.95, 0], [-0.85, -0.433], [-0.433, -0.75],
        ];

        const heartPoint = (cx, cy, scale, ang) => {
            const x = scale * 16 * Math.pow(Math.sin(ang), 3);
            const y = scale * (-(13 * Math.cos(ang) - 5 * Math.cos(2 * ang) - 2 * Math.cos(3 * ang) - Math.cos(4 * ang)));
            return { x: cx + x, y: cy + y * 0.92 };
        };

        const buildLineGalaxy = (w, h) => {
            const cx = w * 0.5;
            const cy = h * 0.5;
            const maxR = Math.min(w, h) * 0.44;
            const armCount = 6;
            arms = [];

            for (let a = 0; a < armCount; a++) {
                const base = (a / armCount) * Math.PI * 2 + 0.12;
                const pts = [];
                const steps = 160;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const petalWave = 1 + Math.sin(t * PETALS * 0.52 + base) * 0.06;
                    const theta = base + t * 5.1 + Math.sin(t * 9) * 0.1;
                    const r = maxR * Math.pow(t, 0.78) * (0.32 + t * 0.78) * petalWave;
                    pts.push({
                        x: cx + Math.cos(theta) * r,
                        y: cy + Math.sin(theta) * r * 0.9,
                        tw: Math.random() * 6.28,
                        sp: 1 + Math.random() * 2.8,
                    });
                }
                arms.push(pts);
            }

            filaments = [];
            for (let a = 0; a < armCount; a++) {
                const next = (a + 1) % armCount;
                for (let i = 10; i < arms[a].length; i += 12) {
                    if (Math.random() > 0.48) continue;
                    const j = Math.min(arms[next].length - 1, i + Math.floor(Math.random() * 20));
                    filaments.push({ a: arms[a][i], b: arms[next][j], tw: Math.random() * 6.28 });
                }
            }

            const rimR = maxR * 0.92;
            powerRays = rimNodes.map(([nx, ny], i) => ({
                ex: cx + nx * rimR,
                ey: cy + ny * rimR * 0.9,
                i,
                tw: Math.random() * 6.28,
            }));

            energyOrbs = powerRays.map((r, i) => ({
                ray: r,
                phase: i / PETALS + Math.random() * 0.08,
                speed: 0.26 + (i % 4) * 0.04,
            }));

            rimCharges = powerRays.map(() => ({ hit: 0, rebound: 0 }));

            fieldStars = Array.from({ length: Math.floor((w * h) / 5200) }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.1 + 0.12,
                tw: Math.random() * 6.28,
                sp: 0.35 + Math.random() * 2,
                o: Math.random() * 0.4 + 0.06,
            }));
        };

        const resizeHeroLines = () => {
            const rect = heroSection.getBoundingClientRect();
            const dpr = Math.min(devicePixelRatio || 1, 2);
            heroLinesCanvas.width = Math.round(rect.width * dpr);
            heroLinesCanvas.height = Math.round(rect.height * dpr);
            heroLinesCanvas.style.width = `${rect.width}px`;
            heroLinesCanvas.style.height = `${rect.height}px`;
            heroLinesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildLineGalaxy(rect.width, rect.height);
        };

        const drawTwinkle = (x, y, r, alpha, t, tw, sp, flare) => {
            const pulse = 0.4 + 0.6 * Math.sin(t * sp + tw);
            const a = alpha * pulse;
            heroLinesCtx.beginPath();
            heroLinesCtx.arc(x, y, r * pulse, 0, Math.PI * 2);
            heroLinesCtx.fillStyle = `rgba(255,255,255,${a})`;
            heroLinesCtx.fill();
            if (flare && pulse > 0.72) {
                heroLinesCtx.strokeStyle = `rgba(255,255,255,${a * 0.4})`;
                heroLinesCtx.lineWidth = 0.45;
                const len = r * (flare === true ? 3.5 : flare);
                heroLinesCtx.beginPath();
                heroLinesCtx.moveTo(x - len, y);
                heroLinesCtx.lineTo(x + len, y);
                heroLinesCtx.moveTo(x, y - len);
                heroLinesCtx.lineTo(x, y + len);
                if (pulse > 0.88) {
                    heroLinesCtx.moveTo(x - len * 0.7, y - len * 0.7);
                    heroLinesCtx.lineTo(x + len * 0.7, y + len * 0.7);
                    heroLinesCtx.moveTo(x + len * 0.7, y - len * 0.7);
                    heroLinesCtx.lineTo(x - len * 0.7, y + len * 0.7);
                }
                heroLinesCtx.stroke();
            }
        };

        const drawHeartWire = (cx, cy, scale, t) => {
            const beat = 1 + 0.07 * Math.sin(t * 4.4) + 0.04 * Math.sin(t * 8.8);
            const steps = 72;
            heroLinesCtx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const ang = (i / steps) * Math.PI * 2;
                const p = heartPoint(cx, cy, scale * beat, ang);
                if (i === 0) heroLinesCtx.moveTo(p.x, p.y);
                else heroLinesCtx.lineTo(p.x, p.y);
            }
            heroLinesCtx.closePath();
            const glow = 0.18 + 0.12 * Math.sin(t * 4.4);
            heroLinesCtx.strokeStyle = `rgba(255,210,225,${glow})`;
            heroLinesCtx.lineWidth = 0.85;
            heroLinesCtx.stroke();

            heroLinesCtx.save();
            heroLinesCtx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 4.4);
            const grad = heroLinesCtx.createRadialGradient(cx, cy - scale * 4, 0, cx, cy, scale * 14);
            grad.addColorStop(0, 'rgba(255,200,215,0.5)');
            grad.addColorStop(0.5, 'rgba(232,120,152,0.15)');
            grad.addColorStop(1, 'rgba(232,120,152,0)');
            heroLinesCtx.fillStyle = grad;
            heroLinesCtx.fill();
            heroLinesCtx.restore();
        };

        const drawHeroLines = (now) => {
            if (!heroLinesRunning) return;
            const rect = heroSection.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            const cx = w * 0.5;
            const cy = h * 0.5;
            const t = now * 0.001;
            const heartScale = Math.min(w, h) * 0.018;
            heroAngle += 0.00014;

            heroLinesCtx.clearRect(0, 0, w, h);

            for (let i = 0; i < fieldStars.length; i++) {
                const s = fieldStars[i];
                drawTwinkle(s.x, s.y, s.r, s.o, t, s.tw, s.sp, s.r > 0.7);
            }

            heroLinesCtx.save();
            heroLinesCtx.translate(cx, cy);
            heroLinesCtx.rotate(heroAngle);
            heroLinesCtx.translate(-cx, -cy);

            for (let a = 0; a < arms.length; a++) {
                const pts = arms[a];
                heroLinesCtx.beginPath();
                heroLinesCtx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) heroLinesCtx.lineTo(pts[i].x, pts[i].y);
                heroLinesCtx.strokeStyle = `rgba(255,255,255,${0.07 + (a % 3) * 0.035})`;
                heroLinesCtx.lineWidth = 0.7;
                heroLinesCtx.stroke();

                for (let i = 0; i < pts.length; i += 4) {
                    const p = pts[i];
                    const dist = Math.hypot(p.x - cx, p.y - cy);
                    const edge = 1 - dist / (Math.min(w, h) * 0.48);
                    drawTwinkle(p.x, p.y, 0.5 + edge * 0.65, 0.1 + edge * 0.38, t, p.tw, p.sp, edge > 0.55);
                }
            }

            for (let i = 0; i < filaments.length; i++) {
                const f = filaments[i];
                const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.4 + f.tw));
                heroLinesCtx.beginPath();
                heroLinesCtx.moveTo(f.a.x, f.a.y);
                heroLinesCtx.lineTo(f.b.x, f.b.y);
                heroLinesCtx.strokeStyle = `rgba(255,255,255,${0.05 * pulse})`;
                heroLinesCtx.lineWidth = 0.38;
                heroLinesCtx.stroke();
            }

            heroLinesCtx.restore();

            for (let i = 0; i < powerRays.length; i++) {
                const r = powerRays[i];
                const wave = 0.5 + 0.5 * Math.sin(t * 2.2 + r.tw + r.i * 0.4);
                heroLinesCtx.beginPath();
                heroLinesCtx.moveTo(cx, cy + 4);
                heroLinesCtx.lineTo(r.ex, r.ey);
                heroLinesCtx.strokeStyle = `rgba(255,220,232,${0.04 + wave * 0.08})`;
                heroLinesCtx.lineWidth = 0.55;
                heroLinesCtx.setLineDash([3, 14]);
                heroLinesCtx.lineDashOffset = -t * 40 - r.i * 8;
                heroLinesCtx.stroke();
                heroLinesCtx.setLineDash([]);
            }

            for (let i = 0; i < energyOrbs.length; i++) {
                const o = energyOrbs[i];
                const r = o.ray;
                const charge = rimCharges[i];
                const cycle = (o.phase + t * o.speed) % 1;
                const ox = cx + (r.ex - cx) * cycle;
                const oy = cy + 4 + (r.ey - cy - 4) * cycle;
                const travelGlow = Math.sin(cycle * Math.PI);
                const orbA = 0.18 + travelGlow * 0.62;

                const arrival = cycle > 0.84
                    ? Math.sin(((cycle - 0.84) / 0.16) * Math.PI * 0.5)
                    : 0;
                const rebound = cycle < 0.18
                    ? Math.sin((1 - cycle / 0.18) * Math.PI * 0.5) * 0.8
                    : 0;

                charge.hit = Math.max(charge.hit * 0.9, arrival);
                charge.rebound = Math.max(charge.rebound * 0.86, rebound);

                drawTwinkle(ox, oy, 0.9 + travelGlow * 0.8, orbA, t, r.tw, 3, travelGlow > 0.35 ? 2.5 : false);

                const linger = charge.hit * (0.3 + 0.7 * Math.sin(t * 3.6 + r.i * 0.5));
                const rimA = Math.min(1, 0.1 + arrival * 0.75 + linger + charge.rebound * 0.55);
                const rimR = 1.5 + charge.hit * 2 + charge.rebound * 1.6 + arrival * 0.8;
                drawTwinkle(r.ex, r.ey, rimR, rimA, t, r.tw, 2.6 + r.i * 0.1, 3.5);
            }

            drawHeartWire(cx, cy + 2, heartScale, t);
            drawTwinkle(cx, cy + 2, 2.5, 0.42 + 0.2 * Math.sin(t * 3.8), t, 0, 2, 3.5);

            requestAnimationFrame(drawHeroLines);
        };

        resizeHeroLines();
        requestAnimationFrame(drawHeroLines);
        window.addEventListener('resize', rafThrottle(resizeHeroLines), { passive: true });
        document.addEventListener('visibilitychange', () => {
            heroLinesRunning = !document.hidden;
            if (heroLinesRunning) requestAnimationFrame(drawHeroLines);
        });
        reducedMq.addEventListener('change', (e) => {
            heroLinesRunning = !e.matches;
            if (heroLinesRunning) requestAnimationFrame(drawHeroLines);
        });
    }

    /* ── Services & Process journey (sj) ── */
    const sj = document.getElementById('sj');
    const sjConverge = document.getElementById('sjConverge');
    const sjChoose = document.getElementById('sjChoose');
    const sjStarsCanvas = document.getElementById('sjStars');

    if (sj) {
        const sjPaths = sjConverge ? [...sjConverge.querySelectorAll('.sj-converge-path')] : [];
        const sjOffers = [...sj.querySelectorAll('.sj-offer')];
        const sjChips = [...sj.querySelectorAll('.sj-chip')];
        const sjLinkOffers = ['gold', 'pink', 'mint', 'peach'];

        const clearSjLink = () => {
            sj.classList.remove('sj-link-all', ...sjLinkOffers.map((o) => `sj-link-${o}`));
        };

        const setSjLink = (offer) => {
            clearSjLink();
            if (offer === 'all') sj.classList.add('sj-link-all');
            else if (offer) sj.classList.add(`sj-link-${offer}`);
        };

        const bindSjLink = (el, offer) => {
            const activate = () => setSjLink(offer);
            el.addEventListener('mouseenter', activate);
            el.addEventListener('focusin', activate);
            el.addEventListener('touchstart', activate, { passive: true });
        };

        sjOffers.forEach((el) => bindSjLink(el, el.dataset.sjOffer));
        sjChips.forEach((el) => {
            const tone = sjLinkOffers.find((o) => el.classList.contains(`sj-chip--${o}`));
            if (tone) bindSjLink(el, tone);
        });
        sjChoose?.addEventListener('mouseenter', () => setSjLink('all'));
        sjChoose?.addEventListener('focusin', () => setSjLink('all'));
        sj.addEventListener('mouseleave', clearSjLink);
        sj.addEventListener('focusout', (e) => {
            if (!sj.contains(e.relatedTarget)) clearSjLink();
        });

        const updateSjTimeline = () => {
            const wrap = sj.querySelector('.sj-timeline-wrap');
            if (!wrap) return;
            const rect = wrap.getBoundingClientRect();
            const vh = innerHeight;
            const start = vh * 0.8;
            const end = vh * 0.22;
            const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height * 0.35)));
            sj.style.setProperty('--sj-progress', progress.toFixed(3));
        };

        const drawSjConverge = () => {
            if (!sjConverge || !sjChoose || mobileMq.matches || innerWidth <= 900) {
                sjPaths.forEach((p) => p.setAttribute('d', ''));
                return;
            }

            const mid = sj.querySelector('.sj-mid');
            if (!mid) return;
            const midRect = mid.getBoundingClientRect();
            const chooseNode = sjChoose.querySelector('.sj-node');
            const chooseRect = chooseNode?.getBoundingClientRect();
            if (!chooseRect) return;

            const targetX = chooseRect.left + chooseRect.width / 2 - midRect.left;
            const targetY = chooseRect.top + chooseRect.height / 2 - midRect.top;

            let drew = false;
            sjPaths.forEach((path) => {
                const offer = path.dataset.sjOffer;
                const item = sj.querySelector(`.sj-offer--${offer}`);
                if (!item) return;
                const itemRect = item.getBoundingClientRect();
                const x1 = itemRect.left + itemRect.width / 2 - midRect.left;
                const y1 = itemRect.bottom - midRect.top;
                const cx = (x1 + targetX) / 2;
                const cy = y1 + Math.max(16, (targetY - y1) * 0.4);

                path.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${cy} ${targetX} ${targetY}`);
                const len = path.getTotalLength();
                if (len <= 0) return;
                drew = true;
                path.style.strokeDasharray = `${len}`;
                path.style.strokeDashoffset = sj.classList.contains('sj-converge-ready') ? '0' : `${len}`;
            });

            if (drew) sj.classList.add('sj-converge-ready');
        };

        const activateSj = () => {
            drawSjConverge();
            requestAnimationFrame(() => {
                sj.classList.add('sj-active');
                updateSjTimeline();
                if (!sj.classList.contains('sj-converge-ready')) return;
                sjPaths.forEach((path) => {
                    const len = path.getTotalLength();
                    if (len <= 0) return;
                    path.style.strokeDashoffset = `${len}`;
                });
                requestAnimationFrame(() => {
                    sjPaths.forEach((path) => {
                        if (path.getTotalLength() > 0) path.style.strokeDashoffset = '0';
                    });
                });
            });
        };

        const sjObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    activateSj();
                    sjObserver.unobserve(sj);
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
        );
        sjObserver.observe(sj);

        const onSjLayout = rafThrottle(() => {
            updateSjTimeline();
            drawSjConverge();
        });

        window.addEventListener('scroll', rafThrottle(updateSjTimeline), { passive: true });
        window.addEventListener('resize', onSjLayout, { passive: true });
        layoutListeners.add(onSjLayout);

        reducedMq.addEventListener('change', (e) => {
            if (e.matches) sj.style.setProperty('--sj-progress', '1');
            else updateSjTimeline();
            drawSjConverge();
        });
        mobileMq.addEventListener('change', drawSjConverge);

        if (sjStarsCanvas && !reduced && !mobileMq.matches) {
            const sjCtx = sjStarsCanvas.getContext('2d');
            let sjStarsRunning = false;
            let sjStarPoints = [];

            const resizeSjStars = () => {
                if (!sjCtx) return;
                const rect = sj.getBoundingClientRect();
                const dpr = Math.min(devicePixelRatio || 1, 2);
                sjStarsCanvas.width = Math.round(rect.width * dpr);
                sjStarsCanvas.height = Math.round(rect.height * dpr);
                sjStarsCanvas.style.width = `${rect.width}px`;
                sjStarsCanvas.style.height = `${rect.height}px`;
                sjCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
                const count = mobileMq.matches ? 28 : 56;
                sjStarPoints = Array.from({ length: count }, () => ({
                    x: Math.random() * rect.width,
                    y: Math.random() * rect.height,
                    r: 0.35 + Math.random() * 1.1,
                    tw: 0.35 + Math.random() * 0.65,
                    p: Math.random() * Math.PI * 2,
                    s: 2.5 + Math.random() * 4,
                    c: Math.random() > 0.45 ? '230,190,220' : '126,196,196',
                    o: 0.12 + Math.random() * 0.38,
                }));
            };

            const drawSjStars = (now) => {
                if (!sjStarsRunning || !sjCtx) return;
                const w = sjStarsCanvas.clientWidth;
                const h = sjStarsCanvas.clientHeight;
                sjCtx.clearRect(0, 0, w, h);
                const t = now * 0.001;
                for (let i = 0; i < sjStarPoints.length; i++) {
                    const s = sjStarPoints[i];
                    const tw = 0.45 + s.tw * (0.55 + 0.45 * Math.sin(t * s.s + s.p));
                    sjCtx.beginPath();
                    sjCtx.arc(s.x, s.y, s.r * (0.85 + tw * 0.25), 0, Math.PI * 2);
                    sjCtx.fillStyle = `rgba(${s.c},${Math.min(1, s.o * tw)})`;
                    sjCtx.fill();
                }
                requestAnimationFrame(drawSjStars);
            };

            const startSjStars = () => {
                if (reduced) return;
                resizeSjStars();
                if (!sjStarsRunning) {
                    sjStarsRunning = true;
                    requestAnimationFrame(drawSjStars);
                }
            };

            const stopSjStars = () => {
                sjStarsRunning = false;
                sjCtx?.clearRect(0, 0, sjStarsCanvas.clientWidth, sjStarsCanvas.clientHeight);
            };

            const sjStarsObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) startSjStars();
                        else stopSjStars();
                    });
                },
                { threshold: 0.05 }
            );
            sjStarsObserver.observe(sj);
            layoutListeners.add(resizeSjStars);
            reducedMq.addEventListener('change', (e) => (e.matches ? stopSjStars() : startSjStars()));
        }
    }

})();