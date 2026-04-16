
const STORAGE_KEY = 'bdd_ops_surprise_v4';
const SESSION_INSTALL_SKIP = 'bdd_install_skip_session';
const APP_VERSION = '4.0.0';

const DEFAULT_STATE = {
  version: APP_VERSION,
  prefs: {
    alertsEnabled: false,
    sound: true,
    vibration: true,
    displayName: '',
    role: '',
    deviceId: '',
  },
  schedules: {
    weekly: {
      amount: 1250,
      start: '2026-05-01',
      firstDue: '2026-05-08',
      reminders: [1, 0],
    },
    milestones: [
      { id: 'balance_5k', label: 'Second $5K activation balance', amount: 5000, dueDate: '2026-04-20', reminders: [3,1,0], note: 'Separate from sales.' },
      { id: 'inventory_10k_1', label: 'First $10K inventory installment', amount: 10000, dueDate: '2026-05-20', reminders: [3,1,0], note: 'Strict commitment.' },
      { id: 'inventory_10k_2', label: 'Second $10K inventory installment', amount: 10000, dueDate: '2026-06-20', reminders: [3,1,0], note: 'Strict commitment.' },
      { id: 'prior_3156', label: 'Prior reimbursement', amount: 3156.59, dueDate: '', reminders: [3,1,0], note: 'Set due date in More.' },
    ],
    expenses: {
      firstSettlementDue: '2026-05-01',
      cycleDays: 14,
      reminders: [1, 0],
    },
    reminderHours: {
      weeklyDayBefore: 18,
      weeklyDayOf: 8,
      milestone3: 9,
      milestone1: 18,
      milestone0: 8,
      expenseDayBefore: 18,
      expenseDayOf: 8,
      messageDefault: 0,
    }
  },
  expenses: [],
  paidMap: {},
  firedReminders: {},
  chat: {
    roomCode: '',
    mode: '',
    messages: [],
    unread: 0,
    connected: false,
  },
  ui: {
    lastTab: 'home',
    activeUrgentKey: '',
  }
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let state = loadState();
let activeTab = state.ui?.lastTab || 'home';
let expenseMode = 'receipt';
let pendingReceipt = null;
let deferredPrompt = null;
let reminderTimer = null;
let peer = null;
let conn = null;
let directChannel = null;
let currentUrgentItem = null;
let swRegistration = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeState(saved) {
  const next = clone(DEFAULT_STATE);
  if (!saved || typeof saved !== 'object') return next;

  next.prefs = { ...next.prefs, ...(saved.prefs || {}) };
  next.schedules = {
    ...next.schedules,
    ...(saved.schedules || {}),
    weekly: { ...next.schedules.weekly, ...(saved.schedules?.weekly || {}) },
    expenses: { ...next.schedules.expenses, ...(saved.schedules?.expenses || {}) },
    reminderHours: { ...next.schedules.reminderHours, ...(saved.schedules?.reminderHours || {}) },
    milestones: Array.isArray(saved.schedules?.milestones) && saved.schedules.milestones.length
      ? saved.schedules.milestones
      : next.schedules.milestones
  };
  next.expenses = Array.isArray(saved.expenses) ? saved.expenses : [];
  next.paidMap = saved.paidMap || {};
  next.firedReminders = saved.firedReminders || {};
  next.chat = {
    ...next.chat,
    ...(saved.chat || {}),
    messages: Array.isArray(saved.chat?.messages) ? saved.chat.messages : []
  };
  next.ui = { ...next.ui, ...(saved.ui || {}) };
  return next;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? mergeState(JSON.parse(raw)) : clone(DEFAULT_STATE);
    if (!base.prefs.deviceId) {
      base.prefs.deviceId = makeId('dev');
    }
    return base;
  } catch (err) {
    const base = clone(DEFAULT_STATE);
    base.prefs.deviceId = makeId('dev');
    return base;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateAppBadge();
}

function makeId(prefix = 'id') {
  const random = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 11)}`;
  return `${prefix}_${random.slice(0, 18)}`;
}

function localISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function fmtMoney(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount || 0));
}

function fmtDate(iso) {
  if (!iso) return 'Not set';
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateLong(iso) {
  if (!iso) return 'Not set';
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function daysUntil(iso) {
  if (!iso) return null;
  const today = parseISO(localISO());
  const target = parseISO(iso);
  return Math.round((target - today) / 86400000);
}

function dueLabel(iso) {
  const diff = daysUntil(iso);
  if (diff === null) return 'Date not set';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`;
  return `Due in ${diff} day${diff === 1 ? '' : 's'}`;
}

function statusTagClass(item) {
  if (item.paid) return 'good';
  const diff = daysUntil(item.dueDate);
  if (diff === null) return 'blue';
  if (diff <= 0) return 'warn';
  if (diff <= 2) return 'warn';
  return 'blue';
}

function escapeHTML(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function platformType() {
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  if (isIos) return 'ios';
  if (isAndroid) return 'android';
  return 'desktop';
}

function platformInstallText() {
  const platform = platformType();
  if (deferredPrompt) {
    return 'Tap “Install now”. The browser already gave this app permission to prompt.';
  }
  if (platform === 'ios') {
    return 'Open this in Safari, tap Share, then choose “Add to Home Screen”. After that, reopen the installed app and enable alerts.';
  }
  if (platform === 'android') {
    return 'Use the browser menu and tap “Install app” or “Add to Home Screen”. If Chrome has not offered it yet, interact with the page and reopen this helper.';
  }
  return 'Use the install icon in the address bar, or browser menu → “Install app”.';
}

function updateInstallUI() {
  const installed = isStandalone();
  $('installStatusText').textContent = installed ? 'Installed' : 'Pending';
  $('installInstructions').textContent = platformInstallText();
  $('installNowBtn').textContent = deferredPrompt ? 'Install now' : 'Show me how';
  if (installed) {
    $('installOverlay').classList.remove('visible');
    $('installStatusText').textContent = 'Installed';
  }
}

function openInstallOverlay() {
  updateInstallUI();
  $('installOverlay').classList.add('visible');
}

function closeInstallOverlay(sessionOnly = true) {
  $('installOverlay').classList.remove('visible');
  if (sessionOnly) sessionStorage.setItem(SESSION_INSTALL_SKIP, '1');
}

async function attemptInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast('Install accepted.');
      closeInstallOverlay();
    } else {
      toast('Install prompt dismissed.');
    }
    deferredPrompt = null;
    updateInstallUI();
    return;
  }
  // fallback: keep overlay open with instructions
  toast('Use the helper steps on screen.');
}

function showTab(name) {
  activeTab = name;
  state.ui.lastTab = name;
  saveState();

  $$('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${name}`));
  $$('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));

  if (name === 'chat') {
    state.chat.unread = 0;
    saveState();
  }
  renderAll();
}

function paymentKey(kind, ref) {
  return `${kind}|${ref}`;
}

function isPaid(key) {
  return !!state.paidMap[key];
}

function setPaid(item, paid) {
  if (paid) {
    state.paidMap[item.key] = {
      title: item.title,
      amount: item.amount,
      dueDate: item.dueDate,
      kind: item.kind,
      paidAt: new Date().toISOString()
    };
  } else {
    delete state.paidMap[item.key];
  }

  if (item.kind === 'expense-cycle') {
    state.expenses = state.expenses.map(exp => exp.cycleDue === item.dueDate
      ? { ...exp, reimbursed: paid, reimbursedAt: paid ? new Date().toISOString() : '' }
      : exp
    );
  }

  if (state.ui.activeUrgentKey === item.key && paid) {
    hideUrgent();
  }

  saveState();
  renderAll();
  toast(paid ? 'Marked paid.' : 'Marked unpaid.');
}

function getWeeklyItems(weeksAhead = 18) {
  const items = [];
  let due = parseISO(state.schedules.weekly.firstDue);
  if (!due) return items;
  const end = addDays(new Date(), weeksAhead * 7);
  while (due <= end) {
    const dueIso = localISO(due);
    const key = paymentKey('weekly', dueIso);
    items.push({
      key,
      id: dueIso,
      kind: 'weekly',
      title: 'Weekly operating pay',
      amount: Number(state.schedules.weekly.amount || 0),
      dueDate: dueIso,
      reminders: state.schedules.weekly.reminders || [1,0],
      note: 'Repeats weekly after May 8.',
      paid: isPaid(key)
    });
    due = addDays(due, 7);
  }
  return items;
}

function getMilestoneItems() {
  return state.schedules.milestones.map(item => {
    const key = paymentKey('milestone', item.id);
    return {
      key,
      id: item.id,
      kind: item.id === 'prior_3156' ? 'prior' : 'milestone',
      title: item.label,
      amount: Number(item.amount || 0),
      dueDate: item.dueDate,
      reminders: item.reminders || [3,1,0],
      note: item.note || '',
      paid: isPaid(key)
    };
  });
}

function expenseWindowOpensOn() {
  const firstDue = parseISO(state.schedules.expenses.firstSettlementDue);
  const cycleDays = Number(state.schedules.expenses.cycleDays || 14);
  if (!firstDue) return '';
  return localISO(addDays(firstDue, -cycleDays));
}

function cycleForDate(isoDate) {
  if (!isoDate) return null;
  const date = parseISO(isoDate);
  const firstDue = parseISO(state.schedules.expenses.firstSettlementDue);
  const cycleDays = Number(state.schedules.expenses.cycleDays || 14);
  if (!date || !firstDue) return null;

  const firstStart = addDays(firstDue, -cycleDays);
  const firstEnd = addDays(firstDue, -1);

  if (date < firstStart) {
    return {
      dueDate: localISO(firstDue),
      start: localISO(firstStart),
      end: localISO(firstEnd),
      preStart: true
    };
  }

  let due = new Date(firstDue);
  let start = new Date(firstStart);
  let end = new Date(firstEnd);

  while (date > end) {
    due = addDays(due, cycleDays);
    start = addDays(due, -cycleDays);
    end = addDays(due, -1);
  }

  return { dueDate: localISO(due), start: localISO(start), end: localISO(end), preStart: false };
}

function getExpenseCycleItems(cyclesAhead = 8) {
  const items = [];
  let due = parseISO(state.schedules.expenses.firstSettlementDue);
  const cycleDays = Number(state.schedules.expenses.cycleDays || 14);
  if (!due) return items;
  const end = addDays(new Date(), cyclesAhead * cycleDays);

  while (due <= end) {
    const dueIso = localISO(due);
    const startIso = localISO(addDays(due, -cycleDays));
    const endIso = localISO(addDays(due, -1));
    const amount = state.expenses
      .filter(exp => exp.cycleDue === dueIso && !exp.reimbursed)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const key = paymentKey('expense-cycle', dueIso);

    items.push({
      key,
      id: dueIso,
      kind: 'expense-cycle',
      title: 'Biweekly expense settlement',
      amount,
      dueDate: dueIso,
      cycleStart: startIso,
      cycleEnd: endIso,
      reminders: state.schedules.expenses.reminders || [1,0],
      note: `${fmtDate(startIso)} → ${fmtDate(endIso)}`,
      paid: isPaid(key)
    });
    due = addDays(due, cycleDays);
  }
  return items;
}

function getAllItems() {
  return [
    ...getWeeklyItems(),
    ...getMilestoneItems().filter(item => !!item.dueDate),
    ...getExpenseCycleItems()
  ].sort((a, b) => parseISO(a.dueDate) - parseISO(b.dueDate));
}

function upcomingOpenItems(limit = 5) {
  return getAllItems()
    .filter(item => !item.paid)
    .slice()
    .sort((a, b) => parseISO(a.dueDate) - parseISO(b.dueDate))
    .slice(0, limit);
}

function nextWeeklyOpen() {
  return getWeeklyItems().find(item => !item.paid) || null;
}

function nextMajorOpen() {
  return getMilestoneItems()
    .filter(item => !!item.dueDate && !item.paid)
    .sort((a, b) => parseISO(a.dueDate) - parseISO(b.dueDate))[0] || null;
}

function currentExpenseCycleSummary() {
  const todayIso = localISO();
  const current = cycleForDate(todayIso);
  if (!current) return null;
  const entries = state.expenses.filter(exp => exp.cycleDue === current.dueDate && !exp.reimbursed);
  const total = entries.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  return { ...current, entries, total };
}

function nextExpenseCycleOpen() {
  return getExpenseCycleItems().find(item => !item.paid) || null;
}

function historyItems() {
  return Object.entries(state.paidMap)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
}

function renderHome() {
  const weekly = nextWeeklyOpen();
  const major = nextMajorOpen();
  const cycle = currentExpenseCycleSummary();

  $('nextWeeklyCard').innerHTML = weekly ? buildHeroContent(weekly, 'Weekly pay keeps repeating every Friday after the first one lands.') : buildEmptyHero('No weekly due item found.');
  $('nextMajorCard').innerHTML = major ? buildHeroContent(major, major.note || 'Major dues use the stronger reminder pattern.') : buildEmptyHero('No major due date is set yet.');
  $('expenseCycleCard').innerHTML = cycle ? `
    <div class="hero-big">${fmtMoney(cycle.total)}</div>
    <div class="hero-small">${cycle.preStart
      ? `Expense logging opens ${fmtDateLong(cycle.start)}.`
      : `${cycle.entries.length} unreimbursed expense entr${cycle.entries.length === 1 ? 'y' : 'ies'} in the current cycle.`}</div>
    <div class="hero-meta">
      <span class="mini-chip amber">${fmtDate(cycle.start)} → ${fmtDate(cycle.end)}</span>
      <span class="mini-chip warn">${cycle.preStart ? 'Upcoming cycle' : dueLabel(cycle.dueDate)}</span>
      <span class="mini-chip blue">Settlement ${fmtDate(cycle.dueDate)}</span>
    </div>
  ` : buildEmptyHero('No expense cycle is active yet.');

  const upcoming = upcomingOpenItems(5);
  if (!upcoming.length) {
    $('homeUpcoming').innerHTML = `<div class="empty-state">Nothing is currently open.</div>`;
  } else {
    $('homeUpcoming').innerHTML = upcoming.map(item => rowHTML(item, false)).join('');
  }
}

function buildHeroContent(item, copy) {
  return `
    <div class="hero-big">${fmtMoney(item.amount)}</div>
    <div class="hero-small">${copy}</div>
    <div class="hero-meta">
      <span class="mini-chip ${statusTagClass(item)}">${dueLabel(item.dueDate)}</span>
      <span class="mini-chip">${fmtDateLong(item.dueDate)}</span>
      ${item.paid ? `<span class="mini-chip good">Paid</span>` : ''}
    </div>
  `;
}

function buildEmptyHero(text) {
  return `<div class="hero-small">${text}</div>`;
}

function rowHTML(item, includeButton = true) {
  return `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${escapeHTML(item.title)}</div>
        <div class="row-sub">${escapeHTML(item.note || '')}</div>
      </div>
      <div class="row-side">
        <div class="row-amount">${fmtMoney(item.amount)}</div>
        <div class="row-due">${dueLabel(item.dueDate)} · ${fmtDate(item.dueDate)}</div>
        ${includeButton ? `<div class="row-buttons compact">
          <button class="btn ${item.paid ? 'btn-ghost' : 'btn-primary'} pay-toggle-btn" data-pay-key="${item.key}">${item.paid ? 'Undo' : 'Mark paid'}</button>
        </div>` : ''}
      </div>
    </div>
  `;
}

function scheduleItemHTML(item) {
  return `
    <div class="schedule-item">
      <div class="schedule-top">
        <div>
          <div class="schedule-title">${escapeHTML(item.title)}</div>
          <div class="schedule-sub">${escapeHTML(item.note || '')}</div>
        </div>
        <div class="schedule-meta">${fmtMoney(item.amount)}</div>
      </div>
      <div class="schedule-badges">
        <span class="tag ${statusTagClass(item)}">${dueLabel(item.dueDate)}</span>
        <span class="tag">${fmtDateLong(item.dueDate)}</span>
        ${item.paid ? `<span class="tag good">Paid</span>` : ''}
      </div>
      <div class="row-buttons compact">
        <button class="btn ${item.paid ? 'btn-ghost' : 'btn-primary'} pay-toggle-btn" data-pay-key="${item.key}">${item.paid ? 'Undo' : 'Mark paid'}</button>
      </div>
    </div>
  `;
}

function renderDue() {
  const weekly = getWeeklyItems(10);
  const major = getMilestoneItems().filter(item => item.dueDate);
  const cycles = getExpenseCycleItems(6);
  const history = historyItems();

  $('weeklyCountChip').textContent = `${weekly.length} items`;
  $('majorCountChip').textContent = `${major.length} items`;
  $('expenseCountChip').textContent = `${cycles.length} cycles`;
  $('historyCountChip').textContent = `${history.length} items`;

  $('weeklyList').innerHTML = weekly.length ? weekly.map(scheduleItemHTML).join('') : `<div class="empty-state">No weekly payments yet.</div>`;
  $('majorList').innerHTML = major.length ? major.map(scheduleItemHTML).join('') : `<div class="empty-state">Set the major due dates in More.</div>`;
  $('expenseDueList').innerHTML = cycles.length ? cycles.map(scheduleItemHTML).join('') : `<div class="empty-state">No expense settlements yet.</div>`;
  $('historyList').innerHTML = history.length ? history.map(item => `
    <div class="schedule-item">
      <div class="schedule-top">
        <div>
          <div class="schedule-title">${escapeHTML(item.title)}</div>
          <div class="schedule-sub">Paid ${new Date(item.paidAt).toLocaleString()}</div>
        </div>
        <div class="schedule-meta">${fmtMoney(item.amount)}</div>
      </div>
      <div class="schedule-badges">
        <span class="tag good">Settled</span>
        <span class="tag">${fmtDate(item.dueDate)}</span>
      </div>
    </div>
  `).join('') : `<div class="empty-state">Nothing has been marked paid yet.</div>`;
}

function renderExpenses() {
  const cycle = currentExpenseCycleSummary();
  if (cycle) {
    $('currentCycleTotal').textContent = fmtMoney(cycle.total);
    $('currentCycleCopy').textContent = cycle.preStart
      ? `Expense logging opens ${fmtDateLong(cycle.start)}. The first settlement will be due ${fmtDateLong(cycle.dueDate)}.`
      : cycle.entries.length
        ? `${cycle.entries.length} open expense entr${cycle.entries.length === 1 ? 'y' : 'ies'} are currently rolling into this Friday bucket.`
        : 'No unreimbursed expenses are sitting in the active cycle.';
    $('currentCycleWindow').textContent = `${fmtDate(cycle.start)} → ${fmtDate(cycle.end)}`;
    $('currentCycleDue').textContent = `Settlement due ${fmtDateLong(cycle.dueDate)}`;
  } else {
    $('currentCycleTotal').textContent = '$0.00';
    $('currentCycleCopy').textContent = 'No cycle is available yet.';
    $('currentCycleWindow').textContent = 'Window unavailable';
    $('currentCycleDue').textContent = 'Due unavailable';
  }

  $('expenseLogCount').textContent = `${state.expenses.length} entr${state.expenses.length === 1 ? 'y' : 'ies'}`;

  if (!state.expenses.length) {
    $('expenseLog').innerHTML = `<div class="empty-state">No expenses submitted yet.</div>`;
  } else {
    $('expenseLog').innerHTML = state.expenses
      .slice()
      .sort((a, b) => parseISO(b.date) - parseISO(a.date))
      .map(exp => `
        <div class="expense-item">
          <div class="expense-top">
            <div>
              <div class="expense-title">${escapeHTML(exp.description)}</div>
              <div class="expense-meta">
                ${fmtDate(exp.date)} · ${escapeHTML(exp.category)} · ${exp.mode === 'receipt' ? 'Receipt attached' : 'Cash / manual'} · cycle due ${fmtDate(exp.cycleDue)}
              </div>
            </div>
            <div class="schedule-meta">${fmtMoney(exp.amount)}</div>
          </div>
          <div class="schedule-badges">
            <span class="tag ${exp.reimbursed ? 'good' : 'warn'}">${exp.reimbursed ? 'Settled' : 'Open'}</span>
            <span class="tag">${escapeHTML(exp.payMethod)}</span>
            ${exp.receiptName ? `<span class="tag blue">${escapeHTML(exp.receiptName)}</span>` : ''}
          </div>
          <div class="expense-actions">
            ${exp.receiptData ? `<button class="btn btn-ghost preview-receipt-btn" data-expense-id="${exp.id}">View receipt</button>` : ''}
            <button class="btn btn-ghost delete-expense-btn" data-expense-id="${exp.id}">Delete</button>
          </div>
        </div>
      `).join('');
  }

  updateExpenseModeUI();
  updateCycleHint();
}

function renderChat() {
  const room = state.chat.roomCode;
  $('chatUnreadChip').textContent = `${state.chat.unread} unread`;
  $('chatStatusText').textContent = state.chat.connected
    ? `Connected${room ? ` · ${room}` : ''}`
    : room ? `Waiting / reconnecting · ${room}` : 'Not connected';
  $('roomBadge').textContent = room ? room : 'No room';

  const role = state.prefs.role;
  $('roleMoeBtn').classList.toggle('active', role === 'Moe');
  $('rolePartnerBtn').classList.toggle('active', role === 'Partner');
  $('displayNameInput').value = state.prefs.displayName || '';

  if (room) {
    $('shareRoomArea').classList.remove('hidden');
    $('roomCodeDisplay').textContent = room;
  } else {
    $('shareRoomArea').classList.add('hidden');
  }

  $('chatFallback').classList.toggle('hidden', !!window.Peer);

  const messages = state.chat.messages || [];
  if (!messages.length) {
    $('chatThread').innerHTML = '';
  } else {
    $('chatThread').innerHTML = messages.map(msg => `
      <div class="chat-message ${msg.senderId === state.prefs.deviceId ? 'self' : 'other'}">
        <div class="msg-top">
          <div class="msg-name">${escapeHTML(msg.senderName || 'Unknown')}</div>
          <div class="msg-time">${fmtTime(msg.ts)}</div>
        </div>
        <div class="msg-text">${escapeHTML(msg.text)}</div>
      </div>
    `).join('');
    $('chatThread').scrollTop = $('chatThread').scrollHeight;
  }
}

function renderMore() {
  $('soundToggle').checked = !!state.prefs.sound;
  $('vibrationToggle').checked = !!state.prefs.vibration;
  $('setWeeklyStart').value = state.schedules.weekly.start || '';
  $('setWeeklyFirstDue').value = state.schedules.weekly.firstDue || '';
  $('set5kDue').value = state.schedules.milestones.find(m => m.id === 'balance_5k')?.dueDate || '';
  $('set10k1Due').value = state.schedules.milestones.find(m => m.id === 'inventory_10k_1')?.dueDate || '';
  $('set10k2Due').value = state.schedules.milestones.find(m => m.id === 'inventory_10k_2')?.dueDate || '';
  $('setPriorDue').value = state.schedules.milestones.find(m => m.id === 'prior_3156')?.dueDate || '';
  $('setExpenseFirstDue').value = state.schedules.expenses.firstSettlementDue || '';
  $('setExpenseCycleDays').value = state.schedules.expenses.cycleDays || 14;
}

function renderAll() {
  updateInstallUI();
  refreshTopStatus();
  renderHome();
  renderDue();
  renderExpenses();
  renderChat();
  renderMore();
}

function refreshTopStatus() {
  $('alertStatusText').textContent = state.prefs.alertsEnabled && Notification.permission === 'granted' ? 'On' : 'Off';
  $('lineStatusText').textContent = state.chat.connected ? 'Connected' : state.chat.roomCode ? 'Waiting' : 'Idle';

  if (state.chat.unread > 0) {
    $('lineStatusText').textContent = `${state.chat.unread} new`;
  }
}

function updateExpenseModeUI() {
  const receiptMode = expenseMode === 'receipt';
  $('modeReceiptBtn').classList.toggle('active', receiptMode);
  $('modeCashBtn').classList.toggle('active', !receiptMode);
  $('receiptBox').classList.toggle('hidden', !receiptMode);
  $('cashBox').classList.toggle('hidden', receiptMode);
  if (!receiptMode && $('expenseMethod').value === 'personal-card') {
    $('expenseMethod').value = 'cash';
  }
}

function updateCycleHint() {
  const picked = $('expenseDate').value;
  if (!picked) {
    $('cycleHint').textContent = 'Pick a date and the app will place this expense into the correct biweekly settlement cycle automatically.';
    return;
  }
  const opensOn = expenseWindowOpensOn();
  if (opensOn && parseISO(picked) < parseISO(opensOn)) {
    $('cycleHint').textContent = `Expense tracking starts on ${fmtDateLong(opensOn)}. Pick that date or later.`;
    return;
  }
  const cycle = cycleForDate(picked);
  if (!cycle) {
    $('cycleHint').textContent = 'Could not work out the cycle for that date.';
    return;
  }
  $('cycleHint').textContent = `This expense will land in the settlement due ${fmtDateLong(cycle.dueDate)} for the window ${fmtDate(cycle.start)} → ${fmtDate(cycle.end)}.`;
}

function clearExpenseForm() {
  $('expenseAmount').value = '';
  $('expenseDate').value = localISO();
  $('expenseCategory').value = 'fuel';
  $('expenseMethod').value = expenseMode === 'cash' ? 'cash' : 'personal-card';
  $('expenseDescription').value = '';
  $('expenseReceipt').value = '';
  pendingReceipt = null;
  $('receiptPreview').textContent = 'No receipt selected.';
  updateCycleHint();
}

async function fileToPayload(file) {
  const maxBytes = 6 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error('That file is too large. Keep it under 6 MB.');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  return { name: file.name, type: file.type || 'application/octet-stream', dataUrl };
}

async function saveExpenseEntry() {
  const amount = Number($('expenseAmount').value || 0);
  const date = $('expenseDate').value;
  const description = $('expenseDescription').value.trim();
  const category = $('expenseCategory').value;
  const payMethod = $('expenseMethod').value;
  if (!amount || amount <= 0) return toast('Enter a valid amount.');
  if (!date) return toast('Pick the date the expense was paid.');
  if (!description) return toast('Add a short description.');
  if (expenseMode === 'receipt' && !pendingReceipt) return toast('Attach the receipt first, or switch to cash / manual.');
  const opensOn = expenseWindowOpensOn();
  if (opensOn && parseISO(date) < parseISO(opensOn)) {
    return toast(`Expense tracking starts on ${fmtDate(opensOn)}.`);
  }
  const cycle = cycleForDate(date);
  if (!cycle) return toast('Could not assign that expense to a reimbursement cycle.');

  state.expenses.unshift({
    id: makeId('exp'),
    amount,
    date,
    description,
    category,
    payMethod,
    mode: expenseMode,
    receiptName: pendingReceipt?.name || '',
    receiptType: pendingReceipt?.type || '',
    receiptData: pendingReceipt?.dataUrl || '',
    cycleDue: cycle.dueDate,
    reimbursed: false,
    reimbursedAt: '',
    createdAt: new Date().toISOString()
  });
  saveState();
  clearExpenseForm();
  renderAll();
  showTab('expenses');
  toast('Expense saved into the correct cycle.');
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter(exp => exp.id !== id);
  saveState();
  renderAll();
  toast('Expense removed.');
}

function previewReceipt(id) {
  const exp = state.expenses.find(entry => entry.id === id);
  if (!exp || !exp.receiptData) return;
  const win = window.open();
  if (!win) return;
  win.document.write(`<title>${escapeHTML(exp.receiptName || 'Receipt')}</title><iframe src="${exp.receiptData}" style="border:0;width:100vw;height:100vh;"></iframe>`);
  win.document.close();
}

function saveScheduleChanges() {
  state.schedules.weekly.start = $('setWeeklyStart').value || state.schedules.weekly.start;
  state.schedules.weekly.firstDue = $('setWeeklyFirstDue').value || state.schedules.weekly.firstDue;
  const updateMilestone = (id, value) => {
    const target = state.schedules.milestones.find(m => m.id === id);
    if (target) target.dueDate = value;
  };
  updateMilestone('balance_5k', $('set5kDue').value);
  updateMilestone('inventory_10k_1', $('set10k1Due').value);
  updateMilestone('inventory_10k_2', $('set10k2Due').value);
  updateMilestone('prior_3156', $('setPriorDue').value);
  state.schedules.expenses.firstSettlementDue = $('setExpenseFirstDue').value || state.schedules.expenses.firstSettlementDue;
  state.schedules.expenses.cycleDays = Number($('setExpenseCycleDays').value || state.schedules.expenses.cycleDays || 14);
  saveState();
  renderAll();
  toast('Dates updated.');
}

function makeSoftReminder(item, label) {
  showNotification(`${item.title}`, `${label} · ${fmtMoney(item.amount)} · ${fmtDate(item.dueDate)}`, false, item.key);
  toast(`${item.title}: ${label}`);
}

function makeUrgentReminder(item) {
  currentUrgentItem = item;
  state.ui.activeUrgentKey = item.key;
  saveState();
  $('urgentTitle').textContent = item.title;
  $('urgentCopy').textContent = `${fmtMoney(item.amount)} · ${fmtDateLong(item.dueDate)} · ${item.note || 'Due today.'}`;
  $('urgentSheet').classList.remove('hidden');
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 1400);
  playAlarm();
  vibrate([280, 120, 280, 120, 420]);
  showNotification(`${item.title} due today`, `${fmtMoney(item.amount)} · Open the app.`, true, `urgent-${item.key}`);
}

function hideUrgent() {
  currentUrgentItem = null;
  state.ui.activeUrgentKey = '';
  saveState();
  $('urgentSheet').classList.add('hidden');
}

function reminderHour(item, offset) {
  if (item.kind === 'weekly') return offset === 0 ? Number(state.schedules.reminderHours.weeklyDayOf || 8) : Number(state.schedules.reminderHours.weeklyDayBefore || 18);
  if (item.kind === 'expense-cycle') return offset === 0 ? Number(state.schedules.reminderHours.expenseDayOf || 8) : Number(state.schedules.reminderHours.expenseDayBefore || 18);
  if (offset === 3) return Number(state.schedules.reminderHours.milestone3 || 9);
  if (offset === 1) return Number(state.schedules.reminderHours.milestone1 || 18);
  return Number(state.schedules.reminderHours.milestone0 || 8);
}

function reminderLabel(item, offset) {
  if (offset === 0) return 'Due today';
  if (offset === 1) return 'Due tomorrow';
  return `Due in ${offset} days`;
}

function runReminderCheck() {
  const now = new Date();
  const todayIso = localISO(now);
  const hour = now.getHours();
  const items = getAllItems().filter(item => !item.paid && item.dueDate);

  items.forEach(item => {
    const offsets = item.reminders || [];
    offsets.forEach(offset => {
      const triggerDate = addDays(parseISO(item.dueDate), -offset);
      const triggerIso = localISO(triggerDate);
      const fireKey = `${item.key}|${offset}|${triggerIso}`;
      const fireHour = reminderHour(item, offset);

      if (triggerIso !== todayIso) return;
      if (hour < fireHour) return;
      if (state.firedReminders[fireKey]) return;
      if (item.kind === 'expense-cycle' && item.amount <= 0) return;

      state.firedReminders[fireKey] = new Date().toISOString();
      if (offset === 0) {
        makeUrgentReminder(item);
      } else {
        makeSoftReminder(item, reminderLabel(item, offset));
      }
    });
  });

  saveState();
  updateAppBadge();
}

function startReminderLoop() {
  if (reminderTimer) clearInterval(reminderTimer);
  runReminderCheck();
  reminderTimer = setInterval(runReminderCheck, 60000);
}

async function requestAlertPermission() {
  if (!('Notification' in window)) {
    toast('This browser does not support notifications.');
    return;
  }

  if (platformType() === 'ios' && !isStandalone()) {
    openInstallOverlay();
    toast('On iPhone and iPad, install the app first.');
    return;
  }

  if (Notification.permission === 'granted') {
    state.prefs.alertsEnabled = true;
    saveState();
    renderAll();
    toast('Notifications are already enabled.');
    return;
  }

  const result = await Notification.requestPermission();
  if (result === 'granted') {
    state.prefs.alertsEnabled = true;
    saveState();
    renderAll();
    showNotification('BDD Ops alerts enabled', 'Soft reminders and urgent due-day alerts are armed.', false, 'alerts-enabled');
    toast('Alerts enabled.');
  } else {
    state.prefs.alertsEnabled = false;
    saveState();
    renderAll();
    toast('Notification permission was not granted.');
  }
}

async function showNotification(title, body, requireInteraction = false, tag = 'bdd-ops') {
  if (!state.prefs.alertsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if (swRegistration && swRegistration.showNotification) {
      await swRegistration.showNotification(title, {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag,
        requireInteraction,
        data: { url: './index.html' }
      });
    } else {
      new Notification(title, { body, icon: './icons/icon-192.png', tag, requireInteraction });
    }
  } catch (err) {
    // no-op
  }
}

function vibrate(pattern) {
  if (state.prefs.vibration && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function playTone(frequency = 880, duration = 0.12, volume = 0.03, type = 'sine', offset = 0) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!playTone.ctx) playTone.ctx = new Ctx();
  const ctx = playTone.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + offset + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + offset);
  osc.stop(ctx.currentTime + offset + duration + 0.02);
}

function playPing() {
  if (!state.prefs.sound) return;
  try {
    playTone(740, 0.14, 0.03, 'triangle', 0);
    playTone(920, 0.12, 0.025, 'triangle', 0.08);
  } catch (err) {}
}

function playAlarm() {
  if (!state.prefs.sound) return;
  try {
    playTone(220, 0.35, 0.05, 'sawtooth', 0.00);
    playTone(277, 0.35, 0.05, 'sawtooth', 0.23);
    playTone(220, 0.35, 0.05, 'sawtooth', 0.46);
  } catch (err) {}
}

function toast(message) {
  const node = $('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}

function updateAppBadge() {
  const dueToday = getAllItems().filter(item => !item.paid && item.dueDate === localISO()).length;
  const total = dueToday + Number(state.chat.unread || 0);
  try {
    if ('setAppBadge' in navigator) {
      if (total > 0) navigator.setAppBadge(total);
      else navigator.clearAppBadge();
    }
  } catch (err) {}
  document.title = total > 0 ? `(${total}) BDD Ops` : 'BDD Ops · Pay, Expenses & Direct Line';
}

function exportBackup(filename = `bdd-ops-backup-${localISO()}.json`) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function importBackup(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    state = mergeState(parsed);
    if (!state.prefs.deviceId) state.prefs.deviceId = makeId('dev');
    saveState();
    renderAll();
    setupDirectChannel();
    maybeResumeLine();
    toast('Backup imported.');
  } catch (err) {
    toast('Could not import that backup.');
  }
}

function exportCalendarICS() {
  const events = [];
  const weekly = getWeeklyItems(52);
  const major = getMilestoneItems().filter(item => item.dueDate);
  const cycles = getExpenseCycleItems(18);

  weekly.forEach(item => {
    events.push(icsEvent({
      uid: `weekly-${item.dueDate}@bdd-ops`,
      title: 'BDD Weekly Operating Pay',
      description: 'Weekly operating pay due.',
      dateIso: item.dueDate,
      alarms: [1, 0]
    }));
  });

  major.forEach(item => {
    events.push(icsEvent({
      uid: `${item.id}@bdd-ops`,
      title: `BDD — ${item.title}`,
      description: `${item.note || ''} Amount: ${fmtMoney(item.amount)}`,
      dateIso: item.dueDate,
      alarms: item.reminders || [3,1,0]
    }));
  });

  cycles.forEach(item => {
    events.push(icsEvent({
      uid: `expense-${item.dueDate}@bdd-ops`,
      title: 'BDD Expense Settlement',
      description: `Biweekly expense settlement window ${fmtDate(item.cycleStart)} → ${fmtDate(item.cycleEnd)}.`,
      dateIso: item.dueDate,
      alarms: [1, 0]
    }));
  });

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BDD Ops//Reminder Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BDD Ops Reminders',
    'X-WR-TIMEZONE:America/New_York',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `bdd-ops-reminders-${localISO()}.ics`);
  setTimeout(() => URL.revokeObjectURL(url), 1400);
  toast('Calendar backup downloaded.');
}

function toICSDateTime(dateIso, hour = 9, minute = 0) {
  const date = parseISO(dateIso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}00`;
}

function escapeICSText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function icsEvent({ uid, title, description, dateIso, alarms }) {
  const start = toICSDateTime(dateIso, 9, 0);
  const end = toICSDateTime(dateIso, 9, 15);
  const created = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const alarmBlocks = (alarms || []).map(offset => {
    const trigger = offset === 0 ? '-PT15M' : `-P${offset}D`;
    const label = offset === 0 ? 'Reminder due this morning.' : `Reminder ${offset} day${offset === 1 ? '' : 's'} before.`;
    return [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICSText(label)}`,
      `TRIGGER:${trigger}`,
      'END:VALARM'
    ].join('\r\n');
  }).join('\r\n');

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${created}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICSText(title)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    alarmBlocks,
    'END:VEVENT'
  ].join('\r\n');
}

function copyInviteLink() {
  if (!state.chat.roomCode) return;
  const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(state.chat.roomCode)}`;
  navigator.clipboard.writeText(url).then(() => toast('Invite link copied.'));
}

function setRole(role) {
  state.prefs.role = role;
  if (!state.prefs.displayName) state.prefs.displayName = role;
  saveState();
  renderChat();
}

function ensureDisplayName() {
  const entered = $('displayNameInput').value.trim();
  if (entered) state.prefs.displayName = entered;
  else if (state.prefs.role) state.prefs.displayName = state.prefs.role;
  saveState();
  return !!state.prefs.displayName;
}

function setupDirectChannel() {
  try {
    if (directChannel) directChannel.close();
  } catch (err) {}
  if ('BroadcastChannel' in window) {
    directChannel = new BroadcastChannel('bdd-ops-direct-line');
    directChannel.onmessage = (event) => {
      const payload = event.data || {};
      if (payload.type !== 'chat') return;
      if (payload.roomCode !== state.chat.roomCode) return;
      if (payload.msg?.senderId === state.prefs.deviceId) return;
      receiveChatMessage(payload.msg, false);
    };
  }
}

function disconnectLine(destroyPeer = true) {
  if (conn) {
    try { conn.close(); } catch (err) {}
  }
  conn = null;
  if (peer && destroyPeer) {
    try { peer.destroy(); } catch (err) {}
  }
  peer = null;
  state.chat.connected = false;
  saveState();
  renderChat();
}

function createLine() {
  if (!ensureDisplayName()) {
    toast('Set the display name first.');
    return;
  }
  const roomCode = makeRoomCode();
  if (state.chat.roomCode !== roomCode) {
    state.chat.messages = [];
    state.chat.unread = 0;
  }
  state.chat.roomCode = roomCode;
  state.chat.mode = 'host';
  saveState();
  initPeerHost(roomCode);
}

function joinLine() {
  if (!ensureDisplayName()) {
    toast('Set the display name first.');
    return;
  }
  const roomCode = ($('roomCodeInput').value || '').trim().toUpperCase();
  if (!roomCode || roomCode.length < 4) {
    toast('Enter a valid room code.');
    return;
  }
  if (state.chat.roomCode !== roomCode) {
    state.chat.messages = [];
    state.chat.unread = 0;
  }
  state.chat.roomCode = roomCode;
  state.chat.mode = 'join';
  saveState();
  initPeerJoin(roomCode);
}

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function initPeerHost(roomCode) {
  disconnectLine();
  renderChat();
  if (!window.Peer) {
    toast('Live direct line loads in the hosted version.');
    return;
  }

  try {
    peer = new window.Peer(`bdd-room-${roomCode.toLowerCase()}`);
    peer.on('open', () => {
      state.chat.connected = false;
      saveState();
      renderChat();
      toast('Line created. Waiting for the other side.');
    });
    peer.on('connection', (connection) => {
      attachConnection(connection);
    });
    peer.on('error', (err) => {
      console.warn(err);
      if (String(err?.type || '').includes('unavailable')) {
        toast('That room code is already in use. Create another.');
      } else {
        toast('Direct line hit a connection error.');
      }
      state.chat.connected = false;
      renderChat();
    });
    peer.on('disconnected', () => {
      state.chat.connected = false;
      renderChat();
    });
    peer.on('close', () => {
      state.chat.connected = false;
      renderChat();
    });
  } catch (err) {
    toast('Could not start the direct line.');
  }
}

function initPeerJoin(roomCode) {
  disconnectLine();
  renderChat();
  if (!window.Peer) {
    toast('Live direct line loads in the hosted version.');
    return;
  }

  try {
    peer = new window.Peer();
    peer.on('open', () => {
      const targetId = `bdd-room-${roomCode.toLowerCase()}`;
      const connection = peer.connect(targetId, { reliable: true, serialization: 'json' });
      attachConnection(connection);
    });
    peer.on('error', (err) => {
      console.warn(err);
      toast('Could not connect to that room.');
      state.chat.connected = false;
      renderChat();
    });
    peer.on('close', () => {
      state.chat.connected = false;
      renderChat();
    });
  } catch (err) {
    toast('Could not join that line.');
  }
}

function attachConnection(connection) {
  conn = connection;
  conn.on('open', () => {
    state.chat.connected = true;
    saveState();
    renderChat();
    toast('Direct line connected.');
  });
  conn.on('data', (payload) => {
    if (payload?.type === 'chat' && payload.msg) {
      receiveChatMessage(payload.msg, true);
    }
  });
  conn.on('close', () => {
    state.chat.connected = false;
    saveState();
    renderChat();
    toast('Direct line disconnected.');
  });
  conn.on('error', () => {
    state.chat.connected = false;
    renderChat();
    toast('Direct line error.');
  });
}

function maybeResumeLine() {
  const roomParam = new URLSearchParams(location.search).get('room');
  if (roomParam && !$('roomCodeInput').value) {
    $('roomCodeInput').value = roomParam.toUpperCase();
  }

  if (!state.chat.roomCode || !window.Peer) {
    renderChat();
    return;
  }

  if (state.chat.mode === 'host') {
    initPeerHost(state.chat.roomCode);
  } else if (state.chat.mode === 'join') {
    initPeerJoin(state.chat.roomCode);
  } else {
    renderChat();
  }
}

function sendMessage() {
  if (!ensureDisplayName()) {
    toast('Set the display name first.');
    return;
  }
  if (!state.chat.roomCode) {
    toast('Create or join a line first.');
    return;
  }
  const text = $('chatMessageInput').value.trim();
  if (!text) return;
  const msg = {
    id: makeId('msg'),
    roomCode: state.chat.roomCode,
    senderId: state.prefs.deviceId,
    senderName: state.prefs.displayName || state.prefs.role || 'User',
    text,
    ts: new Date().toISOString()
  };
  receiveChatMessage(msg, false);
  if (conn && conn.open) {
    conn.send({ type: 'chat', msg });
  }
  if (directChannel) {
    directChannel.postMessage({ type: 'chat', roomCode: state.chat.roomCode, msg });
  }
  $('chatMessageInput').value = '';
  renderChat();
}

function receiveChatMessage(msg, incoming = false) {
  if (!msg || !msg.id) return;
  if (state.chat.messages.some(existing => existing.id === msg.id)) return;
  state.chat.messages.push(msg);
  state.chat.messages = state.chat.messages.slice(-200);

  if (msg.senderId !== state.prefs.deviceId) {
    if (activeTab !== 'chat') {
      state.chat.unread = Number(state.chat.unread || 0) + 1;
    }
    playPing();
    vibrate([90, 60, 90]);
    showNotification(`Direct line · ${msg.senderName || 'Message'}`, msg.text, false, `chat-${msg.id}`);
  }
  saveState();
  renderChat();
}

function clearChat() {
  state.chat.messages = [];
  state.chat.unread = 0;
  saveState();
  renderChat();
  toast('Local thread cleared.');
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch (err) {
    console.warn('SW registration failed', err);
  }
}

function updateInstallBannerOnLoad() {
  if (isStandalone()) {
    closeInstallOverlay(false);
    return;
  }
  if (sessionStorage.getItem(SESSION_INSTALL_SKIP) === '1') {
    updateInstallUI();
    return;
  }
  openInstallOverlay();
}

function bindEvents() {
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  $('installContinueBtn').addEventListener('click', () => closeInstallOverlay(true));
  $('installNowBtn').addEventListener('click', attemptInstall);
  $('installReopenBtn').addEventListener('click', openInstallOverlay);
  $('installAgainBtn').addEventListener('click', openInstallOverlay);
  $('alertsBtn').addEventListener('click', requestAlertPermission);
  $('requestAlertsBtn').addEventListener('click', requestAlertPermission);
  $('calendarQuickBtn').addEventListener('click', exportCalendarICS);
  $('downloadCalendarBtn').addEventListener('click', exportCalendarICS);
  $('chatJumpBtn').addEventListener('click', () => showTab('chat'));

  $('modeReceiptBtn').addEventListener('click', () => {
    expenseMode = 'receipt';
    updateExpenseModeUI();
  });
  $('modeCashBtn').addEventListener('click', () => {
    expenseMode = 'cash';
    updateExpenseModeUI();
  });

  $('expenseDate').addEventListener('input', updateCycleHint);
  $('clearExpenseBtn').addEventListener('click', clearExpenseForm);
  $('saveExpenseBtn').addEventListener('click', saveExpenseEntry);
  $('expenseReceipt').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      pendingReceipt = null;
      $('receiptPreview').textContent = 'No receipt selected.';
      return;
    }
    try {
      pendingReceipt = await fileToPayload(file);
      $('receiptPreview').textContent = `${pendingReceipt.name}`;
    } catch (err) {
      pendingReceipt = null;
      $('expenseReceipt').value = '';
      $('receiptPreview').textContent = 'No receipt selected.';
      toast(err.message || 'Could not read that file.');
    }
  });

  $('roleMoeBtn').addEventListener('click', () => setRole('Moe'));
  $('rolePartnerBtn').addEventListener('click', () => setRole('Partner'));
  $('displayNameInput').addEventListener('change', () => {
    state.prefs.displayName = $('displayNameInput').value.trim();
    saveState();
  });
  $('createLineBtn').addEventListener('click', createLine);
  $('joinLineBtn').addEventListener('click', joinLine);
  $('copyRoomBtn').addEventListener('click', copyInviteLink);
  $('disconnectBtn').addEventListener('click', () => {
    disconnectLine();
    state.chat.roomCode = '';
    state.chat.mode = '';
    saveState();
    renderChat();
  });
  $('sendMessageBtn').addEventListener('click', sendMessage);
  $('chatMessageInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  $('clearChatBtn').addEventListener('click', clearChat);

  $('soundToggle').addEventListener('change', (event) => {
    state.prefs.sound = event.target.checked;
    saveState();
  });
  $('vibrationToggle').addEventListener('change', (event) => {
    state.prefs.vibration = event.target.checked;
    saveState();
  });

  $('testSoftBtn').addEventListener('click', () => {
    showNotification('BDD Ops test', 'This is the standard reminder style.', false, 'soft-test');
    toast('Soft reminder test sent.');
  });

  $('testUrgentBtn').addEventListener('click', () => {
    currentUrgentItem = {
      key: 'test-urgent',
      title: 'Urgent reminder test',
      amount: 0,
      dueDate: localISO(),
      note: 'This is the bigger alarm path.'
    };
    $('urgentTitle').textContent = currentUrgentItem.title;
    $('urgentCopy').textContent = currentUrgentItem.note;
    $('urgentSheet').classList.remove('hidden');
    playAlarm();
    vibrate([280,120,280]);
  });

  $('urgentCloseBtn').addEventListener('click', hideUrgent);
  $('urgentMarkPaidBtn').addEventListener('click', () => {
    if (currentUrgentItem && currentUrgentItem.key !== 'test-urgent') {
      setPaid(currentUrgentItem, true);
    }
    hideUrgent();
  });

  $('saveScheduleBtn').addEventListener('click', saveScheduleChanges);
  $('exportBackupBtn').addEventListener('click', () => {
    exportBackup();
    toast('Backup exported.');
  });
  $('importBackupBtn').addEventListener('click', () => $('importBackupFile').click());
  $('importBackupFile').addEventListener('change', (event) => importBackup(event.target.files?.[0]));

  document.body.addEventListener('click', (event) => {
    const payBtn = event.target.closest('.pay-toggle-btn');
    if (payBtn) {
      const key = payBtn.dataset.payKey;
      const item = getAllItems().find(entry => entry.key === key);
      if (item) setPaid(item, !item.paid);
      return;
    }

    const deleteBtn = event.target.closest('.delete-expense-btn');
    if (deleteBtn) {
      deleteExpense(deleteBtn.dataset.expenseId);
      return;
    }

    const previewBtn = event.target.closest('.preview-receipt-btn');
    if (previewBtn) {
      previewReceipt(previewBtn.dataset.expenseId);
    }
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallUI();
    if (!isStandalone()) openInstallOverlay();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    closeInstallOverlay(false);
    updateInstallUI();
    toast('App installed.');
  });

  window.addEventListener('hashchange', applyHashTab);
}

function applyHashTab() {
  const hash = (location.hash || '').replace('#', '').trim();
  if (!hash) return;
  const candidate = ['home','due','expenses','chat','more'].includes(hash) ? hash : '';
  if (candidate) showTab(candidate);
}

function init() {
  bindEvents();
  setupDirectChannel();
  registerSW();
  clearExpenseForm();
  updateInstallUI();
  updateCycleHint();
  renderAll();
  showTab(activeTab);
  maybeResumeLine();
  applyHashTab();
  updateInstallBannerOnLoad();
  startReminderLoop();
}

document.addEventListener('DOMContentLoaded', init);
