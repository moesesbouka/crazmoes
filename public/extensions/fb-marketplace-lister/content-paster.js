// FB Marketplace Lister - Content Script for Facebook Marketplace Create Page
// Version 1.4.2 - Fixed duplicate function, improved description detection + debug toast
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

  // Show debug toast on Facebook page
  function showDebugToast(info) {
    const existing = document.querySelector('#fb-lister-debug-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'fb-lister-debug-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 20px;
      z-index: 999999;
      background: #1a1a2e;
      color: #eee;
      padding: 14px 18px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      max-width: 300px;
      line-height: 1.6;
    `;

    toast.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 6px; color: #4fc3f7;">
        FB Lister v1.4.2 Debug
      </div>
      <div>
        <div>📝 Pending desc: ${info.descLen} chars</div>
        <div>🖼️ Pending images: ${info.imageCount}</div>
        <div>🔍 Desc field found: ${info.descFieldFound ? '✅ yes' : '❌ no'}</div>
        <div>✏️ Desc insert: ${info.descInsertResult ? '✅ success' : '❌ failed'}</div>
        ${info.descFieldTag ? `<div style="opacity:0.7">Field: ${info.descFieldTag}</div>` : ''}
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
  }

  // Fetch image as blob via background script (to handle CORS)
  async function fetchImageAsBlob(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'fetchImage', url: url }, (response) => {
        if (response && response.success && response.dataUrl) {
          // Convert data URL to blob
          fetch(response.dataUrl)
            .then(res => res.blob())
            .then(blob => resolve(blob))
            .catch(() => resolve(null));
        } else {
          console.log('FB Lister: Image fetch failed for', url, response?.error);
          resolve(null);
        }
      });
    });
  }

  // Upload images using DataTransfer
  async function uploadImages(images) {
    if (!images || images.length === 0) {
      console.log('FB Lister: No images to upload');
      return false;
    }

    console.log('FB Lister: Attempting to upload', images.length, 'images');

    // Find the file input for images
    const fileInputSelectors = [
      'input[type="file"][accept*="image"]',
      'input[type="file"][accept*="video"]',
      'input[type="file"]'
    ];

    let fileInput = null;
    for (const selector of fileInputSelectors) {
      const inputs = document.querySelectorAll(selector);
      for (const input of inputs) {
        // Prefer inputs that accept images
        if (input.accept && (input.accept.includes('image') || input.accept.includes('*'))) {
          fileInput = input;
          break;
        }
      }
      if (fileInput) break;
    }

    if (!fileInput) {
      // Try to find any file input
      fileInput = document.querySelector('input[type="file"]');
    }

    if (!fileInput) {
      console.log('FB Lister: No file input found, showing image panel');
      showImagePanel(images);
      return false;
    }

    console.log('FB Lister: Found file input:', fileInput);

    // Fetch all images as blobs
    const files = [];
    for (let i = 0; i < Math.min(images.length, 10); i++) {
      const url = images[i];
      console.log('FB Lister: Fetching image', i + 1, ':', url.substring(0, 80));
      
      const blob = await fetchImageAsBlob(url);
      if (blob) {
        const extension = blob.type.includes('png') ? 'png' : 'jpg';
        const fileName = 'product-image-' + (i + 1) + '.' + extension;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        files.push(file);
        console.log('FB Lister: Created file:', fileName, 'size:', file.size);
      }
    }

    if (files.length === 0) {
      console.log('FB Lister: No images could be fetched');
      showImagePanel(images);
      return false;
    }

    // Create DataTransfer and add files
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));

    try {
      // Set files on the input
      fileInput.files = dataTransfer.files;
      
      // Dispatch events
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log('FB Lister: Successfully set', files.length, 'files on input');
      return true;
    } catch (error) {
      console.error('FB Lister: Error setting files:', error);
      
      // Try triggering click and using drag-drop as fallback
      try {
        const dropZone = fileInput.closest('div[role="button"]') || fileInput.parentElement;
        if (dropZone) {
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          dropZone.dispatchEvent(new DragEvent('dragenter', { bubbles: true }));
          dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true }));
          dropZone.dispatchEvent(dropEvent);
          console.log('FB Lister: Used drop event fallback');
          return true;
        }
      } catch (e) {
        console.error('FB Lister: Drop fallback failed:', e);
      }
      
      showImagePanel(images);
      return false;
    }
  }

  // Show image panel for manual download/upload
  function showImagePanel(images) {
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
    header.innerHTML = '<strong style="font-size: 14px; color: #333;">Product Images (' + images.length + ')</strong>' +
      '<button id="fb-lister-close-panel" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #666;">&times;</button>';
    panel.appendChild(header);

    const instruction = document.createElement('p');
    instruction.style.cssText = 'font-size: 12px; color: #666; margin: 0 0 12px 0;';
    instruction.textContent = 'Right-click images to save, then upload:';
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
      img.alt = 'Product image ' + (i + 1);
      img.onerror = function() { imgContainer.style.display = 'none'; };
      
      imgContainer.appendChild(img);
      imageGrid.appendChild(imgContainer);
    });

    panel.appendChild(imageGrid);
    document.body.appendChild(panel);

    // Close button handler
    document.querySelector('#fb-lister-close-panel').addEventListener('click', function() {
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
    
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    
    element.focus();
    
    if (element.tagName === 'INPUT' && nativeInputValueSetter && nativeInputValueSetter.set) {
      nativeInputValueSetter.set.call(element, value);
    } else if (element.tagName === 'TEXTAREA' && nativeTextareaValueSetter && nativeTextareaValueSetter.set) {
      nativeTextareaValueSetter.set.call(element, value);
    } else {
      element.value = value;
    }
    
    // Fire events in sequence
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  }

  // Handle contentEditable divs (Facebook uses these)
  function fillContentEditable(element, value) {
    if (!element || !value) return false;
    
    console.log('FB Lister: Filling contentEditable element', element.tagName, element.className);
    
    // Find the actual editable node (Facebook nests these)
    let editableNode = element;
    
    // If element has role="textbox" but isn't contenteditable, find the real editable child
    if (element.getAttribute('contenteditable') !== 'true') {
      const innerEditable = element.querySelector('[contenteditable="true"]') || 
                           element.querySelector('[data-contents="true"]') ||
                           element.querySelector('div[data-text="true"]');
      if (innerEditable) {
        editableNode = innerEditable;
        console.log('FB Lister: Found inner editable node');
      }
    }
    
    // Focus the element
    editableNode.focus();
    
    // Try using execCommand first (more reliable for React/Draft.js)
    let success = false;
    try {
      document.execCommand('selectAll', false, null);
      success = document.execCommand('insertText', false, value);
      console.log('FB Lister: execCommand insertText result:', success);
    } catch (e) {
      console.log('FB Lister: execCommand failed:', e);
    }
    
    // Verify insertion worked
    const insertedText = editableNode.textContent || editableNode.innerText || '';
    if (insertedText.length < 10) {
      console.log('FB Lister: execCommand didnt work, trying fallback');
      // Fallback: direct text manipulation
      try {
        editableNode.textContent = value;
        editableNode.dispatchEvent(new InputEvent('input', { 
          bubbles: true, 
          cancelable: true,
          inputType: 'insertFromPaste',
          data: value 
        }));
        success = true;
      } catch (e2) {
        console.log('FB Lister: textContent fallback failed:', e2);
      }
    } else {
      success = true;
    }
    
    // Fire all possible events
    editableNode.dispatchEvent(new Event('focus', { bubbles: true }));
    editableNode.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    editableNode.dispatchEvent(new Event('change', { bubbles: true }));
    editableNode.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    editableNode.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    editableNode.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return success;
  }

  // Find title field
  function findTitleField() {
    const selectors = [
      'input[aria-label*="Title" i]',
      'input[aria-label*="title" i]',
      'input[placeholder*="Title" i]',
      'input[name="title"]'
    ];
    
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) {}
    }
    
    // Search by traversing labels
    const labels = document.querySelectorAll('label, span');
    for (const label of labels) {
      if (label.textContent.trim().toLowerCase() === 'title') {
        const parent = label.closest('div');
        if (parent) {
          const input = parent.querySelector('input');
          if (input) return input;
        }
      }
    }
    
    return null;
  }

  // Find price field
  function findPriceField() {
    const selectors = [
      'input[aria-label*="Price" i]',
      'input[placeholder*="Price" i]',
      'input[name="price"]',
      'input[type="text"][inputmode="numeric"]'
    ];
    
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) {}
    }
    
    // Search by traversing labels
    const labels = document.querySelectorAll('label, span');
    for (const label of labels) {
      if (label.textContent.trim().toLowerCase() === 'price') {
        const parent = label.closest('div');
        if (parent) {
          const input = parent.querySelector('input');
          if (input) return input;
        }
      }
    }
    
    return null;
  }

  // Find description field - improved for Facebook's Draft.js editor
  function findDescriptionField() {
    console.log('FB Lister: Searching for description field...');
    
    // Strategy 1: Direct selectors for contenteditable with description labels
    const directSelectors = [
      '[aria-label*="Description" i][contenteditable="true"]',
      '[aria-label*="Describe" i][contenteditable="true"]',
      'textarea[aria-label*="Description" i]',
      'textarea[aria-label*="Describe" i]',
      'textarea[placeholder*="Description" i]',
      'textarea[placeholder*="Describe" i]'
    ];
    
    for (const sel of directSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          console.log('FB Lister: Found description via direct selector:', sel);
          return el;
        }
      } catch (e) {}
    }
    
    // Strategy 2: Find role="textbox" with description context
    // Facebook uses role="textbox" wrappers that contain the actual editable div
    const textboxes = document.querySelectorAll('[role="textbox"]');
    console.log('FB Lister: Found', textboxes.length, 'textbox elements');
    
    for (const tb of textboxes) {
      const ariaLabel = (tb.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (tb.getAttribute('placeholder') || '').toLowerCase();
      
      if (ariaLabel.includes('description') || ariaLabel.includes('describe') ||
          placeholder.includes('description') || placeholder.includes('describe')) {
        console.log('FB Lister: Found description textbox via aria-label');
        return tb;
      }
      
      // Check parent/ancestor for description label
      const container = tb.closest('div[role="group"]') || tb.closest('label') || tb.parentElement?.parentElement;
      if (container) {
        const containerText = container.textContent?.toLowerCase() || '';
        // Make sure it's the description field, not title or price
        if ((containerText.includes('description') || containerText.includes('describe')) && 
            !containerText.includes('title') && 
            containerText.length < 500) {
          console.log('FB Lister: Found description textbox via container text');
          return tb;
        }
      }
    }
    
    // Strategy 3: Find all contenteditable elements
    const editables = document.querySelectorAll('[contenteditable="true"]');
    console.log('FB Lister: Found', editables.length, 'contenteditable elements');
    
    for (const ed of editables) {
      const ariaLabel = (ed.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('description') || ariaLabel.includes('describe')) {
        console.log('FB Lister: Found description contenteditable via aria-label');
        return ed;
      }
      
      // Check ancestor containers
      const ancestor = ed.closest('div[role="group"]') || ed.closest('label');
      if (ancestor) {
        const text = ancestor.textContent?.toLowerCase() || '';
        if ((text.includes('description') || text.includes('describe')) && 
            text.length < 500) {
          console.log('FB Lister: Found description contenteditable via ancestor');
          return ed;
        }
      }
    }
    
    // Strategy 4: Look for the 3rd major input area (order: title, price, description)
    const allInputs = document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"]');
    let visibleCount = 0;
    for (const input of allInputs) {
      if (input.offsetParent !== null && input.offsetHeight > 0) {
        visibleCount++;
        // Description is typically the 3rd visible input and is a large field
        if (visibleCount >= 3) {
          const isLargeField = input.tagName === 'TEXTAREA' || 
                               input.getAttribute('contenteditable') === 'true' ||
                               input.getAttribute('role') === 'textbox';
          if (isLargeField) {
            console.log('FB Lister: Found description as', visibleCount, 'th visible input');
            return input;
          }
        }
      }
    }
    
    console.log('FB Lister: Could not find description field');
    return null;
  }

  // Unified field finder and filler (SINGLE DEFINITION - no duplicates!)
  function findAndFillField(labelText, value, isTextarea = false) {
    if (!value) return false;
    
    console.log('FB Lister: Looking for field:', labelText, 'value length:', value.length);
    
    let element = null;
    
    if (labelText.toLowerCase() === 'title') {
      element = findTitleField();
    } else if (labelText.toLowerCase() === 'price') {
      element = findPriceField();
    } else if (labelText.toLowerCase().includes('descri')) {
      element = findDescriptionField();
    }
    
    if (element) {
      console.log('FB Lister: Found', labelText, 'field:', element.tagName, 
                  'role:', element.getAttribute('role'),
                  'contenteditable:', element.getAttribute('contenteditable'));
      
      // Check if it's a contenteditable element or role=textbox
      if (element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox') {
        return fillContentEditable(element, value);
      }
      return simulateNativeInput(element, value);
    }
    
    console.log('FB Lister: Could not find field for:', labelText);
    return false;
  }

  // Handle paste button click
  async function handlePaste() {
    const button = document.querySelector('#fb-lister-paste-btn');
    
    if (!pendingListing) {
      button.innerHTML = 'No data to paste';
      button.classList.add('error');
      setTimeout(function() {
        button.classList.remove('error');
        button.innerHTML = 'Paste Data';
      }, 2000);
      return;
    }

    button.innerHTML = 'Pasting...';
    button.classList.add('loading');

    // Debug info to collect
    const debugInfo = {
      descLen: (pendingListing.description || '').length,
      imageCount: (pendingListing.images || []).length,
      descFieldFound: false,
      descInsertResult: false,
      descFieldTag: ''
    };

    try {
      // Wait longer for Facebook's React form to fully initialize
      console.log('FB Lister: Waiting for form to initialize...');
      await new Promise(function(resolve) { setTimeout(resolve, 2500); });

      console.log('FB Lister: Attempting to paste data...', pendingListing);

      // Upload images first
      let imagesUploaded = false;
      if (pendingListing.images && pendingListing.images.length > 0) {
        imagesUploaded = await uploadImages(pendingListing.images);
        await new Promise(function(resolve) { setTimeout(resolve, 1000); });
      }

      // Find and fill fields with delays between each
      let filledTitle = findAndFillField('Title', pendingListing.title);
      await new Promise(function(resolve) { setTimeout(resolve, 400); });
      
      let filledPrice = findAndFillField('Price', pendingListing.price);
      await new Promise(function(resolve) { setTimeout(resolve, 400); });
      
      // Fill description - check if field exists first for debug
      let filledDesc = false;
      const descValue = pendingListing.description ? pendingListing.description.substring(0, 2000) : '';
      
      if (descValue) {
        // Pre-check: can we find the field?
        const descField = findDescriptionField();
        debugInfo.descFieldFound = !!descField;
        if (descField) {
          debugInfo.descFieldTag = descField.tagName + 
            (descField.getAttribute('role') ? '[role=' + descField.getAttribute('role') + ']' : '') +
            (descField.getAttribute('contenteditable') ? '[contenteditable]' : '');
        }
        
        filledDesc = findAndFillField('Description', descValue, true);
        debugInfo.descInsertResult = filledDesc;
        
        if (!filledDesc) {
          await new Promise(function(resolve) { setTimeout(resolve, 500); });
          filledDesc = findAndFillField('Describe', descValue, true);
          debugInfo.descInsertResult = filledDesc;
        }
      }

      console.log('FB Lister: Fill results - Title:', filledTitle, 'Price:', filledPrice, 'Desc:', filledDesc, 'Images:', imagesUploaded);

      // Show debug toast
      showDebugToast(debugInfo);

      // Show success message
      if (imagesUploaded) {
        button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Done!';
      } else {
        button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Done! Add images manually';
      }
      button.classList.remove('loading');
      button.classList.add('success');

      console.log('=== FB Lister v1.4.2: Product Data ===');
      console.log('Title:', pendingListing.title);
      console.log('Price:', pendingListing.price);
      console.log('Description length:', (pendingListing.description || '').length);
      console.log('Images:', pendingListing.images?.length || 0);

      // Clear pending data after successful paste
      await chrome.storage.local.remove('pendingListing');

      setTimeout(function() {
        button.classList.remove('success', 'has-data');
        button.innerHTML = 'Paste Data';
        pendingListing = null;
      }, 10000);

    } catch (error) {
      console.error('Paste error:', error);
      showDebugToast(debugInfo);
      button.innerHTML = 'Error - Try Again';
      button.classList.remove('loading');
      button.classList.add('error');

      setTimeout(function() {
        button.classList.remove('error');
        button.innerHTML = 'Paste Data';
        checkForPendingData();
      }, 3000);
    }
  }

  // Initialize when on marketplace create page
  function init() {
    if (window.location.href.includes('facebook.com/marketplace/create')) {
      console.log('FB Lister v1.4.2: Detected marketplace create page, adding paste button...');
      setTimeout(createPasteButton, 2000);
    }
  }

  // Run on page load
  init();

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
