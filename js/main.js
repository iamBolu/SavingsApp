/* Ask Before You Spend: landing interactions */

// reveal animations only apply once JS is confirmed running
document.documentElement.classList.add('js');

/* ---------- mobile nav ---------- */
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
navToggle.addEventListener('click', () => {
  const open = siteNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', open);
});
siteNav.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    siteNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

/* ---------- scroll reveals ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- chat demo ----------
   Shared facts: balance $2,418.60 · bills before payday $684.00
   reserved savings $400.00 → safe to spend $1,334.60           */
const SAFE_TO_SPEND = 1334.60;

const SCENARIOS = {
  airpods: {
    question: 'Can I afford new AirPods this weekend? They’re $329.',
    verdict: 'Approved',
    verdictClass: 'verdict-yes',
    rows: [
      ['Current balance', '$2,418.60', ''],
      ['Bills before payday (Jul 17)', '−$684.00', 'amt-neg'],
      ['Reserved for Japan trip', '−$400.00', 'amt-neg'],
      ['AirPods', '−$329.00', 'amt-neg'],
      ['Left to spend', '$1,005.60', 'total'],
    ],
    note: 'Buying them today still leaves you $1,005.60 of free money until payday Friday. Enjoy the noise cancelling.',
  },
  dinner: {
    question: 'Dinner out with friends tonight, about $85. Am I good?',
    verdict: 'Approved',
    verdictClass: 'verdict-yes',
    rows: [
      ['Safe to spend until payday', '$1,334.60', ''],
      ['Dinner tonight', '−$85.00', 'amt-neg'],
      ['Left to spend', '$1,249.60', 'total'],
    ],
    note: 'That’s 6% of your safe-to-spend. You’ve also eaten out once this week, well under your usual pace. Go.',
  },
  flight: {
    question: 'Flights to Tokyo dropped to $1,429. Should I grab one now?',
    verdict: 'Wait',
    verdictClass: 'verdict-wait',
    rows: [
      ['Safe to spend until payday', '$1,334.60', ''],
      ['Flight', '−$1,429.00', 'amt-neg'],
      ['Shortfall', '−$94.40', 'total-neg'],
    ],
    note: 'It’s $94.40 more than what’s free right now. Payday lands Friday. Or, since this IS the Japan trip, you could cover it from the $2,150 you’ve already saved.',
  },
};

const chatBody = document.getElementById('chatBody');
const chips = document.querySelectorAll('.chip');
let typeTimer = null;
let stepTimers = [];

function clearTimers() {
  clearInterval(typeTimer);
  stepTimers.forEach(clearTimeout);
  stepTimers = [];
}

const fmtMoney = (n) =>
  '$' + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Build a scenario object from a free-typed question. The math uses
   the same shared facts as the canned scenarios, so answers agree. */
function buildCustomScenario(question) {
  const match = question.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) {
    return {
      question,
      verdict: 'Need a price',
      verdictClass: 'verdict-wait',
      rows: [['Safe to spend until payday', fmtMoney(SAFE_TO_SPEND), '']],
      note: 'Add a dollar amount, like “$60”, and I’ll run the honest math against your bills, savings, and payday.',
    };
  }
  const amount = parseFloat(match[1]);
  const left = SAFE_TO_SPEND - amount;

  if (left >= 0) {
    const share = Math.round((amount / SAFE_TO_SPEND) * 100);
    const comfy = amount <= SAFE_TO_SPEND * 0.5;
    return {
      question,
      verdict: 'Approved',
      verdictClass: 'verdict-yes',
      rows: [
        ['Safe to spend until payday', fmtMoney(SAFE_TO_SPEND), ''],
        ['This purchase', '−' + fmtMoney(amount), 'amt-neg'],
        ['Left to spend', fmtMoney(left), 'total'],
      ],
      note: comfy
        ? `That leaves ${fmtMoney(left)} free until payday Friday. Comfortable.`
        : `That’s ${share}% of your safe-to-spend. Doable, but it thins the cushion to ${fmtMoney(left)} until Friday.`,
    };
  }
  return {
    question,
    verdict: 'Wait',
    verdictClass: 'verdict-wait',
    rows: [
      ['Safe to spend until payday', fmtMoney(SAFE_TO_SPEND), ''],
      ['This purchase', '−' + fmtMoney(amount), 'amt-neg'],
      ['Shortfall', '−' + fmtMoney(-left), 'total-neg'],
    ],
    note: `You’re ${fmtMoney(-left)} short of what’s free right now. Payday lands Friday, Jul 17. Ask me again then.`,
  };
}

/* Types the question bubble, shows the thinking dots, then prints
   the receipt. Both canned and custom questions flow through here. */
function runScenario(s) {
  clearTimers();
  chatBody.innerHTML = '';

  const user = document.createElement('div');
  user.className = 'msg msg-user msg-enter';
  const text = document.createElement('span');
  const caret = document.createElement('span');
  caret.className = 'caret';
  user.append(text, caret);
  chatBody.appendChild(user);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const speed = reduceMotion ? 0 : 28;

  function showAnswer() {
    caret.remove();
    const think = document.createElement('div');
    think.className = 'msg thinking';
    think.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(think);

    stepTimers.push(setTimeout(() => {
      think.remove();
      const ai = document.createElement('div');
      ai.className = 'msg msg-ai msg-enter';
      const rows = s.rows.map(([label, amt, mod]) => {
        const liClass = mod.startsWith('total') ? ' class="row-total"' : '';
        const amtClass = 'amt' + (mod === 'amt-neg' || mod === 'total-neg' ? ' amt-neg' : '');
        return `<li${liClass}><span>${label}</span><span class="${amtClass}">${amt}</span></li>`;
      }).join('');
      ai.innerHTML =
        `<p class="receipt-head">Ask Before You Spend · Receipt</p>` +
        `<p class="verdict ${s.verdictClass}">${s.verdict}</p>` +
        `<ul class="math-rows">${rows}</ul>` +
        `<p class="ai-note">${s.note}</p>`;
      chatBody.appendChild(ai);
      ai.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }, reduceMotion ? 100 : 900));
  }

  if (speed === 0) {
    text.textContent = s.question;
    showAnswer();
  } else {
    typeTimer = setInterval(() => {
      text.textContent = s.question.slice(0, ++i);
      if (i >= s.question.length) {
        clearInterval(typeTimer);
        stepTimers.push(setTimeout(showAnswer, 350));
      }
    }, speed);
  }
}

const playScenario = (key) => runScenario(SCENARIOS[key]);

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chips.forEach((c) => {
      c.classList.toggle('is-active', c === chip);
      c.setAttribute('aria-selected', c === chip);
    });
    playScenario(chip.dataset.scenario);
  });
});

/* free-typed questions from the ask form */
const askForm = document.getElementById('askForm');
const askInput = document.getElementById('askInput');
askForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = askInput.value.trim();
  if (!q) return;
  demoPlayed = true;
  chips.forEach((c) => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
  runScenario(buildCustomScenario(q));
  askInput.value = '';
  askInput.blur();
});

/* autoplay the first scenario when the panel becomes visible.
   Uses both an IntersectionObserver and a scroll fallback, because
   observers can miss programmatic scrolls and restored scroll positions. */
const chatPanel = document.getElementById('chatPanel');
let demoPlayed = false;

function panelInView() {
  const r = chatPanel.getBoundingClientRect();
  return r.top < window.innerHeight * 0.85 && r.bottom > 0;
}

function startDemoOnce() {
  if (demoPlayed) return;
  demoPlayed = true;
  window.removeEventListener('scroll', demoScrollCheck);
  playScenario('airpods');
}

function demoScrollCheck() {
  if (panelInView()) startDemoOnce();
}

if (panelInView()) {
  startDemoOnce();
} else {
  const chatIO = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      startDemoOnce();
      chatIO.disconnect();
    }
  }, { threshold: 0.2 });
  chatIO.observe(chatPanel);
  window.addEventListener('scroll', demoScrollCheck, { passive: true });
}

/* ---------- bank theming, site-wide ----------
   Picking a bank re-tints the whole site accent plus the app
   mockup, and the choice sticks across visits. */
const BANK_NAMES = {
  default: 'Your Bank',
  rbc: 'RBC Royal Bank',
  td: 'TD Canada Trust',
  bmo: 'BMO',
  scotia: 'Scotiabank',
  tangerine: 'Tangerine',
  chase: 'Chase',
  cibc: 'CIBC',
};
const appMock = document.getElementById('appMock');
const mockBankName = document.getElementById('mockBankName');
const bankChips = document.querySelectorAll('.bank-chip');

function applyBank(bank) {
  if (!BANK_NAMES[bank]) bank = 'default';
  appMock.dataset.bank = bank;
  mockBankName.textContent = BANK_NAMES[bank];
  if (bank === 'default') {
    delete document.documentElement.dataset.bank;
  } else {
    document.documentElement.dataset.bank = bank;
  }
  bankChips.forEach((c) => c.classList.toggle('is-active', c.dataset.bank === bank));
  try { localStorage.setItem('abys-bank', bank); } catch (e) { /* private mode */ }
}

bankChips.forEach((chip) => {
  chip.addEventListener('click', () => applyBank(chip.dataset.bank));
});

try {
  const saved = localStorage.getItem('abys-bank');
  if (saved && saved !== 'default') applyBank(saved);
} catch (e) { /* private mode */ }

/* ---------- hero parallax ----------
   Photo and mist drift at different rates while the hero is on
   screen. Skipped entirely for reduced-motion users. */
const heroBg = document.querySelector('.hero-bg');
const heroMist = document.querySelector('.hero-mist');
const hero = document.querySelector('.hero');
const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (heroBg && motionOK) {
  let ticking = false;
  function parallax() {
    const y = window.scrollY;
    if (y < hero.offsetHeight) {
      heroBg.style.transform = `scale(1.12) translateY(${y * 0.16}px)`;
      if (heroMist) heroMist.style.setProperty('--mist-y', `${y * 0.3}px`);
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(parallax);
    }
  }, { passive: true });
}

/* ---------- side rail live clock ----------
   Mirrors the fixed rail: long-form date on one line,
   year and 24h time on the other. Updates every 30 seconds. */
const railDate = document.getElementById('railDate');
const railTime = document.getElementById('railTime');

function updateRailClock() {
  if (!railDate || !railTime) return;
  const now = new Date();
  railDate.textContent = now.toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  railTime.textContent = `${now.getFullYear()} · ${hh}:${mm}`;
}

updateRailClock();
setInterval(updateRailClock, 30000);
