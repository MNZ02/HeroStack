(() => {
  const canvas = document.getElementById("scrub-canvas");
  const ctx = canvas.getContext("2d");
  const video = document.getElementById("scrub-video");
  const stageInner = document.querySelector(".stage-inner");
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-fill");
  const loaderLabel = document.getElementById("loader-label");
  const progressFill = document.getElementById("progress-fill");
  const progressReadout = document.getElementById("progress-readout");
  const hudClock = document.getElementById("hud-clock");
  const reveals = document.querySelectorAll("[data-reveal]");

  // A manifest is optional; without one the loader probes frames until a miss.
  const MANIFEST_URL = "assets/frames/manifest.json";
  const framePath = (i) => `assets/frames/frame_${String(i).padStart(4, "0")}.jpg`;
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
        Array.from({ length: Math.min(8, PROBE_CAP - start + 1) }, (_, i) =>
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

  const updateTargetProgress = () => {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    return maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
  };

  const fmtClock = (t) => {
    const h = String(Math.floor(t / 3600)).padStart(2, "0");
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
    const s = String(Math.floor(t % 60)).padStart(2, "0");
    return `T+ ${h}:${m}:${s}`;
  };

  function startLoop() {
    let targetProgress = updateTargetProgress();
    let smoothProgress = targetProgress;
    let drawnFrame = -1;

    window.addEventListener("scroll", () => {
      targetProgress = updateTargetProgress();
    }, { passive: true });
    window.addEventListener("resize", () => {
      targetProgress = updateTargetProgress();
      if (!usingFallbackVideo && frames.length) drawFrame(true);
    });

    function drawFrame(force = false) {
      const index = Math.round(smoothProgress * (frames.length - 1));
      if (force || index !== drawnFrame) {
        drawnFrame = index;
        drawCover(frames[index]);
      }
    }

    const tick = () => {
      smoothProgress = lerp(smoothProgress, targetProgress, 0.09);

      if (usingFallbackVideo) {
        const t = smoothProgress * (video.duration || 0);
        if (video.readyState >= 1 && Math.abs(video.currentTime - t) > 0.033) {
          video.currentTime = t;
        }
      } else {
        drawFrame();
      }

      // Subtle cinematic push-in tied to scroll depth
      const scale = 1.04 + smoothProgress * 0.14;
      stageInner.style.transform = `scale(${scale.toFixed(4)})`;

      // HUD
      const pct = Math.round(smoothProgress * 100);
      progressFill.style.width = `${pct}%`;
      progressReadout.textContent = `DESCENT ${String(pct).padStart(3, "0")}%`;
      hudClock.textContent = fmtClock(smoothProgress * (frames.length / FALLBACK_FPS));

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function enableVideoFallback() {
    usingFallbackVideo = true;
    video.classList.add("is-active");
    canvas.remove();
  }

  function finishLoading() {
    loader.classList.add("is-done");
    setTimeout(() => loader.remove(), 900);
  }

  function setLoader(pct, label) {
    loaderBar.style.width = `${Math.round(pct)}%`;
    loaderLabel.textContent = label;
  }

  async function init() {
    setLoader(4, "LOCATING SEQUENCE");

    // Never trap the visitor behind the loader if nothing loads
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

    // Preload remaining frames with progress (first frame already decoded)
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

  // ---- Caption reveals ----
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => e.target.classList.toggle("is-visible", e.isIntersecting)),
    { threshold: 0.35 }
  );
  reveals.forEach((el) => io.observe(el));
})();
