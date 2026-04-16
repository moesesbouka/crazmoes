
let importedPayload = null;
document.getElementById('importFile').addEventListener('change', async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  try {
    importedPayload = JSON.parse(await file.text());
    document.getElementById('status').textContent = `Loaded backup with ${Object.keys(importedPayload.paidMap||{}).length} paid markers and ${(importedPayload.expenses||[]).length} expense entries.`;
  } catch (err) {
    importedPayload = null;
    document.getElementById('status').textContent = 'That file could not be read.';
  }
});
document.getElementById('saveUrlBtn').addEventListener('click', ()=>{
  const url = document.getElementById('appUrl').value.trim();
  chrome.runtime.sendMessage({type:'set-app-url', url}, ()=>{
    document.getElementById('status').textContent = 'App URL saved.';
  });
});
document.getElementById('importBtn').addEventListener('click', ()=>{
  if(!importedPayload){
    document.getElementById('status').textContent = 'Pick the backup file first.';
    return;
  }
  chrome.runtime.sendMessage({type:'import-state', payload: importedPayload}, ()=>{
    document.getElementById('status').textContent = 'Backup imported. The extension will now watch the dates.';
  });
});
document.getElementById('testBtn').addEventListener('click', ()=>{
  chrome.notifications.create('bdd-test', {
    type:'basic',
    iconUrl:'icon-192.png',
    title:'BDD Desktop Booster',
    message:'Heartbeat test — notifications are working.'
  });
});
chrome.runtime.sendMessage({type:'get-state'}, (res)=>{
  const state = res?.state;
  if(state?.appUrl) document.getElementById('appUrl').value = state.appUrl;
});
