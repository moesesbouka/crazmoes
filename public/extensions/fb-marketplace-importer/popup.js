// Load stats
chrome.storage.local.get(['lastImport', 'totalImported'], (result) => {
  const lastImportEl = document.getElementById('last-import');
  const totalSavedEl = document.getElementById('total-saved');
  
  if (result.lastImport) {
    const date = new Date(result.lastImport.date);
    const today = new Date();
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      lastImportEl.textContent = 'Today';
    } else if (diffDays === 1) {
      lastImportEl.textContent = 'Yesterday';
    } else {
      lastImportEl.textContent = `${diffDays}d ago`;
    }
  }
  
  totalSavedEl.textContent = result.totalImported || 0;
});

// Go to listings button
document.getElementById('go-to-listings').addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://www.facebook.com/marketplace/you/selling'
  });
});
