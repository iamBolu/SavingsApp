/* Ask Before You Spend: the app.
   Stage 1 prototype. Profiles (name + PIN + money numbers) live in
   localStorage, so every account is tailored to its owner without a
   backend. The FinanceBrain answers questions against the profile. */

const USERS_KEY = 'abys-app-users';
const SESSION_KEY = 'abys-app-session';

const $ = (id) => document.getElementById(id);

const loadUsers = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
  catch (e) { return {}; }
};
const saveUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));

const fmt = (n) =>
  '$' + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n) => '$' + Math.round(Math.abs(n)).toLocaleString('en-CA');

let currentUser = null; // name of the logged-in profile

/* ---------- screen switching ---------- */
function show(screenId) {
  document.querySelectorAll('.screen').forEach((s) =>
    s.classList.toggle('is-active', s.id === screenId));
  const loggedIn = screenId === 'dashScreen';
  $('logoutBtn').hidden = !currentUser;
  $('editProfileBtn').hidden = !loggedIn;
  $('whoami').textContent = currentUser ? currentUser : '';
}

/* ---------- auth ---------- */
let authMode = 'login'; // or 'create'
let selectedProfile = null;

function renderAuth() {
  const users = Object.keys(loadUsers());
  const hasUsers = users.length > 0;
  if (!hasUsers) authMode = 'create';

  $('authTitle').textContent = authMode === 'create' ? 'Make it yours.' : 'Welcome back.';
  $('authSub').textContent = authMode === 'create'
    ? 'A name and a PIN. Your numbers stay on this device.'
    : 'Pick your profile and enter your PIN.';
  $('nameField').hidden = authMode !== 'create';
  $('authSubmit').textContent = authMode === 'create' ? 'Create profile' : 'Log in';
  $('switchMode').hidden = !hasUsers;
  $('modeToggle').textContent = authMode === 'create' ? 'Log in instead' : 'Create a profile';
  $('authError').textContent = '';

  const list = $('profileList');
  list.innerHTML = '';
  if (authMode === 'login') {
    users.forEach((name) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'profile-chip' + (name === selectedProfile ? ' is-active' : '');
      b.textContent = name;
      b.addEventListener('click', () => { selectedProfile = name; renderAuth(); $('authPin').focus(); });
      list.appendChild(b);
    });
    if (!selectedProfile && users.length) selectedProfile = users[0];
  }
}

$('modeToggle').addEventListener('click', () => {
  authMode = authMode === 'create' ? 'login' : 'create';
  renderAuth();
});

$('authForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const pin = $('authPin').value.trim();
  const users = loadUsers();

  if (!/^\d{4}$/.test(pin)) { $('authError').textContent = 'PIN needs to be 4 digits.'; return; }

  if (authMode === 'create') {
    const name = $('authName').value.trim();
    if (!name) { $('authError').textContent = 'Tell me your name.'; return; }
    if (users[name]) { $('authError').textContent = 'That profile exists. Log in instead.'; return; }
    users[name] = { pin, profile: null };
    saveUsers(users);
    currentUser = name;
    sessionStorage.setItem(SESSION_KEY, name);
    show('setupScreen');
    prefillSetup(null);
    return;
  }

  if (!selectedProfile) { $('authError').textContent = 'Pick a profile above.'; return; }
  if (users[selectedProfile].pin !== pin) { $('authError').textContent = 'Wrong PIN. Try again.'; return; }
  currentUser = selectedProfile;
  sessionStorage.setItem(SESSION_KEY, currentUser);
  users[currentUser].profile ? enterDashboard() : (show('setupScreen'), prefillSetup(null));
});

$('logoutBtn').addEventListener('click', () => {
  currentUser = null;
  selectedProfile = null;
  sessionStorage.removeItem(SESSION_KEY);
  authMode = 'login';
  $('authPin').value = '';
  renderAuth();
  show('authScreen');
});

/* ---------- setup wizard ---------- */
function billRow(name = '', amount = '') {
  const row = document.createElement('div');
  row.className = 'bill-row';
  row.innerHTML = `
    <input type="text" maxlength="30" placeholder="Rent" value="${name}" aria-label="Bill name">
    <input type="number" step="0.01" min="0" placeholder="800" value="${amount}" aria-label="Bill amount">
    <button type="button" class="bill-remove" aria-label="Remove bill">✕</button>`;
  row.querySelector('.bill-remove').addEventListener('click', () => row.remove());
  return row;
}

$('addBill').addEventListener('click', () => $('billRows').appendChild(billRow()));

function prefillSetup(profile) {
  const rows = $('billRows');
  rows.innerHTML = '';
  if (profile) {
    $('setBalance').value = profile.balance;
    $('setDaily').value = profile.avgDailySpend;
    $('setPayday').value = profile.paydayDate;
    profile.bills.forEach((b) => rows.appendChild(billRow(b.name, b.amount)));
    $('setGoalName').value = profile.goal.name;
    $('setGoalTarget').value = profile.goal.target;
    $('setGoalSaved').value = profile.goal.saved;
    $('setGoalMonthly').value = profile.goal.monthly;
  } else {
    rows.appendChild(billRow());
    rows.appendChild(billRow());
    // default payday: two weeks out
    const d = new Date(); d.setDate(d.getDate() + 14);
    $('setPayday').value = d.toISOString().slice(0, 10);
  }
}

$('setupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const bills = [...$('billRows').querySelectorAll('.bill-row')]
    .map((r) => {
      const [nameEl, amtEl] = r.querySelectorAll('input');
      return { name: nameEl.value.trim(), amount: parseFloat(amtEl.value) || 0 };
    })
    .filter((b) => b.name && b.amount > 0);

  const profile = {
    name: currentUser,
    balance: parseFloat($('setBalance').value),
    avgDailySpend: parseFloat($('setDaily').value),
    paydayDate: $('setPayday').value,
    spentToday: 0,
    bills,
    goal: {
      name: $('setGoalName').value.trim(),
      target: parseFloat($('setGoalTarget').value),
      saved: parseFloat($('setGoalSaved').value),
      monthly: parseFloat($('setGoalMonthly').value),
    },
  };

  const users = loadUsers();
  users[currentUser].profile = profile;
  saveUsers(users);
  enterDashboard();
});

$('editProfileBtn').addEventListener('click', () => {
  const p = loadUsers()[currentUser]?.profile;
  prefillSetup(p);
  show('setupScreen');
});

/* ---------- dashboard ---------- */
function enterDashboard() {
  const p = loadUsers()[currentUser].profile;
  const safe = FinanceBrain.safeToSpend(p);
  const days = FinanceBrain.daysToPayday(p);
  const daily = FinanceBrain.dailyBudget(p);

  const hour = new Date().getHours();
  const daypart = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  $('greeting').textContent = `Good ${daypart}, ${currentUser}.`;
  $('greetSub').textContent = `Payday is ${days} day${days > 1 ? 's' : ''} away. Ask me before anything leaves the account.`;

  $('dashSafe').textContent = fmt(safe);
  $('dashSafeSub').textContent = `${fmt0(daily)} a day for ${days} day${days > 1 ? 's' : ''}, after ${fmt0(FinanceBrain.billsTotal(p))} in bills and ${fmt0(p.goal.monthly)} reserved for the ${p.goal.name}.`;

  const pct = Math.min(100, Math.round((p.goal.saved / p.goal.target) * 100));
  $('dashGoalLabel').textContent = `Savings goal · ${p.goal.name}`;
  $('goalFill').style.width = pct + '%';
  $('dashGoalSub').textContent = `${fmt0(p.goal.saved)} of ${fmt0(p.goal.target)} (${pct}%), adding ${fmt0(p.goal.monthly)} a month.`;

  // daily smart-transfer tip from the brain
  const tip = FinanceBrain.transferAdvice(p);
  $('tipTitle').textContent = tip.verdict + '.';
  $('tipBody').textContent = tip.note;

  $('chatBalance').textContent = `Chequing · ${fmt(p.balance)}`;
  $('chatPayday').textContent = 'Payday ' + new Date(p.paydayDate)
    .toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });

  show('dashScreen');
  if (!$('chatBody').children.length) {
    renderAnswer(FinanceBrain.answer(p, 'help'), null);
  }
}

/* ---------- chat (same receipt language as the landing page) ---------- */
function renderAnswer(s, questionText) {
  const chatBody = $('chatBody');

  if (questionText) {
    const user = document.createElement('div');
    user.className = 'msg msg-user msg-enter';
    user.textContent = questionText;
    chatBody.appendChild(user);
  }

  const think = document.createElement('div');
  think.className = 'msg thinking';
  think.innerHTML = '<span></span><span></span><span></span>';
  chatBody.appendChild(think);

  setTimeout(() => {
    think.remove();
    const ai = document.createElement('div');
    ai.className = 'msg msg-ai msg-enter';
    const rows = s.rows.map(([label, amt, mod]) => {
      const liClass = (mod || '').startsWith('total') ? ' class="row-total"' : '';
      const amtClass = 'amt' + (mod === 'amt-neg' || mod === 'total-neg' ? ' amt-neg' : '');
      return `<li${liClass}><span>${label}</span><span class="${amtClass}">${amt}</span></li>`;
    }).join('');
    ai.innerHTML =
      `<p class="receipt-head">Ask Before You Spend · ${currentUser}</p>` +
      `<p class="verdict ${s.verdictClass}">${s.verdict}</p>` +
      `<ul class="math-rows">${rows}</ul>` +
      `<p class="ai-note">${s.note}</p>`;
    chatBody.appendChild(ai);
    ai.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 650);
}

$('askForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('askInput').value.trim();
  if (!q || !currentUser) return;
  const p = loadUsers()[currentUser].profile;
  renderAnswer(FinanceBrain.answer(p, q), q);
  $('askInput').value = '';
});

/* ---------- boot ---------- */
(function boot() {
  const session = sessionStorage.getItem(SESSION_KEY);
  const users = loadUsers();
  if (session && users[session]) {
    currentUser = session;
    users[session].profile ? enterDashboard() : (show('setupScreen'), prefillSetup(null));
  } else {
    renderAuth();
    show('authScreen');
  }
})();
