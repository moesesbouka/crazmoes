// FB Marketplace Lister - Content Script for Facebook Marketplace Create Page
(function() {
  'use strict';

  let pendingListing = null;

  // Create paste button and image panel
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

  // Create image panel to show product images for easy downloading
  function createImagePanel(images) {
    // Remove existing panel
    const existing = document.querySelector('#fb-lister-image-panel');
    if (existing) existing.remove();

    if (!images || images.length === 0) return;

    const panel = document.createElement('div');
    panel.id = 'fb-lister-image-panel';
    panel.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 999998;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      padding: 16px;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';
    header.innerHTML = `
      <strong style="font-size: 14px; color: #333;">Product Images (${images.length})</strong>
      <button id="fb-lister-close-panel" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #666;">&times;</button>
    `;
    panel.appendChild(header);

    const instruction = document.createElement('p');
    instruction.style.cssText = 'font-size: 12px; color: #666; margin: 0 0 12px 0;';
    instruction.textContent = 'Right-click images to save, then upload to Facebook:';
    panel.appendChild(instruction);

    const imageGrid = document.createElement('div');
    imageGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;';
    
    images.slice(0, 6).forEach((url, i) => {
      const imgContainer = document.createElement('a');
      imgContainer.href = url;
      imgContainer.target = '_blank';
      imgContainer.style.cssText = 'display: block; aspect-ratio: 1; overflow: hidden; border-radius: 8px; border: 1px solid #e0e0e0;';
      
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
      img.alt = `Product image ${i + 1}`;
      img.onerror = () => { imgContainer.style.display = 'none'; };
      
      imgContainer.appendChild(img);
      imageGrid.appendChild(imgContainer);
    });

    panel.appendChild(imageGrid);
    document.body.appendChild(panel);

    // Close button handler
    document.querySelector('#fb-lister-close-panel')?.addEventListener('click', () => {
      panel.remove();
    });
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
          button.innerHTML = 'Paste Data (' + pendingListing.title.substring(0, 20) + '...)';
        }
        console.log('FB Lister: Pending data found:', pendingListing);
      }
    } catch (error) {
      console.error('Error checking pending data:', error);
    }
  }

  // Simulate typing with native input setter (works better with React)
  function simulateNativeInput(element, value) {
    if (!element || !value) return false;
    
    // Try setting via native input value setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    
    element.focus();
    
    if (element.tagName === 'INPUT' && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else if (element.tagName === 'TEXTAREA' && nativeTextareaValueSetter) {
      nativeTextareaValueSetter.call(element, value);
    } else {
      element.value = value;
    }
    
    // Fire events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  }

  // Handle contentEditable divs (Facebook uses these)
  function fillContentEditable(element, value) {
    if (!element || !value) return false;
    
    element.focus();
    element.textContent = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  }

  // Find input with multiple strategies
  function findAndFillField(labelText, value, isTextarea = false) {
    if (!value) return false;
    
    const lowerLabel = labelText.toLowerCase();
    
    // Strategy 1: Find by aria-label
    let element = document.querySelector(`${isTextarea ? 'textarea' : 'input'}[aria-label*="${labelText}" i]`);
    
    // Strategy 2: Find by placeholder
    if (!element) {
      element = document.querySelector(`${isTextarea ? 'textarea' : 'input'}[placeholder*="${labelText}" i]`);
    }
    
    // Strategy 3: Find label and get associated input
    if (!element) {
      const labels = document.querySelectorAll('label, span');
      for (const label of labels) {
        if (label.textContent.toLowerCase().includes(lowerLabel)) {
          // Look for input in parent or siblings
          const parent = label.closest('div');
          if (parent) {
            element = parent.querySelector(isTextarea ? 'textarea' : 'input');
            if (element) break;
          }
        }
      }
    }
    
    // Strategy 4: Find contentEditable divs (Facebook's approach)
    if (!element) {
      const editables = document.querySelectorAll('[contenteditable="true"], [role="textbox"]');
      for (const editable of editables) {
        const parent = editable.closest('div[role="group"], div[class*="input"], label');
        if (parent && parent.textContent.toLowerCase().includes(lowerLabel)) {
          return fillContentEditable(editable, value);
        }
      }
    }
    
    if (element) {
      return simulateNativeInput(element, value);
    }
    
    return false;
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
      // Wait for the form to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('FB Lister: Attempting to paste data...', pendingListing);

      // Find and fill fields
      let filledTitle = findAndFillField('Title', pendingListing.title);
      let filledPrice = findAndFillField('Price', pendingListing.price);
      let filledDesc = findAndFillField('Description', pendingListing.description?.substring(0, 1000), true);

      console.log('FB Lister: Fill results - Title:', filledTitle, 'Price:', filledPrice, 'Desc:', filledDesc);

      // Show image panel for manual upload
      if (pendingListing.images && pendingListing.images.length > 0) {
        createImagePanel(pendingListing.images);
      }

      // Show success message
      button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Done! Add images →';
      button.classList.remove('loading');
      button.classList.add('success');

      // Log data for debugging
      console.log('=== FB Lister: Product Data ===');
      console.log('Title:', pendingListing.title);
      console.log('Price:', pendingListing.price);
      console.log('Original Price:', pendingListing.originalPrice);
      console.log('Images:', pendingListing.images);

      // Clear pending data after successful paste
      await chrome.storage.local.remove('pendingListing');

      setTimeout(() => {
        button.classList.remove('success', 'has-data');
        button.innerHTML = 'Paste Data';
        pendingListing = null;
      }, 10000);

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
      console.log('FB Lister: Detected marketplace create page, adding paste button...');
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