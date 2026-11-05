import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { runPreloader } from './components/preloader.js';
import { initCursor, initMagnetic, initSpotlight, initNav } from './components/interactions.js';
import { initDemos } from './components/demos.js';
import { initReviews } from './components/reviews.js';
import { initContact } from './components/contact.js';

gsap.registerPlugin(ScrollTrigger);
// iOS Safari collapses its URL bar on scroll, firing resize → refresh, which
// restarts in-flight reveal tweens ("staggered reload"). Ignore that resize.
ScrollTrigger.config({ ignoreMobileResize: true });

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── smooth scroll ─────────────────────────────────────────── */
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1.12 });
  window.__lenis = lenis; // exposed for browser QA tooling
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(500, 33);

  // anchor links route through lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -20, duration: 1.4 });
    });
  });
}

/* ── marquee bands ─────────────────────────────────────────── */
const DISCIPLINES = ['engineering', 'manufacturing', 'energy', 'construction', 'automation', 'controls'];
const PLATFORMS = [
  'Mechanical Engineer', 'Electrical Engineer', 'Controls Engineer', 'Process Engineer',
  'Project Engineer', 'Manufacturing Engineer', 'Field Engineer', 'Quality Engineer',
  'Commissioning Engineer', 'Plant Manager', 'Civil Engineer', 'Design Engineer',
];
function loopTrack(track, duration, dir = -1) {
  const half = track.scrollWidth / 2;
  return gsap.fromTo(track, { x: dir === -1 ? 0 : -half }, {
    x: dir === -1 ? -half : 0,
    duration,
    ease: 'none',
    repeat: -1,
  });
}
function buildBands() {
  const serif = document.getElementById('band-serif');
  const mono = document.getElementById('band-mono');
  if (!serif || !mono) return;
  const words = DISCIPLINES.map((w) => `<span class="band-word">${w}<i>◆</i></span>`).join('');
  serif.innerHTML = words + words;
  const plats = PLATFORMS.map((w) => `<span class="band-plat">${w}<i>·</i></span>`).join('');
  mono.innerHTML = plats + plats;
  if (reducedMotion) return;
  const tweens = [loopTrack(serif, 44, -1), loopTrack(mono, 30, 1)];
  const band = serif.closest('.band');
  const io = new IntersectionObserver(([entry]) => {
    tweens.forEach((t) => (entry.isIntersecting ? t.play() : t.pause()));
  });
  io.observe(band);
}

/**
 * Autoplay is refused outright by iOS Low Power Mode, in-app browsers
 * (Instagram/Facebook) and Data Saver. Two things must happen when it is:
 *   1. hide the video — left visible-but-paused, iOS paints its OWN play
 *      button over the poster;
 *   2. retry on the first real user gesture — Low Power Mode still permits
 *      gesture-initiated playback, so a tap anywhere starts the loop.
 * Only if that retry also fails do we drop the elements for good and leave
 * the static poster. Note seamlessLoop sets inline opacity, so hiding has to
 * be inline too or play() would re-reveal the element before it rejects.
 */
function autoplayFallback(container, getLoop) {
  let state = 'initial';
  const videos = () => container.querySelectorAll('video');
  return () => {
    if (state === 'gesture-tried') {
      videos().forEach((v) => v.remove());
      return;
    }
    videos().forEach((v) => { v.style.opacity = '0'; });
    if (state === 'initial') {
      state = 'awaiting-gesture';
      const retry = () => { state = 'gesture-tried'; getLoop().play(); };
      document.addEventListener('touchend', retry, { once: true, passive: true });
      document.addEventListener('click', retry, { once: true });
    }
  };
}

/* ── seamless ambient loop: two elements crossfade at the seam ── */
function seamlessLoop(video, baseOpacity, fadeSec = 1.1, onBlocked) {
  video.loop = false;
  const twin = video.cloneNode(false);
  twin.removeAttribute('id');
  twin.loop = false;
  twin.muted = true;
  video.parentNode.insertBefore(twin, video.nextSibling);
  [video, twin].forEach((v) => { v.style.transition = 'none'; });
  twin.style.opacity = '0';
  let front = video;
  let back = twin;
  let running = false;

  // The crossfade needs to start the SECOND element from a rAF tick, which is
  // not a user gesture — iOS Low Power Mode refuses it. The original then hits
  // `ended`, sits paused on its last frame, and iOS paints its play button over
  // the hero again. When that happens, abandon the crossfade and let the single
  // element loop natively: a natively looping video never reaches `ended`, so
  // no control is ever drawn. The seam becomes a hard cut instead of a fade,
  // which is the correct trade against a play button.
  let nativeMode = false;
  function fallbackToNativeLoop() {
    if (nativeMode) return;
    nativeMode = true;
    running = false;
    if (back && back.parentNode) back.remove();
    front.loop = true;
    front.style.opacity = String(baseOpacity);
    if (front.ended) front.currentTime = 0;
    Promise.resolve(front.play()).catch(() => {});
  }

  function watch() {
    requestAnimationFrame(watch);
    if (!running || nativeMode || !front.duration) return;
    const remain = front.duration - front.currentTime;
    if (remain < fadeSec) {
      if (back.paused) {
        back.currentTime = 0;
        Promise.resolve(back.play()).catch(fallbackToNativeLoop);
      }
      const t = Math.min(1, Math.max(0, 1 - remain / fadeSec));
      back.style.opacity = String(baseOpacity * t);
      front.style.opacity = String(baseOpacity * (1 - t));
      if (remain < 0.06 || front.ended) {
        if (back.paused) { fallbackToNativeLoop(); return; }
        front.pause();
        const f = front; front = back; back = f;
        front.style.opacity = String(baseOpacity);
        back.style.opacity = '0';
      }
    }
  }

  // Last-resort net: if either element ever reaches `ended` while still on
  // screen, iOS would draw its control — loop natively instead.
  [video, twin].forEach((v) => {
    v.addEventListener('ended', () => {
      if (!nativeMode && v.style.opacity !== '0') fallbackToNativeLoop();
    });
  });
  requestAnimationFrame(watch);

  return {
    play() {
      running = true;
      front.style.opacity = String(baseOpacity);
      // Promise.resolve guards browsers where play() returns undefined.
      Promise.resolve(front.play()).catch(() => { if (onBlocked) onBlocked(); });
    },
    pause() { running = false; front.pause(); back.pause(); },
  };
}

/* ── hero cinematic + scroll story ─────────────────────────── */
function initHero() {
  const media = document.getElementById('hero-media');
  const video = document.getElementById('hero-video');
  if (video && !reducedMotion) {
    video.src = '/img/core-loop.mp4';
    video.addEventListener('error', () => video.remove(), { once: true });
    video.addEventListener('canplay', () => {
      video.classList.add('is-ready');
      let loop = null;
      const loop_ = seamlessLoop(video, 1, 1.1, autoplayFallback(media, () => loop));
      loop = loop_;
      const vio = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) loop.play();
        else loop.pause();
      });
      vio.observe(media);
      loop.play();
    }, { once: true });
  }
  if (reducedMotion || !media) return null;

  if (window.matchMedia('(min-width: 861px)').matches) {
    // pinned story: content recedes, the flywheel takes the stage
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=120%',
        pin: true,
        anticipatePin: 1,
        scrub: 0.9,
      },
    });
    tl.to('.hero-content', { opacity: 0, yPercent: -7, ease: 'power1.in', duration: 0.45 }, 0.1);
    tl.to('.hero-frame-bl', { opacity: 0, duration: 0.15 }, 0);
    tl.fromTo('.hero-resolve', { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.3 }, 0.62);
  }
  return null;
}

function splitArchChars() {
  const el = document.getElementById('hero-arch');
  if (!el) return [];
  const chars = [...el.textContent];
  el.innerHTML = chars.map((c) => `<span class="arch-char">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  return [...el.querySelectorAll('.arch-char')];
}

function heroIntro() {
  const chars = splitArchChars();
  if (reducedMotion) return;
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.hero-heading .hero-line:first-of-type .hero-line-inner', { yPercent: 112, duration: 1.15 }, 0.05);
  tl.from('.hero-rule', { scaleY: 0, duration: 1.1, ease: 'power3.inOut' }, 0.1);
  // "Architecture." resolves from luminous noise into clean type
  tl.from(chars, {
    yPercent: 62,
    opacity: 0,
    filter: 'blur(12px)',
    duration: 1.1,
    stagger: { each: 0.035 },
    ease: 'power3.out',
  }, 0.4);
  tl.from('.hero-badge', { y: -14, opacity: 0, duration: 0.6 }, 0.6);
  tl.from('.hero-sub', { y: 26, opacity: 0, duration: 0.8 }, 0.85);
  tl.from('.hero-ctas .btn', { y: 22, opacity: 0, stagger: 0.09, duration: 0.6 }, 1.0);
  tl.from('.hero-stat', { y: 18, opacity: 0, stagger: 0.07, duration: 0.55 }, 1.15);
  tl.from('.hero-frame-item', { opacity: 0, duration: 0.9, stagger: 0.08 }, 1.25);
  tl.from('.hero-media', { opacity: 0, scale: 1.06, duration: 1.8, ease: 'power2.out' }, 0);
}

/* ── shared reveals ────────────────────────────────────────── */
function initReveals() {
  // wrap reveal-line contents
  document.querySelectorAll('.reveal-line').forEach((line) => {
    const inner = document.createElement('span');
    inner.className = 'reveal-inner';
    while (line.firstChild) inner.appendChild(line.firstChild);
    line.appendChild(inner);
  });
  if (reducedMotion) return;

  document.querySelectorAll('.reveal-line .reveal-inner').forEach((el) => {
    gsap.from(el, {
      yPercent: 112,
      duration: 1.05,
      ease: 'power4.out',
      immediateRender: false,
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top 85%', once: true },
    });
  });

  document.querySelectorAll('.section-rule').forEach((rule) => {
    gsap.from(rule, {
      scaleX: 0,
      duration: 1.2,
      ease: 'power3.inOut',
      immediateRender: false,
      scrollTrigger: { trigger: rule, start: 'top 92%', once: true },
    });
  });

  // Bento cards carry live demos + imagery; the y+opacity reveal janks while
  // repainting them on mobile ("lag" on first scroll). Skip it on small screens
  // — the cards simply appear, cleanly.
  if (!window.matchMedia('(max-width: 860px)').matches) {
    gsap.utils.toArray('.bento-cell').forEach((cell, i) => {
      gsap.from(cell, {
        y: 64,
        opacity: 0,
        duration: 1,
        delay: (i % 2) * 0.08,
        ease: 'power3.out',
        immediateRender: false,
        scrollTrigger: { trigger: cell, start: 'top 92%', once: true },
      });
    });
  }
}

/* ── manifesto word lighting ───────────────────────────────── */
function initManifesto() {
  const body = document.getElementById('manifesto-body');
  if (!body) return;
  const words = body.textContent.trim().split(/\s+/);
  body.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  const spans = [...body.querySelectorAll('.w')];

  if (reducedMotion) {
    spans.forEach((s) => s.classList.add('is-lit'));
    return;
  }
  ScrollTrigger.create({
    trigger: body,
    start: 'top 78%',
    end: 'bottom 45%',
    scrub: true,
    onUpdate: (self) => {
      const lit = Math.floor(self.progress * spans.length);
      spans.forEach((s, i) => s.classList.toggle('is-lit', i <= lit));
    },
  });
}

/* ── counters ──────────────────────────────────────────────── */
function initCounters() {
  document.querySelectorAll('.count').forEach((el) => {
    const target = Number(el.dataset.count);
    if (reducedMotion) {
      el.textContent = target.toLocaleString();
      return;
    }
    const state = { n: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(state, {
          n: target,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => { el.textContent = Math.round(state.n).toLocaleString(); },
        });
      },
    });
  });
}

/* ── FAQ height animation ──────────────────────────────────── */
function initFaq() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const summary = item.querySelector('summary');
    const body = item.querySelector('.faq-body');
    if (!summary || !body || reducedMotion) return;
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.open) {
        gsap.to(body, {
          height: 0, opacity: 0, duration: 0.4, ease: 'power2.inOut',
          onComplete: () => { item.open = false; gsap.set(body, { clearProps: 'all' }); },
        });
      } else {
        item.open = true;
        gsap.from(body, { height: 0, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' });
      }
    });
  });
}

/* ── scroll sigils: quiet geometry that drifts in ─────────── */
function initSigils() {
  if (reducedMotion) return;
  document.querySelectorAll('[data-sigil]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed || '0.15');
    gsap.fromTo(el, { opacity: 0, scale: 0.85, rotation: -14 }, {
      opacity: 1, scale: 1, rotation: 0,
      duration: 1.4, ease: 'power3.out',
      immediateRender: false,
      scrollTrigger: { trigger: el, start: 'top 96%', once: true },
    });
    gsap.to(el, {
      y: () => -220 * speed,
      rotation: speed * 40,
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') || el,
        start: 'top bottom', end: 'bottom top', scrub: 0.8,
      },
    });
  });
}

/* ── progress rail ─────────────────────────────────────────── */
function initRail() {
  const rail = document.getElementById('rail');
  if (!rail) return;
  const sections = [...document.querySelectorAll('[data-rail]')];
  sections.forEach((section, i) => {
    const item = document.createElement('div');
    item.className = 'rail-item';
    item.dataset.cursor = 'hover';
    item.innerHTML = `<span class="rail-label">${String(i).padStart(2, '0')} ${section.dataset.rail}</span><span class="rail-dot"></span>`;
    item.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(section, { duration: 1.4 });
      else section.scrollIntoView({ behavior: 'smooth' });
    });
    rail.appendChild(item);
  });
  const items = [...rail.children];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const idx = sections.indexOf(entry.target);
      items.forEach((it, i) => it.classList.toggle('is-active', i === idx));
    });
  }, { rootMargin: '-40% 0px -40% 0px' });
  sections.forEach((s) => io.observe(s));
}

/* ── live system log ───────────────────────────────────────── */
const SYSLOG_LINES = [
  '09:41:07 <b>role.found</b> · Controls Engineer · Houston · posted today',
  '09:41:12 <b>role.matched</b> · inside your box · roles, city, size',
  '09:41:19 <b>owner.found</b> · Engineering Manager · email verified',
  '09:41:26 <b>email.sent</b> · step 1 · about the open role',
  '09:41:33 <b>followup.sent</b> · step 2 · day 3',
  '09:41:40 <b>reply.tagged</b> · interested · alert sent',
  '09:41:48 <b>intro.booked</b> · Tue 10:00 CT · on your calendar',
];
function initSyslog() {
  const line = document.getElementById('syslog-line');
  if (!line) return;
  let i = 0;
  const swap = () => {
    line.innerHTML = SYSLOG_LINES[i % SYSLOG_LINES.length];
    if (!reducedMotion) gsap.fromTo(line, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    i += 1;
  };
  swap();
  setInterval(swap, 2600);
}

/* ── cta ambient video ─────────────────────────────────────── */
function initCtaVideo() {
  const video = document.getElementById('cta-video');
  if (!video || reducedMotion) return;
  video.src = '/img/aurora-loop.mp4';
  video.addEventListener('error', () => video.remove(), { once: true });
  video.addEventListener('canplay', () => {
    video.classList.add('is-ready');
    const bg = video.parentNode;
    let loop = null;
    const loop_ = seamlessLoop(video, 0.55, 1.1, autoplayFallback(bg, () => loop));
    loop = loop_;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loop.play();
      else loop.pause();
    }, { rootMargin: '120px' });
    io.observe(bg);
  }, { once: true });
}

/* ── boot ──────────────────────────────────────────────────── */
buildBands();
initDemos();
initRail();
initSigils();
initSyslog();
initCtaVideo();
initReviews();
initContact();
initReveals();
initManifesto();
initCounters();
initFaq();
initCursor();
initMagnetic();
initSpotlight();
initNav(lenis);

initHero();
import('./lib/plexus.js').then(({ initPlexus }) => initPlexus('hero-plexus', { reducedMotion }));
if (!reducedMotion) {
  Promise.all([import('./lib/sculpt.js'), document.fonts.ready]).then(([{ initSculpt }]) => {
    document.querySelectorAll('canvas.sculpt').forEach((canvas) => {
      const sculpt = initSculpt(canvas, canvas.dataset.shape);
      const isLogo = canvas.dataset.shape === 'logo';
      ScrollTrigger.create({
        trigger: canvas.closest('.proto-step') || canvas.closest('section'),
        start: 'top 85%',
        end: isLogo ? 'center 38%' : 'center 48%',
        scrub: 0.4,
        onUpdate: (self) => sculpt.setProgress(self.progress),
      });
    });
  });
}

runPreloader({ reducedMotion, onReveal: heroIntro }).then(() => {
  ScrollTrigger.refresh();
});
// No window.load refresh: on mobile the hero video finishes downloading seconds
// later, and a refresh then reflows the pinned hero mid-scroll (reads as a
// "reload"). Layout is stable after the preloader, so one refresh above suffices.

/* ── fit cards pop in on scroll ────────────────────────────── */
function initFit() {
  if (reducedMotion) return;
  const cols = document.querySelectorAll('.fit-col');
  if (!cols.length) return;
  gsap.from(cols, {
    y: 70, scale: 0.92, opacity: 0, duration: 1.1, ease: 'back.out(1.6)', stagger: 0.18, clearProps: 'transform,opacity',
    scrollTrigger: { trigger: '.fit-grid', start: 'top 80%', once: true },
  });
}
initFit();
