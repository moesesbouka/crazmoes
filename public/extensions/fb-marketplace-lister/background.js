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
    return true;
  }
  
  if (request.action === 'clearStoredData') {
    chrome.storage.local.remove('pendingListing', () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle image fetching to bypass CORS
  if (request.action === 'fetchImage') {
    fetchImageAsDataUrl(request.url)
      .then(dataUrl => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch(error => {
        console.error('Error fetching image:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Fetch image and convert to data URL
async function fetchImageAsDataUrl(url) {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch image: ' + response.status);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('fetchImageAsDataUrl error:', error);
    throw error;
  }
}
