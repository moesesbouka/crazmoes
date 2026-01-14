// FB Marketplace Importer - Popup Script v1.2.7
// First-time setup modal + themed UI
(function() {
  const accountSelect = document.getElementById('account-select');
  const accountBadge = document.getElementById('account-badge');
  const btnIndicator = document.getElementById('btn-account-indicator');
  const actionBtn = document.getElementById('go-to-listings');
  const headerIcon = document.getElementById('header-icon');
  const switchModal = document.getElementById('switch-modal');
  const modalAccountName = document.getElementById('modal-account-name');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');
  const setupModal = document.getElementById('setup-modal');
  const setupMbfb = document.getElementById('setup-mbfb');
  const setupCmfb = document.getElementById('setup-cmfb');
  
  let pendingAccount = null;
  let currentAccount = 'MBFB';
  
  // Check if first-time setup is needed
  chrome.storage.local.get(['accountConfigured', 'selectedAccount', 'lastImport', 'totalImported'], (result) => {
    const lastImportEl = document.getElementById('last-import');
    const totalSavedEl = document.getElementById('total-saved');
    
    // First-time setup check
    if (!result.accountConfigured) {
      setupModal.classList.add('show');
      return; // Don't load rest until account is selected
    }
    
    // Set account
    currentAccount = result.selectedAccount || 'MBFB';
    accountSelect.value = currentAccount;
    updateAccountUI(currentAccount);
    
    // Set stats
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
  
  function updateAccountUI(account) {
    const isMBFB = account === 'MBFB';
    
    // Update badge
    accountBadge.className = `account-badge ${isMBFB ? 'mbfb' : 'cmfb'}`;
    accountBadge.innerHTML = `<span>●</span> Currently: ${account}`;
    
    // Update button indicator and style
    btnIndicator.textContent = `Importing to: ${account}`;
    actionBtn.className = `action-btn ${isMBFB ? 'mbfb' : 'cmfb'}`;
    
    // Update header icon
    headerIcon.className = `header-icon ${isMBFB ? 'mbfb' : 'cmfb'}`;
    
    // Update body theme
    document.body.className = isMBFB ? 'mbfb-theme' : 'cmfb-theme';
  }
  
  function completeSetup(account) {
    currentAccount = account;
    accountSelect.value = currentAccount;
    updateAccountUI(currentAccount);
    
    // Save selection and mark as configured
    chrome.storage.local.set({ 
      selectedAccount: currentAccount,
      accountConfigured: true 
    });
    
    // Hide setup modal
    setupModal.classList.remove('show');
    
    console.log(`FB Importer: First-time setup complete. Account: ${currentAccount}`);
  }
  
  // First-time setup button handlers
  setupMbfb.addEventListener('click', () => completeSetup('MBFB'));
  setupCmfb.addEventListener('click', () => completeSetup('CMFB'));
  
  // Account selection with confirmation
  accountSelect.addEventListener('change', (e) => {
    const newAccount = e.target.value;
    
    if (newAccount !== currentAccount) {
      // Show confirmation modal
      pendingAccount = newAccount;
      modalAccountName.textContent = newAccount;
      switchModal.classList.add('show');
      
      // Reset select to current until confirmed
      accountSelect.value = currentAccount;
    }
  });
  
  // Modal cancel
  modalCancel.addEventListener('click', () => {
    switchModal.classList.remove('show');
    pendingAccount = null;
  });
  
  // Modal confirm
  modalConfirm.addEventListener('click', () => {
    if (pendingAccount) {
      currentAccount = pendingAccount;
      accountSelect.value = currentAccount;
      updateAccountUI(currentAccount);
      
      // Save selection
      chrome.storage.local.set({ selectedAccount: currentAccount });
      
      console.log(`FB Importer: Account switched to ${currentAccount}`);
    }
    switchModal.classList.remove('show');
    pendingAccount = null;
  });
  
  // Click outside modal to close
  switchModal.addEventListener('click', (e) => {
    if (e.target === switchModal) {
      switchModal.classList.remove('show');
      pendingAccount = null;
    }
  });
  
  // Go to listings button
  document.getElementById('go-to-listings').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://www.facebook.com/marketplace/you/selling'
    });
  });
})();
