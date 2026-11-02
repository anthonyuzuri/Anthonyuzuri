/**
 * Live micro-simulations inside the bento cells.
 * All deterministic loops · no network, no libraries.
 */

const PIPE_ROWS = [
  { name: 'Acme Industrial · $42,000', platform: 'HubSpot' },
  { name: 'Nordic Freight Co · $18,500', platform: 'Zoho' },
  { name: 'Beacon Legal · $61,200', platform: 'Salesforce' },
  { name: 'Harbor Dental · $9,800', platform: 'GHL' },
  { name: 'Atlas Roofing · $27,400', platform: 'HubSpot' },
];
const PIPE_STATES = [
  { cls: 's-queued', label: 'NEW LEAD' },
  { cls: 's-moving', label: 'SCORING…' },
  { cls: 's-synced', label: '● ROUTED' },
];

export function initPipelineDemo() {
  const host = document.getElementById('demo-pipeline');
  if (!host) return;
  host.innerHTML = PIPE_ROWS.map((r, i) => `
    <div class="demo-row" data-i="${i}">
      <span class="demo-name">${r.name}</span>
      <span class="demo-status s-queued">QUEUED</span>
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

const PROPOSAL_LINES = [
  ['> deal.read', ' · Beacon Legal · $61,200'],
  ['> price.from_crm', ' · 3 line items resolved'],
  ['> assemble.proposal', ' ██████████ 100%'],
  ['> deliver', ' <b>ready in 1m 34s</b> <span class="ok">✓ sent</span>'],
];

export function initTypewriterDemo() {
  const host = document.getElementById('demo-typewriter');
  if (!host) return;
  host.innerHTML = PROPOSAL_LINES.map(() => '<div class="demo-line"></div>').join('');
  const lines = [...host.querySelectorAll('.demo-line')];

  function typeLine(i) {
    if (i >= PROPOSAL_LINES.length) {
      setTimeout(() => {
        lines.forEach((l) => { l.innerHTML = ''; });
        typeLine(0);
      }, 3200);
      return;
    }
    const [prefix, rest] = PROPOSAL_LINES[i];
    let n = 0;
    lines[i].innerHTML = `<span class="demo-caret"></span>`;
    const t = setInterval(() => {
      n += 1;
      const shown = prefix.slice(0, n);
      if (n <= prefix.length) {
        lines[i].innerHTML = `${shown}<span class="demo-caret"></span>`;
      } else {
        clearInterval(t);
        lines[i].innerHTML = prefix + rest;
        setTimeout(() => typeLine(i + 1), 340);
      }
    }, 34);
  }
  typeLine(0);
}

const LEDGER = [
  { name: 'INV-2201 · Atlas Roofing', amount: 12400 },
  { name: 'INV-2202 · Harbor Dental', amount: 4200 },
  { name: 'INV-2203 · Nordic Freight', amount: 8750 },
  { name: 'INV-2204 · Beacon Legal', amount: 15300 },
];

export function initLedgerDemo() {
  const host = document.getElementById('demo-ledger');
  if (!host) return;
  host.innerHTML = LEDGER.map((r) => `
    <div class="demo-row">
      <span class="demo-name">${r.name}</span>
      <span class="demo-status demo-amount demo-due">$${r.amount.toLocaleString()} · FOLLOW-UP</span>
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
    cell.textContent = `${base} · ${paid ? 'FOLLOW-UP' : 'PAID ✓'}`;
    i += 1;
  }, 1150);
}

const ONBOARD_STEPS = [
  'Payment received · Stripe',
  'CRM record created',
  'Slack channel spun up',
  'Kickoff call booked',
  'Welcome sequence live',
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
