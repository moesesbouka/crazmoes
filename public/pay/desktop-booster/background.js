
const STORAGE_KEY = 'bdd_booster_state_v1';
const DEFAULT_STATE = {
  schedules: {
    weekly: { amount: 1250, firstDue: '2026-05-08', reminders: [1, 0] },
    milestones: [
      { id: 'balance_5k', label: 'Second $5K activation balance', amount: 5000, dueDate: '2026-04-20', reminders: [3,1,0] },
      { id: 'inventory_10k_1', label: 'First $10K inventory installment', amount: 10000, dueDate: '2026-05-20', reminders: [3,1,0] },
      { id: 'inventory_10k_2', label: 'Second $10K inventory installment', amount: 10000, dueDate: '2026-06-20', reminders: [3,1,0] },
      { id: 'prior_3156', label: 'Prior reimbursement', amount: 3156.59, dueDate: '', reminders: [3,1,0] }
    ],
    expenses: { firstSettlementDue: '2026-05-01', cycleDays: 14, reminders: [1,0] },
    reminderHours: {
      weeklyDayBefore: 18,
      weeklyDayOf: 8,
      milestone3: 9,
      milestone1: 18,
      milestone0: 8,
      expenseDayBefore: 18,
      expenseDayOf: 8,
    }
  },
  expenses: [],
  paidMap: {},
  firedReminders: {},
  appUrl: ''
};

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
function dueLabel(iso) {
  if (!iso) return 'Date not set';
  const today = parseISO(localISO());
  const diff = Math.round((parseISO(iso) - today) / 86400000);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff < 0) return `${Math.abs(diff)} day(s) overdue`;
  return `Due in ${diff} day(s)`;
}
function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n || 0));
}
async function loadState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_STATE, ...(result[STORAGE_KEY] || {}) };
}
async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}
function paymentKey(kind, ref) {
  return `${kind}|${ref}`;
}
function getWeeklyItems(state, weeksAhead = 18) {
  const items = [];
  let due = parseISO(state.schedules.weekly.firstDue);
  if (!due) return items;
  const end = addDays(new Date(), weeksAhead * 7);
  while (due <= end) {
    const dueIso = localISO(due);
    const key = paymentKey('weekly', dueIso);
    items.push({
      key,
      kind: 'weekly',
      title: 'Weekly operating pay',
      amount: Number(state.schedules.weekly.amount || 0),
      dueDate: dueIso,
      reminders: state.schedules.weekly.reminders || [1,0],
      paid: !!state.paidMap[key]
    });
    due = addDays(due, 7);
  }
  return items;
}
function getMilestones(state) {
  return (state.schedules.milestones || []).filter(item => !!item.dueDate).map(item => {
    const key = paymentKey('milestone', item.id);
    return {
      key,
      kind: 'milestone',
      title: item.label,
      amount: Number(item.amount || 0),
      dueDate: item.dueDate,
      reminders: item.reminders || [3,1,0],
      paid: !!state.paidMap[key]
    };
  });
}
function cycleItems(state, cyclesAhead = 8) {
  const items = [];
  let due = parseISO(state.schedules.expenses.firstSettlementDue);
  const cycleDays = Number(state.schedules.expenses.cycleDays || 14);
  if (!due) return items;
  const end = addDays(new Date(), cyclesAhead * cycleDays);
  while (due <= end) {
    const dueIso = localISO(due);
    const amount = (state.expenses || [])
      .filter(exp => exp.cycleDue === dueIso && !exp.reimbursed)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const key = paymentKey('expense-cycle', dueIso);
    items.push({
      key,
      kind: 'expense-cycle',
      title: 'Biweekly expense settlement',
      amount,
      dueDate: dueIso,
      reminders: state.schedules.expenses.reminders || [1,0],
      paid: !!state.paidMap[key]
    });
    due = addDays(due, cycleDays);
  }
  return items;
}
function reminderHour(state, item, offset) {
  const h = state.schedules.reminderHours || {};
  if (item.kind === 'weekly') return offset === 0 ? Number(h.weeklyDayOf || 8) : Number(h.weeklyDayBefore || 18);
  if (item.kind === 'expense-cycle') return offset === 0 ? Number(h.expenseDayOf || 8) : Number(h.expenseDayBefore || 18);
  if (offset === 3) return Number(h.milestone3 || 9);
  if (offset === 1) return Number(h.milestone1 || 18);
  return Number(h.milestone0 || 8);
}
async function setBadge(count) {
  try {
    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: '#17a760' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {}
}
async function notify(title, message, id) {
  try {
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icon-192.png',
      title,
      message,
      priority: 2
    });
  } catch (err) {}
}
async function heartbeat() {
  const state = await loadState();
  const now = new Date();
  const todayIso = localISO(now);
  const hour = now.getHours();
  const items = [
    ...getWeeklyItems(state),
    ...getMilestones(state),
    ...cycleItems(state)
  ].filter(item => !item.paid && item.dueDate && !(item.kind === 'expense-cycle' && item.amount <= 0));

  let dueToday = 0;
  for (const item of items) {
    if (item.dueDate === todayIso) dueToday++;
    for (const offset of item.reminders || []) {
      const triggerIso = localISO(addDays(parseISO(item.dueDate), -offset));
      if (triggerIso !== todayIso) continue;
      const whenHour = reminderHour(state, item, offset);
      if (hour < whenHour) continue;
      const fireKey = `${item.key}|${offset}|${triggerIso}`;
      if (state.firedReminders[fireKey]) continue;
      state.firedReminders[fireKey] = new Date().toISOString();
      const label = offset === 0 ? 'Due today' : offset === 1 ? 'Due tomorrow' : `Due in ${offset} days`;
      await notify(item.title, `${label} · ${money(item.amount)} · ${dueLabel(item.dueDate)}`, fireKey);
    }
  }
  await saveState(state);
  await setBadge(dueToday);
}
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create('bdd-heartbeat', { periodInMinutes: 15 });
  await heartbeat();
});
chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create('bdd-heartbeat', { periodInMinutes: 15 });
  await heartbeat();
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'bdd-heartbeat') heartbeat();
});
chrome.notifications.onClicked.addListener(async () => {
  const state = await loadState();
  if (state.appUrl) chrome.tabs.create({ url: state.appUrl });
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === 'get-state') {
      const state = await loadState();
      sendResponse({ ok: true, state });
      return;
    }
    if (message?.type === 'import-state') {
      const next = { ...DEFAULT_STATE, ...(message.payload || {}) };
      await saveState(next);
      await heartbeat();
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'set-app-url') {
      const state = await loadState();
      state.appUrl = message.url || '';
      await saveState(state);
      sendResponse({ ok: true });
      return;
    }
  })();
  return true;
});
