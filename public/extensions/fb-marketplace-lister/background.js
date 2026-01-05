// FB Marketplace Lister - Background Service Worker

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('FB Marketplace Lister installed!');
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openMarketplace') {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getStoredData') {
    chrome.storage.local.get('pendingListing', (result) => {
      sendResponse(result.pendingListing || null);
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'clearStoredData') {
    chrome.storage.local.remove('pendingListing', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});