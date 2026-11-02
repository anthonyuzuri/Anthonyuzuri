import { gsap } from 'gsap';

const WORDS = ['NOISE', 'SIGNAL', 'PATTERN', 'SYSTEM', 'INTELLIGENCE', 'UZURI'];
const DURATION = 2.1;

/**
 * Counter + word-cycle preloader. Resolves when the curtain has lifted.
 * `onReveal` fires the moment the curtain STARTS rising, so the hero can
 * animate in behind it — running it after the lift makes the revealed
 * content snap back to hidden and replay (reads as a "reload").
 */
export function runPreloader({ reducedMotion = false, onReveal } = {}) {
  const el = document.getElementById('preloader');
  const word = document.getElementById('preloader-word');
  const count = document.getElementById('preloader-count');

  if (!el) { onReveal?.(); return Promise.resolve(); }
  if (reducedMotion) {
    el.remove();
    document.body.removeAttribute('data-loading');
    onReveal?.();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const state = { n: 0 };
    const tl = gsap.timeline({
      onComplete: () => { el.remove(); resolve(); },
    });

    tl.to(state, {
      n: 100,
      duration: DURATION,
      ease: 'power2.inOut',
      onUpdate: () => {
        const v = Math.round(state.n);
        count.textContent = String(v).padStart(3, '0');
        const idx = Math.min(WORDS.length - 1, Math.floor((v / 100) * WORDS.length));
        if (word.textContent !== WORDS[idx]) {
          word.textContent = WORDS[idx];
          gsap.fromTo(word, { opacity: 0.2, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
        }
      },
    });
    tl.to(el, {
      yPercent: -100,
      duration: 0.9,
      ease: 'power4.inOut',
      onStart: () => {
        el.classList.add('is-done');
        document.body.removeAttribute('data-loading');
        onReveal?.(); // hero animates in behind the rising curtain
      },
    }, '+=0.15');
  });
}
