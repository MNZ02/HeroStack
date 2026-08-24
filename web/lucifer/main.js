(() => {
  const canvas = document.getElementById("scrub-canvas");
  const ctx = canvas.getContext("2d");
  const video = document.getElementById("scrub-video");
  const stageInner = document.getElementById("stage-inner");
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-fill");
  const loaderLabel = document.getElementById("loader-label");
  const progressFill = document.getElementById("progress-fill");
  const progressReadout = document.getElementById("progress-readout");
  const hudClock = document.getElementById("hud-clock");
  const hudDay = document.getElementById("hud-day");
  const film = document.getElementById("film");

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A manifest is optional; without one the loader probes frames until a miss.
  const MANIFEST_URL = "frames/manifest.json";
  const framePath = (i) => `frames/frame_${String(i).padStart(4, "0")}.jpg`;
  const PROBE_CAP = 600;
  const FALLBACK_FPS = 24;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let frames = [];
  let usingFallbackVideo = false;

  const loadImage = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const FALLBACK_VIDEO_URL = new URL("./assets/fall.mp4", import.meta.url).href;

  async function discoverFrames() {
    try {
      const res = await fetch(MANIFEST_URL);
      if (res.ok) {
        const { count } = await res.json();
        if (Number.isFinite(count) && count > 0) {
          const imgs = await Promise.all(
            Array.from({ length: count }, (_, i) => loadImage(framePath(i + 1)))
          );
          return imgs.filter(Boolean);
        }
      }
    } catch {
      /* no manifest — probe instead */
    }

    const found = [];
    for (let start = 1; start <= PROBE_CAP; start += 8) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(8, PROBE_CAP - start + 1), }, (_, i) =>
          loadImage(framePath(start + i))
        )
      );
      for (const img of batch) {
        if (!img) return found;
        found.push(img);
      }
    }
    return found;
  }

  function drawCover(img) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch || !img) return;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const scale = Math.max((cw * dpr) / img.width, (ch * dpr) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, ((cw * dpr) - w) / 2, ((ch * dpr) - h) / 2, w, h);
  }

  // ---------- Act grading ----------
  // Stops along the descent; every channel lerped per tick.
  const STOPS = [
    { p: 0.0, tint: [255, 208, 138, 0.1], acc: [217, 168, 105], gt: [52, 38, 20, 0.42], gb: [5, 4, 8, 0.55] },
    { p: 0.3, tint: [255, 238, 205, 0.08], acc: [225, 190, 130], gt: [40, 32, 22, 0.3], gb: [5, 4, 8, 0.5] },
    { p: 0.44, tint: [150, 175, 230, 0.06], acc: [168, 186, 214], gt: [16, 18, 28, 0.35], gb: [4, 4, 9, 0.6] },
    { p: 0.58, tint: [255, 120, 48, 0.11], acc: [224, 106, 58], gt: [46, 16, 8, 0.45], gb: [6, 3, 5, 0.62] },
    { p: 0.78, tint: [210, 60, 26, 0.12], acc: [192, 74, 52], gt: [34, 10, 8, 0.5], gb: [5, 2, 4, 0.66] },
    { p: 1.0, tint: [170, 26, 24, 0.13], acc: [206, 88, 66], gt: [22, 6, 8, 0.55], gb: [3, 1, 3, 0.72] },
  ];

  function gradeAt(p) {
    let i = 0;
    while (i < STOPS.length - 2 && p > STOPS[i + 1].p) i++;
    const a = STOPS[i];
    const b = STOPS[i + 1];
    const t = clamp((p - a.p) / (b.p - a.p), 0, 1);
    const mix = (ka, kb) => ka.map((v, j) => lerp(v, kb[j], t));
    return {
      tint: mix(a.tint, b.tint),
      acc: mix(a.acc, b.acc),
      gt: mix(a.gt, b.gt),
      gb: mix(a.gb, b.gb),
    };
  }

  // ---------- Midway tremor ----------
  // Stillness through grace; the frame starts to rattle as the fall
  // gets underway, peaks through chaos, and goes quiet before the lake.
  const smoothstep = (t) => t * t * (3 - 2 * t);

  function tremorEnv(p) {
    if (REDUCED) return 0;
    const build = smoothstep(clamp((p - 0.42) / 0.14, 0, 1));
    const settle = 1 - smoothstep(clamp((p - 0.8) / 0.1, 0, 1));
    const impact = p > 0.825 ? Math.exp(-(p - 0.825) * 22) : 0;
    return Math.max(build * settle, impact);
  }

  function applyGrade(p) {
    const g = gradeAt(p);
    const root = document.documentElement.style;
    const rgb = (c, a = 1) => `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${a})`;
    root.setProperty("--tint", rgb(g.tint.slice(0, 3), g.tint[3]));
    root.setProperty("--accent", `rgb(${g.acc.map((v) => v.toFixed(0)).join(",")})`);
    root.setProperty("--accent-dim", rgb(g.acc, 0.5));
    root.setProperty("--g-top", rgb(g.gt.slice(0, 3), g.gt[3]));
    root.setProperty("--g-bot", rgb(g.gb.slice(0, 3), g.gb[3]));
  }

  // ---------- Narrative stations ----------
  const stations = Array.from(document.querySelectorAll(".station")).map((el) => ({
    el,
    hero: el.classList.contains("station-hero"),
    finale: el.classList.contains("station-final"),
    from: parseFloat(el.dataset.from),
    to: parseFloat(el.dataset.to),
    center: 0,
    half: 0,
    live: false,
  }));

  for (const s of stations) {
    s.center = (s.from + s.to) / 2;
    s.half = Math.max((s.to - s.from) / 2, 0.001);
  }

  function updateStations(p) {
    for (const s of stations) {
      let vis;
      let drift;
      if (s.hero) {
        vis = Math.pow(clamp(1 - p / s.to, 0, 1), 1.15);
        drift = clamp(-p * 3000, -160, 0);
      } else if (s.finale) {
        vis = Math.pow(clamp((p - s.from) / 0.06, 0, 1), 1.15);
        drift = clamp((p - s.from) * 260, -30, 50);
      } else {
        const d = Math.abs(p - s.center) / s.half;
        vis = d >= 1 ? 0 : clamp(1 - Math.max(0, d - 0.55) / 0.45, 0, 1);
        vis = Math.pow(vis, 1.15);
        drift = clamp((p - s.center) * -900, -160, 160);
      }

      s.el.style.opacity = vis.toFixed(3);
      s.el.style.transform = `translateY(${drift.toFixed(1)}px)`;
      s.el.style.visibility = vis < 0.004 ? "hidden" : "visible";

      const nowLive = vis > 0.45;
      if (nowLive !== s.live) {
        s.live = nowLive;
        s.el.classList.toggle("is-live", nowLive);
      }
    }
  }

  // ---------- HUD ----------
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const navActs = {
    grace: document.querySelector('[data-nav="grace"]'),
    fall: document.querySelector('[data-nav="fall"]'),
    abyss: document.querySelector('[data-nav="abyss"]'),
  };

  function updateHud(p, clockSeconds) {
    const pct = Math.round(p * 100);
    progressFill.style.width = `${pct}%`;
    progressReadout.textContent = `DESCENT ${String(pct).padStart(3, "0")}%`;

    const h = String(Math.floor(clockSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((clockSeconds % 3600) / 60)).padStart(2, "0");
    const sec = String(Math.floor(clockSeconds % 60)).padStart(2, "0");
    hudClock.textContent = `T+ ${h}:${m}:${sec}`;

    if (p < 0.33) hudDay.textContent = "HEAVEN \u00B7 BEFORE THE FALL";
    else if (p > 0.93) hudDay.textContent = "THE KINGDOM BELOW";
    else {
      const day = Math.min(9, Math.ceil(((p - 0.33) / 0.67) * 9));
      hudDay.textContent = `DAY ${ROMAN[day - 1]} / IX`;
    }

    navActs.grace.classList.toggle("is-active", p < 0.36);
    navActs.fall.classList.toggle("is-active", p >= 0.36 && p < 0.8);
    navActs.abyss.classList.toggle("is-active", p >= 0.8);
  }

  // ---------- Station rail ----------
  const rail = document.getElementById("rail");
  const railButtons = [];

  stations.forEach((s) => {
    if (s.hero) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Station ${ROMAN[railButtons.length]}`);
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = ROMAN[railButtons.length];
    const tick = document.createElement("span");
    tick.className = "tick";
    btn.append(tick, num);
    btn.addEventListener("click", () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: s.center * maxScroll, behavior: "smooth" });
    });
    rail.appendChild(btn);
    railButtons.push({ btn, station: s });
  });

  function updateRail(p) {
    for (const r of railButtons) {
      const active =
        p >= r.station.from && p < r.station.to
          ? true
          : false;
      r.btn.classList.toggle("is-active", active);
    }
  }

  // ---------- Ember / ash weather ----------
  const embersCanvas = document.getElementById("embers");
  const ectx = embersCanvas.getContext("2d");
  let particles = [];
  let emberW = 0;
  let emberH = 0;

  function resizeEmbers() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    emberW = window.innerWidth;
    emberH = window.innerHeight;
    embersCanvas.width = Math.round(emberW * dpr);
    embersCanvas.height = Math.round(emberH * dpr);
    ectx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  function spawnParticle(p) {
    // Mode weights across the three acts
    const wMote = clamp(1 - (p - 0.18) / 0.24, 0, 1);
    const wAsh = clamp((p - 0.62) / 0.2, 0, 1);
    const wEmber = Math.max(0.12, 1 - wMote - wAsh);
    const roll = Math.random() * (wMote + wEmber + wAsh);

    let type;
    if (roll < wMote) type = "mote";
    else if (roll < wMote + wEmber) type = "ember";
    else type = "ash";

    if (type === "mote") {
      return {
        type,
        x: rand(0, emberW),
        y: rand(emberH * 0.25, emberH * 1.05),
        vx: rand(-4, 4),
        vy: rand(-10, -3),
        r: rand(0.5, 1.5),
        a: rand(0.06, 0.22),
        seed: rand(0, Math.PI * 2),
        life: rand(6, 14),
        age: 0,
      };
    }
    if (type === "ember") {
      return {
        type,
        x: rand(0, emberW),
        y: emberH + rand(4, 80),
        vx: rand(-16, 16),
        vy: rand(-95, -34),
        r: rand(0.7, 2.2),
        a: rand(0.3, 0.85),
        seed: rand(0, Math.PI * 2),
        life: rand(3, 7),
        age: 0,
      };
    }
    return {
      type,
      x: rand(0, emberW),
      y: rand(-40, -4),
      vx: rand(-9, 9),
      vy: rand(14, 42),
      r: rand(0.9, 2.4),
      a: rand(0.05, 0.16),
      seed: rand(0, Math.PI * 2),
      life: rand(8, 16),
      age: 0,
    };
  }

  function drawEmbers(dt, p, boost, time) {
    const target = REDUCED ? 0 : emberW < 720 ? 46 : 110;
    while (particles.length < target) particles.push(spawnParticle(p));
    if (particles.length > target) particles.length = target;

    ectx.clearRect(0, 0, emberW, emberH);

    particles = particles.filter((pt) => {
      pt.age += dt;
      pt.x += (pt.vx + Math.sin(time * 1.7 + pt.seed) * 6) * dt;
      pt.y += (pt.vy - boost * (pt.type === "ash" ? 90 : 130)) * dt;

      if (
        pt.age > pt.life ||
        pt.y < -30 ||
        pt.y > emberH + 40 ||
        pt.x < -30 ||
        pt.x > emberW + 30
      ) {
        return false;
      }

      const fade = Math.min(pt.age * 2, 1, (pt.life - pt.age) / 1.2);
      const flicker =
        pt.type === "ember"
          ? 0.55 + 0.45 * Math.sin(time * rand(6, 6) + pt.seed * 7)
          : 0.75 + 0.25 * Math.sin(time * 0.8 + pt.seed);
      const alpha = pt.a * fade * flicker;
      if (alpha <= 0.004) return true;

      if (pt.type === "ash") {
        ectx.globalCompositeOperation = "source-over";
        ectx.fillStyle = `rgba(178,178,188,${alpha.toFixed(3)})`;
      } else {
        ectx.globalCompositeOperation = "lighter";
        ectx.fillStyle =
          pt.type === "mote"
            ? `rgba(240,208,150,${alpha.toFixed(3)})`
            : `rgba(${(255 - boost * 40).toFixed(0)},${(150 + Math.sin(pt.seed) * 30).toFixed(0)},52,${alpha.toFixed(3)})`;
      }

      ectx.beginPath();
      ectx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ectx.fill();
      return true;
    });

    ectx.globalCompositeOperation = "source-over";
  }

  // ---------- Main loop ----------
  function startLoop() {
    let targetProgress = 0;
    let smoothProgress = 0;
    let drawnFrame = -1;
    let lastTime = performance.now();
    let elapsed = 0;
    let velSmooth = 0;

    const doc = document.documentElement;
    const maxScroll = () => doc.scrollHeight - window.innerHeight;

    const readScroll = () => {
      const m = maxScroll();
      targetProgress = m > 0 ? clamp(window.scrollY / m, 0, 1) : 0;
    };
    readScroll();

    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", () => {
      readScroll();
      resizeEmbers();
      if (!usingFallbackVideo && frames.length) drawFrame(true);
    });
    resizeEmbers();

    function drawFrame(force = false) {
      const index = Math.round(smoothProgress * (frames.length - 1));
      if (force || index !== drawnFrame) {
        drawnFrame = index;
        drawCover(frames[index]);
      }
    }

    function renderStage(p, vel) {
      const base = 1.04 + p * 0.14;
      const stretch = clamp(Math.abs(vel) * 0.09, 0, 0.02);
      const amp = REDUCED ? 0 : Math.min(Math.abs(vel) * 46, 7) ** 1.2;
      let sx = Math.sin(elapsed * 61) * amp;
      let sy = Math.cos(elapsed * 47) * amp * 0.7;
      let rot = 0;

      if (!REDUCED) {
        const env = tremorEnv(p);
        if (env > 0.001) {
          const shake = env * (4.5 + Math.min(Math.abs(vel) * 7, 3.5));
          sx += (Math.sin(elapsed * 38.2) * 0.62 + Math.sin(elapsed * 91.7) * 0.38) * shake;
          sy += (Math.cos(elapsed * 31.4) * 0.58 + Math.sin(elapsed * 73.1) * 0.42) * shake * 0.85;
          rot += Math.sin(elapsed * 24.7) * 0.06 * shake;

          const fs = env * 1.6;
          film.style.transform = `translate(${(Math.sin(elapsed * 43.3) * fs).toFixed(2)}px, ${(Math.cos(elapsed * 36.7) * fs).toFixed(2)}px)`;
        } else if (film.style.transform) {
          film.style.transform = "";
        }
      }

      stageInner.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${(
        base + stretch
      ).toFixed(4)}, ${(base - stretch * 0.5).toFixed(4)})`;
    }

    const tick = (now) => {
      requestAnimationFrame(tick);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      const ease = REDUCED ? 1 : 1 - Math.exp(-dt * 6.5);
      const prev = smoothProgress;
      smoothProgress += (targetProgress - smoothProgress) * ease;
      velSmooth += ((smoothProgress - prev) / Math.max(dt, 0.001) - velSmooth) * Math.min(1, dt * 8);

      if (usingFallbackVideo) {
        const t = smoothProgress * (video.duration || 0);
        if (video.readyState >= 1 && Math.abs(video.currentTime - t) > 0.033) {
          video.currentTime = t;
        }
      } else {
        drawFrame();
      }

      applyGrade(smoothProgress);
      updateStations(smoothProgress);
      updateHud(smoothProgress, smoothProgress * (frames.length / FALLBACK_FPS));
      updateRail(smoothProgress);
      renderStage(smoothProgress, velSmooth);
      drawEmbers(dt, smoothProgress, clamp(velSmooth * 3, -0.6, 1.4), elapsed);
    };

    applyGrade(smoothProgress);
    updateStations(smoothProgress);
    updateRail(smoothProgress);
    if (!usingFallbackVideo && frames.length) drawFrame(true);
    requestAnimationFrame(tick);
  }

  function enableVideoFallback() {
    usingFallbackVideo = true;
    video.preload = "auto";
    video.src = FALLBACK_VIDEO_URL;
    video.classList.add("is-active");
    canvas.remove();
  }

  function finishLoading() {
    loader.classList.add("is-done");
    setTimeout(() => loader.remove(), 1000);
    setTimeout(() => document.body.classList.add("is-ready"), 250);
  }

  function setLoader(pct, label) {
    loaderBar.style.width = `${Math.round(pct)}%`;
    loaderLabel.textContent = label;
  }

  async function init() {
    setLoader(4, "LOCATING SEQUENCE");

    const failsafe = setTimeout(finishLoading, 12000);
    const clearFailsafe = () => clearTimeout(failsafe);

    const discovered = await discoverFrames();

    if (!discovered.length) {
      enableVideoFallback();
      const ready = () => {
        clearFailsafe();
        finishLoading();
        if (video.readyState >= 1) startLoop();
        else video.addEventListener("loadedmetadata", () => startLoop(), { once: true });
      };
      video.addEventListener("error", () => {
        clearFailsafe();
        finishLoading();
      }, { once: true });
      if (video.readyState >= 1) ready();
      else video.addEventListener("loadeddata", ready, { once: true });
      return;
    }

    clearFailsafe();

    let loaded = 1;
    frames = [discovered[0]];
    setLoader(8, `LOADING FRAMES 1/${discovered.length}`);

    const BATCH = 12;
    for (let i = 1; i < discovered.length; i += BATCH) {
      const slice = discovered.slice(i, i + BATCH).filter(Boolean);
      frames.push(...slice);
      loaded += slice.length;
      setLoader(
        8 + (loaded / discovered.length) * 92,
        `LOADING FRAMES ${loaded}/${discovered.length}`
      );
      await new Promise(requestAnimationFrame);
    }

    drawCover(frames[0]);
    finishLoading();
    startLoop();
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  init();
})();
