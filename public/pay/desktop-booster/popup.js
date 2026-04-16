
function parseISO(iso){ if(!iso) return null; const [y,m,d]=iso.split('-').map(Number); return new Date(y,(m||1)-1,d||1,0,0,0,0); }
function addDays(date, days){ const n=new Date(date); n.setDate(n.getDate()+days); return n; }
function localISO(date=new Date()){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function money(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0)); }
function label(iso){ if(!iso) return 'Date not set'; const diff=Math.round((parseISO(iso)-parseISO(localISO()))/86400000); if(diff===0)return 'Due today'; if(diff===1)return 'Due tomorrow'; if(diff<0)return `${Math.abs(diff)} day(s) overdue`; return `Due in ${diff} day(s)`; }
function paymentKey(kind, ref){ return `${kind}|${ref}`; }
function weeklyItems(state, weeksAhead=8){ const out=[]; let due=parseISO(state.schedules.weekly.firstDue); if(!due)return out; const end=addDays(new Date(),weeksAhead*7); while(due<=end){ const dueIso=localISO(due); out.push({key:paymentKey('weekly',dueIso), title:'Weekly operating pay', amount:Number(state.schedules.weekly.amount||0), dueDate:dueIso, paid:!!state.paidMap[paymentKey('weekly',dueIso)]}); due=addDays(due,7);} return out; }
function majorItems(state){ return (state.schedules.milestones||[]).filter(x=>x.dueDate).map(x=>({key:paymentKey('milestone',x.id), title:x.label, amount:Number(x.amount||0), dueDate:x.dueDate, paid:!!state.paidMap[paymentKey('milestone',x.id)]})); }
function expenseItems(state, cyclesAhead=6){ const out=[]; let due=parseISO(state.schedules.expenses.firstSettlementDue); const cycleDays=Number(state.schedules.expenses.cycleDays||14); if(!due)return out; const end=addDays(new Date(), cyclesAhead*cycleDays); while(due<=end){ const dueIso=localISO(due); const amt=(state.expenses||[]).filter(e=>e.cycleDue===dueIso && !e.reimbursed).reduce((s,e)=>s+Number(e.amount||0),0); out.push({key:paymentKey('expense-cycle',dueIso), title:'Biweekly expense settlement', amount:amt, dueDate:dueIso, paid:!!state.paidMap[paymentKey('expense-cycle',dueIso)]}); due=addDays(due,cycleDays);} return out; }

chrome.runtime.sendMessage({type:'get-state'}, (res)=>{
  const state = res?.state;
  if(!state){
    document.getElementById('list').innerHTML = `<div class="empty">No imported state yet. Open options and import the app backup first.</div>`;
    return;
  }
  const items = [...weeklyItems(state), ...majorItems(state), ...expenseItems(state)]
    .filter(item => !item.paid && item.dueDate && !(item.title === 'Biweekly expense settlement' && item.amount <= 0))
    .sort((a,b)=>parseISO(a.dueDate)-parseISO(b.dueDate))
    .slice(0,5);
  if(!items.length){
    document.getElementById('list').innerHTML = `<div class="empty">Nothing open right now.</div>`;
    return;
  }
  document.getElementById('list').innerHTML = items.map(item=>`
    <div class="row">
      <div>
        <div class="title">${item.title}</div>
        <div class="subline">${label(item.dueDate)} · ${new Date(item.dueDate+'T12:00:00').toLocaleDateString()}</div>
      </div>
      <div class="amount">${money(item.amount)}</div>
    </div>
  `).join('');
});

document.getElementById('openOptionsBtn').addEventListener('click', ()=>{
  chrome.runtime.openOptionsPage();
});
document.getElementById('openAppBtn').addEventListener('click', ()=>{
  chrome.runtime.sendMessage({type:'get-state'}, (res)=>{
    const url = res?.state?.appUrl || '';
    if(url) chrome.tabs.create({ url });
  });
});
