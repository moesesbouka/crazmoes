// Show extension version (helps confirm the update actually loaded)
try {
  const versionEl = document.getElementById('ext-version');
  if (versionEl) versionEl.textContent = chrome.runtime.getManifest().version;
} catch (e) {
  // ignore
}

// Check for pending listing data
chrome.storage.local.get('pendingListing', (result) => {
  const statusEl = document.getElementById('status');

  if (result.pendingListing) {
    const title = result.pendingListing.title;
    statusEl.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
    statusEl.className = 'status-value ready';
  } else {
    statusEl.textContent = 'No data copied';
    statusEl.className = 'status-value no-data';
  }
});
