/**
 * Live micro-simulations inside the bento cells.
 * All deterministic loops · no network, no libraries.
 */

const PIPE_ROWS = [
  { name: 'Controls Engineer · Houston' },
  { name: 'Process Engineer · Dallas' },
  { name: 'Electrical Engineer · Austin' },
  { name: 'Project Engineer · Phoenix' },
  { name: 'Mechanical Engineer · Charlotte' },
];
const PIPE_STATES = [
  { cls: 's-queued', label: 'NEW ROLE' },
  { cls: 's-moving', label: 'CHECKING…' },
  { cls: 's-synced', label: '● IN YOUR BOX' },
];

export function initPipelineDemo() {
  const host = document.getElementById('demo-pipeline');
  if (!host) return;
  host.innerHTML = PIPE_ROWS.map((r, i) => `
    <div class="demo-row" data-i="${i}">
      <span class="demo-name">${r.name}</span>
      <span class="demo-status s-queued">NEW ROLE</span>
    </div>`).join('');
  const rows = [...host.querySelectorAll('.demo-status')];
  const state = rows.map(() => 0);
  let cursor = 0;
  setInterval(() => {
    if (!demosLive) return;
    state[cursor] = (state[cursor] + 1) % PIPE_STATES.length;
    const s = PIPE_STATES[state[cursor]];
    rows[cursor].className = `demo-status ${s.cls}`;
    rows[cursor].textContent = s.label;
    cursor = (cursor + 1) % rows.length;
  }, 700);
}

const CONTACT_CHECKS = ['Owns the hire', 'Email verified', '3 roles open on his team'];

export function initTypewriterDemo() {
  const host = document.getElementById('demo-typewriter');
  if (!host) return;
  host.classList.add('demo-contact');
  host.innerHTML = `
    <div class="contact-card-head">
      <span class="contact-avatar">MR</span>
      <span class="contact-who"><b>Mark R.</b><span>Engineering Manager</span><span>Gulf Coast Fabrication</span></span>
    </div>
    ${CONTACT_CHECKS.map((s) => `<div class="demo-check"><i>✓</i><span>${s}</span></div>`).join('')}`;
  const checks = [...host.querySelectorAll('.demo-check')];
  let i = 0;
  setInterval(() => {
    if (!demosLive) return;
    if (i < checks.length) {
      checks[i].classList.add('is-done');
      i += 1;
    } else {
      setTimeout(() => checks.forEach((c) => c.classList.remove('is-done')), 400);
      i = 0;
    }
  }, 900);
}

const LEDGER = [
  { name: 'Controls Engineer · Houston', step: 'STEP 2' },
  { name: 'Process Engineer · Dallas', step: 'STEP 1' },
  { name: 'Field Engineer · Midland', step: 'STEP 3' },
  { name: 'Quality Engineer · Austin', step: 'STEP 2' },
];

export function initLedgerDemo() {
  const host = document.getElementById('demo-ledger');
  if (!host) return;
  host.innerHTML = LEDGER.map((r) => `
    <div class="demo-row">
      <span class="demo-name">${r.name}</span>
      <span class="demo-status demo-amount demo-due">${r.step} · FOLLOW UP</span>
    </div>`).join('');
  const cells = [...host.querySelectorAll('.demo-amount')];
  let i = 0;
  setInterval(() => {
    if (!demosLive) return;
    const cell = cells[i % cells.length];
    const paid = cell.classList.contains('demo-paid');
    cell.classList.toggle('demo-paid', !paid);
    cell.classList.toggle('demo-due', paid);
    const base = cell.textContent.split(' · ')[0];
    cell.textContent = `${base} · ${paid ? 'FOLLOW UP' : 'REPLIED ✓'}`;
    i += 1;
  }, 1150);
}

const ONBOARD_STEPS = [
  'Role open · confirmed',
  'Hire owner · confirmed',
  'Inside your box',
  'Meeting booked',
  'Intro sent to you',
];

export function initChecklistDemo() {
  const host = document.getElementById('demo-checklist');
  if (!host) return;
  host.innerHTML = ONBOARD_STEPS.map((s) => `
    <div class="demo-check"><i>✓</i><span>${s}</span></div>`).join('');
  const checks = [...host.querySelectorAll('.demo-check')];
  let i = 0;
  setInterval(() => {
    if (!demosLive) return;
    if (i < checks.length) {
      checks[i].classList.add('is-done');
      i += 1;
    } else {
      setTimeout(() => checks.forEach((c) => c.classList.remove('is-done')), 200);
      i = 0;
    }
  }, 800);
}

let demosLive = true;

/** Demos tick only while the machinery section is on screen. */
export function demosVisible() { return demosLive; }

export function initDemos() {
  initPipelineDemo();
  initTypewriterDemo();
  initLedgerDemo();
  initChecklistDemo();
  const section = document.getElementById('systems');
  if (section) {
    const io = new IntersectionObserver(([entry]) => { demosLive = entry.isIntersecting; });
    io.observe(section);
  }
}
