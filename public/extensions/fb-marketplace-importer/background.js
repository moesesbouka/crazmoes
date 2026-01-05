// FB Marketplace Importer - Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('FB Marketplace Importer installed!');
    chrome.storage.local.set({
      lastImport: null,
      totalImported: 0
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.storage.local.get(['lastImport', 'totalImported'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'updateStats') {
    chrome.storage.local.get(['totalImported'], (result) => {
      const newTotal = (result.totalImported || 0) + request.count;
      chrome.storage.local.set({ 
        totalImported: newTotal,
        lastImport: {
          count: request.count,
          date: new Date().toISOString()
        }
      }, () => {
        sendResponse({ success: true, total: newTotal });
      });
    });
    return true;
  }
});
