import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The intake panel hosts a cross-origin CRM form, which creates two seams the
 * rest of the page doesn't have:
 *
 *  1. Pointer events stop at the iframe edge, so the custom cursor would freeze
 *     there. Fade it out while the pointer is over the panel and let the native
 *     pointer take over.
 *  2. The embed sets its own height after it loads. ScrollTrigger caches
 *     positions, so that late growth leaves stale offsets — but refreshing
 *     mid-scroll reflows the pinned hero and reads as a reload (the same reason
 *     main.js has no window.load refresh). So we only remeasure while the page
 *     is still at the top, which covers the normal first-paint case. Everything
 *     the embed can push around sits below the last pin, so a skipped refresh
 *     costs nothing.
 */
export function initContact() {
  const panel = document.getElementById('contact-panel');
  if (!panel) return;

  const cursor = document.getElementById('cursor');
  if (cursor && !window.matchMedia('(hover: none)').matches) {
    panel.addEventListener('pointerenter', () => cursor.classList.add('is-offstage'));
    panel.addEventListener('pointerleave', () => cursor.classList.remove('is-offstage'));
  }

  const frame = panel.querySelector('iframe');
  if (!frame || typeof ResizeObserver === 'undefined') return;

  let lastHeight = 0;
  const observer = new ResizeObserver(() => {
    const height = frame.getBoundingClientRect().height;
    if (Math.abs(height - lastHeight) < 2) return;
    lastHeight = height;
    if (window.scrollY < 10) ScrollTrigger.refresh();
  });
  observer.observe(frame);
}
