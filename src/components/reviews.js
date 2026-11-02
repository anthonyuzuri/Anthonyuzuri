/** Testimonial rotator with progress dots; pauses on hover. */
const INTERVAL_MS = 6000;

export function initReviews() {
  const stage = document.getElementById('reviews-stage');
  const dotsHost = document.getElementById('reviews-dots');
  const counter = document.getElementById('reviews-counter');
  if (!stage || !dotsHost) return;

  const items = [...stage.querySelectorAll('.review')];
  document.documentElement.style.setProperty('--review-ms', `${INTERVAL_MS}ms`);

  items.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'reviews-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
    dot.dataset.cursor = 'hover';
    dot.innerHTML = '<i></i>';
    dot.addEventListener('click', () => show(i, true));
    dotsHost.appendChild(dot);
  });
  const dots = [...dotsHost.children];

  let active = 0;
  let timer = null;

  function show(i, manual = false) {
    items[active].classList.remove('is-active');
    dots[active].classList.remove('is-active');
    active = i % items.length;
    items[active].classList.add('is-active');
    // restart the dot fill animation
    const dot = dots[active];
    dot.classList.remove('is-active');
    void dot.offsetWidth;
    dot.classList.add('is-active');
    counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (manual) restart();
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(active + 1), INTERVAL_MS);
  }

  stage.addEventListener('pointerenter', () => clearInterval(timer));
  stage.addEventListener('pointerleave', restart);

  show(0);
  restart();
}
