/* ==========================================================================
   Trillion AI Tech — site behaviour
   All state is held in memory. No localStorage/sessionStorage is used
   anywhere (the site must run inside sandboxed iframes that block storage).
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------ in-memory state */
  const state = {
    theme: 'dark', // dark is the default given the art direction
    view: 'home',
    filter: 'all',
    bestScore: 0,
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ============================================================ theme toggle */
  const SUN = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2 12h2M20 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"/></svg>';
  const MOON = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.5 13.2A8.6 8.6 0 1 1 10.8 3.5a6.7 6.7 0 0 0 9.7 9.7z"/></svg>';

  const themeToggle = $('[data-theme-toggle]');

  // Assigned once the canvases are initialised further down.
  let repaintCanvases = () => {};

  function applyTheme(theme) {
    state.theme = theme;
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' ? SUN : MOON;
      themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      themeToggle.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#070910' : '#f2f3f6');
    repaintCanvases();
  }

  applyTheme('dark');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
  }

  const token = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  };

  /* ============================================================ mobile nav */
  const navToggle = $('#nav-toggle');
  const mobileNav = $('#mobile-nav');

  function setMobileNav(open) {
    if (!mobileNav || !navToggle) return;
    mobileNav.dataset.open = String(open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => setMobileNav(mobileNav.dataset.open !== 'true'));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav && mobileNav.dataset.open === 'true') {
      setMobileNav(false);
      navToggle.focus();
    }
  });

  /* ============================================================ hash router */
  const VIEWS = ['home', 'labs', 'games', 'studio', 'contact'];
  const views = $$('[data-view]');
  const navLinks = $$('a[data-nav]');

  function showView(name, { focus = false } = {}) {
    const target = VIEWS.includes(name) ? name : 'home';
    state.view = target;

    views.forEach((v) => v.classList.toggle('is-active', v.dataset.view === target));
    navLinks.forEach((a) => {
      const href = (a.getAttribute('href') || '').replace('#', '');
      if (VIEWS.includes(href)) {
        if (href === target) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    });

    setMobileNav(false);
    observeReveals();
    if (target === 'games') sizeGameCanvas();
    if (target === 'home') paintHero(true);

    if (focus) {
      const heading = $('.is-active h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  function currentHash() {
    return (location.hash || '#home').replace('#', '').split('?')[0];
  }

  window.addEventListener('hashchange', () => showView(currentHash(), { focus: true }));

  // Intercept nav clicks so a repeat click on the active view still scrolls/behaves.
  navLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = (a.getAttribute('href') || '').replace('#', '');
      if (!VIEWS.includes(href)) return;

      const inquiry = a.dataset.inquiry;
      const filterLink = a.dataset.filterLink;

      if (href === currentHash()) {
        e.preventDefault();
        showView(href, { focus: true });
      }
      if (inquiry) prefillInquiry(inquiry);
      if (filterLink) applyFilter(filterLink);
    });
  });

  /* ============================================================ reveal on scroll */
  let io = null;
  function observeReveals() {
    if (reducedMotion.matches) {
      $$('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              el.style.transitionDelay = `${Math.min(i * 70, 280)}ms`;
              el.classList.add('is-visible');
              io.unobserve(el);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
      );
    }
    $$('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
  }
  observeReveals();
  reducedMotion.addEventListener('change', observeReveals);

  /* ============================================================ labs filtering */
  const filterButtons = $$('.filter');
  const projects = $$('#manifest .project');
  const filterCount = $('#filter-count');
  const manifestEmpty = $('#manifest-empty');

  function applyFilter(area) {
    state.filter = area;
    let visible = 0;
    projects.forEach((card) => {
      const match = area === 'all' || card.dataset.area === area;
      card.hidden = !match;
      if (match) visible += 1;
    });
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === area)));
    if (filterCount) filterCount.textContent = `${visible} of ${projects.length} entries`;
    if (manifestEmpty) manifestEmpty.hidden = visible !== 0;
  }

  filterButtons.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
  applyFilter('all');

  /* ============================================================ hero signal field */
  const heroCanvas = $('#hero-canvas');
  const heroCtx = heroCanvas ? heroCanvas.getContext('2d') : null;
  let heroT = 0;
  let heroRaf = null;
  let heroDims = { w: 0, h: 0 };

  function sizeHero() {
    if (!heroCanvas) return;
    const rect = heroCanvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroCanvas.width = Math.round(rect.width * dpr);
    heroCanvas.height = Math.round(rect.height * dpr);
    heroDims = { w: rect.width, h: rect.height };
    heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paintHero(force = false) {
    if (!heroCtx) return;
    if (!heroDims.w || force) sizeHero();
    const { w, h } = heroDims;
    if (!w) return;

    const bg = token('--panel-bg', '#04060b');
    const line = token('--panel-line', 'rgba(140,160,200,0.18)');
    const accent = token('--color-accent', '#f4762b');
    const text = token('--panel-node', '#6b7688');

    heroCtx.clearRect(0, 0, w, h);
    heroCtx.fillStyle = bg;
    heroCtx.fillRect(0, 0, w, h);

    const cols = Math.max(9, Math.round(w / 34));
    const rows = Math.max(7, Math.round(h / 34));
    const gx = w / (cols + 1);
    const gy = h / (rows + 1);

    // travelling wave origin
    const cx = w * (0.5 + 0.3 * Math.cos(heroT * 0.28));
    const cy = h * (0.5 + 0.26 * Math.sin(heroT * 0.21));

    // faint lattice — vertical rails plus horizontal rules
    heroCtx.strokeStyle = line;
    heroCtx.lineWidth = 1;
    heroCtx.globalAlpha = 0.7;
    heroCtx.beginPath();
    for (let c = 1; c <= cols; c++) {
      heroCtx.moveTo(Math.round(c * gx) + 0.5, gy * 0.6);
      heroCtx.lineTo(Math.round(c * gx) + 0.5, h - gy * 0.6);
    }
    heroCtx.stroke();
    heroCtx.globalAlpha = 0.4;
    heroCtx.beginPath();
    for (let r = 1; r <= rows; r += 2) {
      heroCtx.moveTo(gx * 0.6, Math.round(r * gy) + 0.5);
      heroCtx.lineTo(w - gx * 0.6, Math.round(r * gy) + 0.5);
    }
    heroCtx.stroke();
    heroCtx.globalAlpha = 1;

    const maxD = Math.hypot(w, h) * 0.55;

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const x = c * gx;
        const y = r * gy;
        const d = Math.hypot(x - cx, y - cy);
        const wave = Math.sin(d / 26 - heroT * 1.6);
        const energy = Math.max(0, wave) * Math.max(0, 1 - d / maxD);

        const size = 1.4 + energy * 3.6;
        heroCtx.beginPath();
        heroCtx.arc(x, y + (reducedMotion.matches ? 0 : energy * -4), size, 0, Math.PI * 2);
        if (energy > 0.34) {
          heroCtx.fillStyle = accent;
          heroCtx.globalAlpha = 0.45 + energy * 0.55;
        } else {
          heroCtx.fillStyle = text;
          heroCtx.globalAlpha = 0.35 + energy * 0.5;
        }
        heroCtx.fill();
        heroCtx.globalAlpha = 1;

        // crest ring on the strongest nodes
        if (energy > 0.82) {
          heroCtx.strokeStyle = accent;
          heroCtx.globalAlpha = (energy - 0.82) * 2.2;
          heroCtx.lineWidth = 1;
          heroCtx.beginPath();
          heroCtx.arc(x, y, size + 5, 0, Math.PI * 2);
          heroCtx.stroke();
          heroCtx.globalAlpha = 1;
        }
      }
    }

    // concentric wavefronts radiating from the pulse origin
    heroCtx.strokeStyle = accent;
    heroCtx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const phase = ((heroT * 1.6) % (Math.PI * 2)) / (Math.PI * 2);
      const rr = ((k + phase) / 3) * maxD * 0.9;
      heroCtx.globalAlpha = 0.22 * (1 - rr / (maxD * 0.9));
      heroCtx.beginPath();
      heroCtx.arc(cx, cy, rr, 0, Math.PI * 2);
      heroCtx.stroke();
    }
    heroCtx.globalAlpha = 1;

    // scan bracket
    const scanY = reducedMotion.matches ? h * 0.62 : h * (0.5 + 0.34 * Math.sin(heroT * 0.5));
    heroCtx.strokeStyle = accent;
    heroCtx.globalAlpha = 0.5;
    heroCtx.beginPath();
    heroCtx.moveTo(gx * 0.5, scanY);
    heroCtx.lineTo(w - gx * 0.5, scanY);
    heroCtx.stroke();
    heroCtx.globalAlpha = 1;
  }

  function heroLoop() {
    heroT += 0.016;
    paintHero();
    heroRaf = requestAnimationFrame(heroLoop);
  }

  function startHero() {
    if (!heroCtx) return;
    sizeHero();
    if (reducedMotion.matches) {
      heroT = 1.2;
      paintHero();
      return;
    }
    if (heroRaf) cancelAnimationFrame(heroRaf);
    heroLoop();
  }

  function stopHero() {
    if (heroRaf) cancelAnimationFrame(heroRaf);
    heroRaf = null;
  }

  if (heroCanvas) {
    startHero();
    // Pause the render whenever the hero is off-screen or the tab is hidden.
    const heroIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting && !document.hidden ? startHero() : stopHero()));
      },
      { threshold: 0.05 }
    );
    heroIO.observe(heroCanvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stopHero() : startHero()));
    reducedMotion.addEventListener('change', startHero);
  }

  /* ============================================================ Signal Console game */
  const gameCanvas = $('#game-canvas');
  const gctx = gameCanvas ? gameCanvas.getContext('2d') : null;
  const GRID = 6;
  const ROUND_SECONDS = 45;

  const game = {
    mode: 'idle', // idle | playing | paused | over
    carrier: { x: 2, y: 2 },
    signal: null,
    score: 0,
    streak: 0,
    timeLeft: ROUND_SECONDS,
    last: 0,
    raf: null,
    pulse: 0,
    flash: 0,
  };

  const hud = {
    score: $('#hud-score'),
    streak: $('#hud-streak'),
    time: $('#hud-time'),
    best: $('#hud-best'),
  };
  const overlay = $('#game-overlay');
  const overlayTitle = $('#overlay-title');
  const overlayText = $('#overlay-text');
  const overlayStart = $('#overlay-start');
  const playBtn = $('#game-play');
  const resetBtn = $('#game-reset');
  const gameStatus = $('#game-status');

  let gameDims = { size: 0, cell: 0, pad: 0 };

  function sizeGameCanvas() {
    if (!gameCanvas) return;
    const rect = gameCanvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    gameCanvas.width = Math.round(rect.width * dpr);
    gameCanvas.height = Math.round(rect.height * dpr);
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.min(rect.width, rect.height);
    gameDims = { size, cell: (size - 24) / GRID, pad: 12 + (rect.width - size) / 2, padY: 12 + (rect.height - size) / 2 };
    drawGame();
  }

  function cellRect(cx, cy) {
    const { cell, pad, padY } = gameDims;
    return { x: pad + cx * cell, y: padY + cy * cell, w: cell, h: cell };
  }

  function spawnSignal() {
    const reach = Math.max(2, 5 - Math.floor(game.streak / 3));
    let x;
    let y;
    let tries = 0;
    do {
      x = Math.floor(Math.random() * GRID);
      y = Math.floor(Math.random() * GRID);
      tries += 1;
    } while (
      tries < 40 &&
      ((x === game.carrier.x && y === game.carrier.y) ||
        Math.abs(x - game.carrier.x) + Math.abs(y - game.carrier.y) > reach)
    );
    const base = reducedMotion.matches ? 3.4 : 2.6;
    game.signal = { x, y, charge: 1, life: Math.max(1.5, base - game.streak * 0.06) };
  }

  function setStatus(msg) {
    if (gameStatus) gameStatus.textContent = msg;
  }

  function syncHud() {
    if (hud.score) hud.score.textContent = String(game.score);
    if (hud.streak) hud.streak.textContent = String(game.streak);
    if (hud.time) hud.time.textContent = String(Math.max(0, Math.ceil(game.timeLeft)));
    if (hud.best) hud.best.textContent = String(state.bestScore);
  }

  function showOverlay(title, text, buttonLabel) {
    if (!overlay) return;
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayStart.textContent = buttonLabel;
    overlay.hidden = false;
  }

  function startRound() {
    game.mode = 'playing';
    game.score = 0;
    game.streak = 0;
    game.timeLeft = ROUND_SECONDS;
    game.carrier = { x: 2, y: 2 };
    game.last = performance.now();
    if (overlay) overlay.hidden = true;
    if (playBtn) playBtn.textContent = 'Pause';
    spawnSignal();
    syncHud();
    setStatus('Round started. Move the carrier onto the lit node.');
    loopGame(game.last);
  }

  function pauseRound() {
    if (game.mode !== 'playing') return;
    game.mode = 'paused';
    cancelAnimationFrame(game.raf);
    if (playBtn) playBtn.textContent = 'Resume';
    showOverlay('Paused', 'The round is on hold. Resume when you are ready.', 'Resume round');
    setStatus('Round paused.');
  }

  function resumeRound() {
    if (game.mode !== 'paused') return;
    game.mode = 'playing';
    game.last = performance.now();
    if (overlay) overlay.hidden = true;
    if (playBtn) playBtn.textContent = 'Pause';
    setStatus('Round resumed.');
    loopGame(game.last);
  }

  function endRound() {
    game.mode = 'over';
    cancelAnimationFrame(game.raf);
    game.signal = null;
    if (game.score > state.bestScore) state.bestScore = game.score;
    if (playBtn) playBtn.textContent = 'Start round';
    syncHud();
    showOverlay(
      'Round complete',
      `You scored ${game.score}. Best this visit: ${state.bestScore}. Scores are kept in memory only.`,
      'Play again'
    );
    setStatus(`Round complete. Score ${game.score}.`);
    drawGame();
  }

  function resetGame() {
    cancelAnimationFrame(game.raf);
    game.mode = 'idle';
    game.score = 0;
    game.streak = 0;
    game.timeLeft = ROUND_SECONDS;
    game.carrier = { x: 2, y: 2 };
    game.signal = null;
    if (playBtn) playBtn.textContent = 'Start round';
    showOverlay(
      'Signal Console',
      'Move the carrier onto each lit node before its charge fades. Arrow keys, WASD, the on-screen pad, or tap the grid to step.',
      'Start round'
    );
    syncHud();
    setStatus('Console reset.');
    drawGame();
  }

  function step(dx, dy) {
    if (game.mode === 'idle' || game.mode === 'over') {
      startRound();
      return;
    }
    if (game.mode !== 'playing') return;
    game.carrier.x = Math.min(GRID - 1, Math.max(0, game.carrier.x + dx));
    game.carrier.y = Math.min(GRID - 1, Math.max(0, game.carrier.y + dy));
    checkCapture();
    drawGame();
  }

  function checkCapture() {
    const s = game.signal;
    if (!s) return;
    if (s.x === game.carrier.x && s.y === game.carrier.y) {
      const bonus = Math.round(s.charge * 60);
      game.score += 40 + bonus + game.streak * 5;
      game.streak += 1;
      game.flash = 1;
      setStatus(`Node captured. Score ${game.score}, streak ${game.streak}.`);
      spawnSignal();
      syncHud();
    }
  }

  function loopGame(now) {
    if (game.mode !== 'playing') return;
    const dt = Math.min((now - game.last) / 1000, 0.05);
    game.last = now;
    game.timeLeft -= dt;
    game.pulse += dt;
    if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 2.6);

    if (game.signal) {
      game.signal.charge -= dt / game.signal.life;
      if (game.signal.charge <= 0) {
        game.streak = 0;
        setStatus('Signal faded. Streak reset.');
        spawnSignal();
      }
    }

    syncHud();
    drawGame();

    if (game.timeLeft <= 0) {
      endRound();
      return;
    }
    game.raf = requestAnimationFrame(loopGame);
  }

  function drawGame() {
    if (!gctx) return;
    if (!gameDims.cell) {
      sizeGameCanvas();
      if (!gameDims.cell) return;
    }
    const rect = { w: gameCanvas.width, h: gameCanvas.height };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.w / dpr;
    const h = rect.h / dpr;

    const bg = token('--panel-bg', '#04060b');
    const line = token('--panel-line', 'rgba(140,160,200,0.18)');
    const lineStrong = 'rgba(163,178,201,0.55)';
    const accent = token('--color-accent', '#f4762b');
    const textFaint = token('--panel-node', '#6b7688');
    const textColor = '#e6e9ef';

    gctx.clearRect(0, 0, w, h);
    gctx.fillStyle = bg;
    gctx.fillRect(0, 0, w, h);

    // grid cells
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const r = cellRect(x, y);
        gctx.strokeStyle = line;
        gctx.lineWidth = 1;
        gctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
        gctx.fillStyle = textFaint;
        gctx.globalAlpha = 0.28;
        gctx.beginPath();
        gctx.arc(r.x + r.w / 2, r.y + r.h / 2, 1.6, 0, Math.PI * 2);
        gctx.fill();
        gctx.globalAlpha = 1;
      }
    }

    // signal node
    const s = game.signal;
    if (s) {
      const r = cellRect(s.x, s.y);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const pulse = reducedMotion.matches ? 0 : (Math.sin(game.pulse * 6) + 1) * 0.5;
      const radius = r.w * (0.2 + 0.16 * s.charge + pulse * 0.03);

      gctx.strokeStyle = accent;
      gctx.globalAlpha = 0.35;
      gctx.lineWidth = 2;
      gctx.beginPath();
      gctx.arc(cx, cy, r.w * 0.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, s.charge));
      gctx.stroke();
      gctx.globalAlpha = 1;

      gctx.fillStyle = accent;
      gctx.globalAlpha = 0.25 + 0.6 * s.charge;
      gctx.beginPath();
      gctx.arc(cx, cy, radius, 0, Math.PI * 2);
      gctx.fill();
      gctx.globalAlpha = 1;
    }

    // carrier
    const c = cellRect(game.carrier.x, game.carrier.y);
    gctx.strokeStyle = game.flash > 0 ? accent : lineStrong;
    gctx.lineWidth = game.flash > 0 ? 3 : 2;
    gctx.strokeRect(c.x + 5, c.y + 5, c.w - 10, c.h - 10);
    gctx.fillStyle = textColor;
    gctx.globalAlpha = 0.9;
    const inner = c.w * 0.22;
    gctx.fillRect(c.x + c.w / 2 - inner / 2, c.y + c.h / 2 - inner / 2, inner, inner);
    gctx.globalAlpha = 1;

    // corner ticks
    gctx.strokeStyle = accent;
    gctx.globalAlpha = 0.6;
    gctx.lineWidth = 1.5;
    const p = gameDims.pad - 4;
    const pv = gameDims.padY - 4;
    const t = 12;
    const right = p + gameDims.size + 8;
    const bottom = pv + gameDims.size + 8;
    gctx.beginPath();
    gctx.moveTo(p, pv + t); gctx.lineTo(p, pv); gctx.lineTo(p + t, pv);
    gctx.moveTo(right - t, bottom); gctx.lineTo(right, bottom); gctx.lineTo(right, bottom - t);
    gctx.stroke();
    gctx.globalAlpha = 1;
  }

  if (gameCanvas) {
    sizeGameCanvas();
    resetGame();

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (game.mode === 'playing') pauseRound();
        else if (game.mode === 'paused') resumeRound();
        else startRound();
      });
    }
    if (resetBtn) resetBtn.addEventListener('click', resetGame);
    if (overlayStart) {
      overlayStart.addEventListener('click', () => {
        if (game.mode === 'paused') resumeRound();
        else startRound();
      });
    }

    $$('.dpad button').forEach((b) => {
      b.addEventListener('click', () => {
        const dir = b.dataset.dir;
        if (dir === 'up') step(0, -1);
        else if (dir === 'down') step(0, 1);
        else if (dir === 'left') step(-1, 0);
        else step(1, 0);
      });
    });

    // Tap / click the board: step one cell toward the pointer.
    gameCanvas.addEventListener('pointerdown', (e) => {
      if (game.mode === 'idle' || game.mode === 'over') {
        startRound();
        return;
      }
      if (game.mode !== 'playing') return;
      const rect = gameCanvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cc = cellRect(game.carrier.x, game.carrier.y);
      const dx = px - (cc.x + cc.w / 2);
      const dy = py - (cc.y + cc.h / 2);
      if (Math.abs(dx) > Math.abs(dy)) step(Math.sign(dx), 0);
      else step(0, Math.sign(dy));
    });

    // Keyboard: only when the games view is active, and never while typing in a field.
    document.addEventListener('keydown', (e) => {
      if (state.view !== 'games') return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      const k = e.key.toLowerCase();
      const map = {
        arrowup: [0, -1], w: [0, -1],
        arrowdown: [0, 1], s: [0, 1],
        arrowleft: [-1, 0], a: [-1, 0],
        arrowright: [1, 0], d: [1, 0],
      };
      if (map[k]) {
        e.preventDefault();
        step(map[k][0], map[k][1]);
      } else if (k === ' ') {
        e.preventDefault();
        if (game.mode === 'playing') pauseRound();
        else if (game.mode === 'paused') resumeRound();
        else startRound();
      } else if (k === 'r') {
        resetGame();
      }
    });

    reducedMotion.addEventListener('change', drawGame);
  }

  repaintCanvases = () => {
    if (heroCanvas) paintHero(true);
    if (gameCanvas) drawGame();
  };

  /* ============================================================ resize handling */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeHero();
      paintHero(true);
      sizeGameCanvas();
    }, 120);
  });

  /* ============================================================ contact form */
  const form = $('#contact-form');
  const confirmPanel = $('#contact-confirm');
  const confirmMailto = $('#confirm-mailto');
  const confirmBody = $('#confirm-body');
  const confirmEdit = $('#confirm-edit');

  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name (at least 2 characters).'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address, e.g. you@example.com.'),
    topic: (v) => (v ? '' : 'Choose the area this is about.'),
    message: (v) => (v.trim().length >= 20 ? '' : `Add a little more detail — ${Math.max(0, 20 - v.trim().length)} characters to go.`),
  };

  const fieldsFor = () => ({
    name: $('#f-name'),
    email: $('#f-email'),
    topic: $('#f-topic'),
    message: $('#f-message'),
  });

  function validateField(key, el) {
    const msg = rules[key](el.value);
    const errEl = $(`#e-${key}`);
    if (errEl) errEl.textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function prefillInquiry(subject) {
    const f = fieldsFor();
    if (!f.message) return;
    if (f.topic) {
      const match = Array.from(f.topic.options).find(
        (o) => o.value && subject.toLowerCase().includes(o.value.toLowerCase())
      );
      f.topic.value = match ? match.value : 'Project enquiry';
    }
    if (!f.message.value.trim()) {
      f.message.value = `I'd like to know more about ${subject}. `;
    }
    if (confirmPanel) confirmPanel.hidden = true;
    if (form) form.hidden = false;
  }

  if (form) {
    Object.entries(fieldsFor()).forEach(([key, el]) => {
      if (!el) return;
      el.addEventListener('blur', () => validateField(key, el));
      el.addEventListener('input', () => {
        if (el.getAttribute('aria-invalid') === 'true') validateField(key, el);
      });
      el.addEventListener('change', () => {
        if (key === 'topic') validateField(key, el);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = fieldsFor();
      let firstBad = null;
      let ok = true;
      Object.entries(f).forEach(([key, el]) => {
        const valid = validateField(key, el);
        if (!valid) {
          ok = false;
          if (!firstBad) firstBad = el;
        }
      });

      if (!ok) {
        if (firstBad) firstBad.focus();
        return;
      }

      /*
        There is no mail server, form endpoint or database behind this page — nothing
        is transmitted from here. The valid details are handed to the visitor's own
        email client as a pre-filled draft.

        TODO (infrastructure): provision the hello@trillionaitech.com mailbox and MX
        records on trillionaitech.com. Once a real inbox (or a form endpoint such as
        a Cloudflare Worker) exists, replace the mailto handoff with a POST and keep
        this honest confirmation copy in sync with whatever actually happens.
      */
      const subject = `[trillionaitech.com] ${f.topic.value} — ${f.name.value.trim()}`;
      const body = [
        `Name: ${f.name.value.trim()}`,
        `Email: ${f.email.value.trim()}`,
        `Area: ${f.topic.value}`,
        '',
        f.message.value.trim(),
      ].join('\n');
      const mailto = `mailto:hello@trillionaitech.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      if (confirmMailto) confirmMailto.setAttribute('href', mailto);
      if (confirmBody) {
        confirmBody.textContent =
          `Thanks ${f.name.value.trim()} — your details have been handed to your email application as a draft addressed to hello@trillionaitech.com. ` +
          'This page has no mail server behind it, so nothing was transmitted or stored here.';
      }
      form.hidden = true;
      if (confirmPanel) {
        confirmPanel.hidden = false;
        confirmPanel.setAttribute('tabindex', '-1');
        confirmPanel.focus({ preventScroll: true });
      }

      // Hand off to the visitor's mail client. A temporary anchor with target="_blank"
      // behaves better than assigning window.location inside sandboxed iframes, and the
      // confirmation panel always offers the same link manually if nothing opens.
      const handoff = document.createElement('a');
      handoff.href = mailto;
      handoff.target = '_blank';
      handoff.rel = 'noopener noreferrer';
      handoff.style.display = 'none';
      document.body.appendChild(handoff);
      handoff.click();
      handoff.remove();
    });
  }

  if (confirmEdit) {
    confirmEdit.addEventListener('click', () => {
      if (confirmPanel) confirmPanel.hidden = true;
      if (form) {
        form.hidden = false;
        const f = fieldsFor();
        if (f.message) f.message.focus();
      }
    });
  }

  /* ============================================================ boot */
  // Run the router last so every module above is initialised before first paint.
  showView(currentHash());

  /* ============================================================ misc */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
