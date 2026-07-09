/* FinanceBrain: the assistant's reasoning engine.
   Rule-based intent matching over a user profile, so the same brain
   answers the landing-page demo and each logged-in profile in the app.
   Every answer returns a receipt: { verdict, verdictClass, rows, note }. */

window.FinanceBrain = (() => {

  const fmt = (n) =>
    '$' + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = (n) => '$' + Math.round(Math.abs(n)).toLocaleString('en-CA');

  /* ---------- core math ---------- */

  function daysToPayday(p) {
    const diff = Math.ceil((new Date(p.paydayDate) - new Date()) / 86400000);
    return Math.max(1, diff);
  }

  const billsTotal = (p) => p.bills.reduce((s, b) => s + Number(b.amount || 0), 0);

  // what is genuinely free: balance, minus bills due before payday,
  // minus the month's planned savings transfer
  const safeToSpend = (p) => p.balance - billsTotal(p) - Number(p.goal.monthly || 0);

  const dailyBudget = (p) => safeToSpend(p) / daysToPayday(p);

  /* ---------- intents ---------- */

  function affordability(p, amount) {
    const safe = safeToSpend(p);
    const days = daysToPayday(p);
    const daily = Number(p.avgDailySpend) || 45;
    const left = safe - amount;

    const rows = [
      ['Safe to spend until payday', fmt(safe), ''],
      ['This purchase', '−' + fmt(amount), 'amt-neg'],
    ];

    if (left >= 0) {
      rows.push(['Left to spend', fmt(left), 'total']);
      const runway = left / daily;
      if (runway >= days) {
        return {
          verdict: 'Approved', verdictClass: 'verdict-yes', rows,
          note: `Good consequence: even after this you can keep spending about ${fmt0(daily)} a day for all ${days} days to payday, and the ${p.goal.name} stays exactly on schedule.`,
        };
      }
      return {
        verdict: 'Approved', verdictClass: 'verdict-yes', rows,
        note: `Fine, with a catch: ${fmt(left)} covers about ${Math.max(1, Math.floor(runway))} of the ${days} days to payday at your usual pace. Ease off the small stuff this week and nothing else changes.`,
      };
    }

    const monthly = Number(p.goal.monthly) || 1;
    const delayWeeks = Math.max(1, Math.round((-left / monthly) * 4.3));
    rows.push(['Shortfall', '−' + fmt(-left), 'total-neg']);
    return {
      verdict: 'Wait', verdictClass: 'verdict-wait', rows,
      note: `Bad consequence: you'd be ${fmt(-left)} short of free money. Covering it from savings pushes the ${p.goal.name} back roughly ${delayWeeks} week${delayWeeks > 1 ? 's' : ''}. Payday lands in ${days} day${days > 1 ? 's' : ''}; ask again then and the answer improves.`,
    };
  }

  function savingsStatus(p) {
    const g = p.goal;
    const remaining = g.target - g.saved;
    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
    const monthsLeft = remaining / (Number(g.monthly) || 1);
    const eta = new Date();
    eta.setDate(eta.getDate() + Math.round(monthsLeft * 30.4));
    const etaLabel = eta.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
    const boost = Math.round((25 / (Number(g.monthly) || 1)) * 30.4);

    return {
      verdict: pct >= 50 ? 'On track' : 'Building',
      verdictClass: 'verdict-yes',
      rows: [
        [`${g.name}: saved so far`, fmt(g.saved), ''],
        ['Target', fmt(g.target), ''],
        ['Still to go', fmt(remaining), 'amt-neg'],
        ['Progress', pct + '%', 'total'],
      ],
      note: `At ${fmt0(g.monthly)} a month you land in ${etaLabel}, about ${Math.ceil(monthsLeft * 4.3)} weeks out. Adding even $25 a week brings that forward ~${boost} days per month you keep it up.`,
    };
  }

  function transferAdvice(p) {
    const daily = dailyBudget(p);
    const spent = Number(p.spentToday) || 0;
    const spare = Math.max(0, Math.floor((daily - spent) / 5) * 5);
    const monthly = Number(p.goal.monthly) || 1;

    if (spare >= 5) {
      const sooner = Math.round((spare / monthly) * 30.4);
      return {
        verdict: `Move ${fmt0(spare)} today`,
        verdictClass: 'verdict-yes',
        rows: [
          ["Today's spending room", fmt(daily), ''],
          ['Spent so far today', '−' + fmt(spent), 'amt-neg'],
          ['Free to transfer', fmt0(spare), 'total'],
        ],
        note: `Move ${fmt0(spare)} from chequing to savings right now and the ${p.goal.name} lands about ${sooner} day${sooner > 1 ? 's' : ''} sooner. Do this most days and it compounds fast.`,
      };
    }
    return {
      verdict: 'Not today',
      verdictClass: 'verdict-wait',
      rows: [
        ["Today's spending room", fmt(daily), ''],
        ['Spent so far today', '−' + fmt(spent), 'amt-neg'],
      ],
      note: `You've used today's room, and that's fine: the plan already moves ${fmt0(p.goal.monthly)} a month automatically. Check with me tomorrow morning; that's when there's usually spare to sweep.`,
    };
  }

  function spendingBreakdown(p) {
    if (p.categories && p.categories.length) {
      const total = p.categories.reduce((s, c) => s + c[1], 0);
      const rows = p.categories.slice(0, 5).map(([label, amt]) => [label, fmt(amt), 'amt-neg']);
      rows.push(['Total this month', fmt(total), 'total']);
      const [topName] = p.categories.reduce((a, b) => (b[1] > a[1] ? b : a));
      return {
        verdict: 'This month', verdictClass: 'verdict-yes', rows,
        note: `${topName} is the biggest line. It's also the one with the most give: trimming it 15% frees roughly ${fmt0(total * 0.15 * 0.4)} a month without touching anything you'd miss.`,
      };
    }
    const daily = Number(p.avgDailySpend) || 45;
    const dayOfMonth = new Date().getDate();
    const est = daily * dayOfMonth;
    return {
      verdict: 'Rough picture', verdictClass: 'verdict-yes',
      rows: [
        ['Average daily spending', fmt(daily), ''],
        [`Estimated month to date (${dayOfMonth} days)`, fmt(est), 'total'],
      ],
      note: 'Upload a statement (CSV, arriving in stage 2) and I can break this into real categories and find the leaks.',
    };
  }

  function billsList(p) {
    const rows = p.bills.map((b) => [b.name + (b.due ? ` (${b.due})` : ''), fmt(b.amount), 'amt-neg']);
    rows.push(['Total before payday', fmt(billsTotal(p)), 'total']);
    return {
      verdict: 'Reserved', verdictClass: 'verdict-yes', rows,
      note: `These are already set aside, which is why your safe-to-spend is ${fmt(safeToSpend(p))} and not your full balance. No surprises on due dates.`,
    };
  }

  function balanceStatus(p) {
    const days = daysToPayday(p);
    return {
      verdict: 'Your money', verdictClass: 'verdict-yes',
      rows: [
        ['Current balance', fmt(p.balance), ''],
        ['Bills before payday', '−' + fmt(billsTotal(p)), 'amt-neg'],
        [`Reserved for ${p.goal.name}`, '−' + fmt(p.goal.monthly), 'amt-neg'],
        ['Safe to spend', fmt(safeToSpend(p)), 'total'],
      ],
      note: `That's ${fmt0(dailyBudget(p))} a day for the ${days} day${days > 1 ? 's' : ''} until payday. Spend under that and you're winning quietly.`,
    };
  }

  function helpCard() {
    return {
      verdict: 'Ask me anything', verdictClass: 'verdict-yes',
      rows: [
        ['"Can I afford a $120 jacket?"', '', ''],
        ['"How are my savings doing?"', '', ''],
        ['"Should I move money to savings today?"', '', ''],
        ['"What are my biggest expenses?"', '', ''],
        ['"What bills are coming up?"', '', ''],
      ],
      note: 'I know your balance, bills, goal, and pace. Every answer shows the math, so you can argue with it.',
    };
  }

  /* ---------- intent router ---------- */

  function answer(profile, question) {
    const q = question.toLowerCase();
    const m = question.replace(/,/g, '').match(/\$\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)/);
    const amount = m ? parseFloat(m[1] || m[2]) : null;

    // order matters: more specific intents win
    if (/save more|transfer|put away|move (some|money)|sweep/.test(q)) return transferAdvice(profile);
    if (/saving|goal|on track/.test(q) && !amount) return savingsStatus(profile);
    if (amount && /afford|buy|purchase|get|worth|splurge|order|cost|spend/.test(q)) return affordability(profile, amount);
    if (/spent|spending|biggest|expense|where.*money|breakdown/.test(q)) return spendingBreakdown(profile);
    if (/bill|due|rent|subscription/.test(q)) return billsList(profile);
    if (/balance|payday|how much|left|have/.test(q)) return balanceStatus(profile);
    if (amount) return affordability(profile, amount);
    if (/saving|goal/.test(q)) return savingsStatus(profile);
    return helpCard();
  }

  return { answer, transferAdvice, safeToSpend, dailyBudget, daysToPayday, billsTotal };
})();
