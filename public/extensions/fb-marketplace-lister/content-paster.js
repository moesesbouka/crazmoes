// FB Marketplace Lister - Content Script for Facebook Marketplace Create Page
(function() {
  'use strict';

  let pendingListing = null;

  // Create paste button
  function createPasteButton() {
    if (document.querySelector('#fb-lister-paste-btn')) return;

    const button = document.createElement('button');
    button.id = 'fb-lister-paste-btn';
    button.innerHTML = 'Paste Data';
    button.className = 'fb-lister-paste-btn';
    
    button.addEventListener('click', handlePaste);
    document.body.appendChild(button);

    // Check for pending data
    checkForPendingData();
  }

  // Check for pending listing data
  async function checkForPendingData() {
    try {
      const result = await chrome.storage.local.get('pendingListing');
      if (result.pendingListing) {
        pendingListing = result.pendingListing;
        const button = document.querySelector('#fb-lister-paste-btn');
        if (button) {
          button.classList.add('has-data');
          button.innerHTML = `Paste Data (${pendingListing.title.substring(0, 20)}...)`;
        }
      }
    } catch (error) {
      console.error('Error checking pending data:', error);
    }
  }

  // Simulate typing into an input
  function simulateInput(element, value) {
    if (!element || !value) return;
    
    element.focus();
    element.value = value;
    
    // Dispatch events to trigger React state updates
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }

  // Find input by aria-label or placeholder
  function findInput(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  // Handle paste button click
  async function handlePaste() {
    const button = document.querySelector('#fb-lister-paste-btn');
    
    if (!pendingListing) {
      button.innerHTML = 'No data to paste';
      button.classList.add('error');
      setTimeout(() => {
        button.classList.remove('error');
        button.innerHTML = 'Paste Data';
      }, 2000);
      return;
    }

    button.innerHTML = 'Pasting...';
    button.classList.add('loading');

    try {
      // Wait a moment for the form to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      // Find and fill title input
      const titleInput = findInput([
        'input[aria-label="Title"]',
        'input[placeholder*="Title"]',
        'input[name="title"]',
        'label:contains("Title") + input',
        'input[type="text"]:first-of-type'
      ]);
      
      if (titleInput) {
        simulateInput(titleInput, pendingListing.title);
      }

      // Find and fill price input
      const priceInput = findInput([
        'input[aria-label="Price"]',
        'input[placeholder*="Price"]',
        'input[name="price"]',
        'input[type="number"]'
      ]);
      
      if (priceInput && pendingListing.price) {
        simulateInput(priceInput, pendingListing.price);
      }

      // Find and fill description
      const descInput = findInput([
        'textarea[aria-label="Description"]',
        'textarea[placeholder*="Description"]',
        'textarea[name="description"]',
        'textarea'
      ]);
      
      if (descInput && pendingListing.description) {
        // Truncate description if too long
        const desc = pendingListing.description.substring(0, 1000);
        simulateInput(descInput, desc);
      }

      // Show success message with image instructions
      button.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline;vertical-align:middle;margin-right:4px">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Done! Add images manually
      `;
      button.classList.remove('loading');
      button.classList.add('success');

      // Show image URLs in console for manual download
      if (pendingListing.images && pendingListing.images.length > 0) {
        console.log('=== FB Lister: Product Images ===');
        console.log('Download these images and upload them:');
        pendingListing.images.forEach((url, i) => {
          console.log(`Image ${i + 1}: ${url}`);
        });
      }

      // Clear pending data after successful paste
      await chrome.storage.local.remove('pendingListing');

      setTimeout(() => {
        button.classList.remove('success', 'has-data');
        button.innerHTML = 'Paste Data';
        pendingListing = null;
      }, 5000);

    } catch (error) {
      console.error('Paste error:', error);
      button.innerHTML = 'Error - Try Again';
      button.classList.remove('loading');
      button.classList.add('error');

      setTimeout(() => {
        button.classList.remove('error');
        button.innerHTML = 'Paste Data';
        checkForPendingData();
      }, 3000);
    }
  }

  // Initialize when on marketplace create page
  function init() {
    if (window.location.href.includes('facebook.com/marketplace/create')) {
      setTimeout(createPasteButton, 2000);
    }
  }

  // Run on page load
  init();

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
