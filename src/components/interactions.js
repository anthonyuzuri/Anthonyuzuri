import { gsap } from 'gsap';

/** Custom cursor: dot follows instantly, ring eases behind. */
export function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor || window.matchMedia('(hover: none)').matches) return;

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.14, ease: 'power2.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.14, ease: 'power2.out' });

  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const target = e.target.closest('[data-cursor]');
    cursor.classList.toggle('is-hover', Boolean(target));
  });
}

/** Magnetic pull on [data-magnetic] elements. */
export function initMagnetic() {
  if (window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.32);
      yTo((e.clientY - r.top - r.height / 2) * 0.32);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/** Pointer-tracked spotlight + 3D tilt on bento cells. */
export function initSpotlight() {
  if (window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.bento-cell').forEach((cell) => {
    const rx = gsap.quickTo(cell, 'rotationX', { duration: 0.6, ease: 'power2.out' });
    const ry = gsap.quickTo(cell, 'rotationY', { duration: 0.6, ease: 'power2.out' });
    gsap.set(cell, { transformPerspective: 1100 });
    cell.addEventListener('pointermove', (e) => {
      const r = cell.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
      cell.style.setProperty('--my', `${e.clientY - r.top}px`);
      rx((0.5 - py) * 3.2);
      ry((px - 0.5) * 3.2);
    }, { passive: true });
    cell.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/** Nav: blur-in after hero, hide on scroll down, reveal on scroll up. */
export function initNav(lenis) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  let lastY = 0;
  const onScroll = (y) => {
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 500 && y > lastY + 4);
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
}
