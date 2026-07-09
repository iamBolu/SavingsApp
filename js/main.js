/* Ask Before You Spend: landing interactions */

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
const SCENARIOS = {
  airpods: {
    question: 'Can I afford new AirPods this weekend? They’re $329.',
    verdict: 'Yes, comfortably.',
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
    verdict: 'Yes, easily.',
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
    verdict: 'Not yet. Wait for Friday.',
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

function playScenario(key) {
  const s = SCENARIOS[key];
  clearTimers();
  chatBody.innerHTML = '';

  // user bubble, typed character by character
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
        `<p class="verdict ${s.verdictClass}">${s.verdict}</p>` +
        `<ul class="math-rows">${rows}</ul>` +
        `<p class="ai-note">${s.note}</p>`;
      chatBody.appendChild(ai);
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

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chips.forEach((c) => {
      c.classList.toggle('is-active', c === chip);
      c.setAttribute('aria-selected', c === chip);
    });
    playScenario(chip.dataset.scenario);
  });
});

// autoplay the first scenario when the panel scrolls into view
const chatPanel = document.getElementById('chatPanel');
const chatIO = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    playScenario('airpods');
    chatIO.disconnect();
  }
}, { threshold: 0.3 });
chatIO.observe(chatPanel);

/* ---------- bank theme switcher ---------- */
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
document.querySelectorAll('.bank-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.bank-chip').forEach((c) =>
      c.classList.toggle('is-active', c === chip));
    appMock.dataset.bank = chip.dataset.bank;
    mockBankName.textContent = BANK_NAMES[chip.dataset.bank];
  });
});
