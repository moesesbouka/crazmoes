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
      console.log('FB Lister: Fetching image', i + 1, ':', url);
      
      const blob = await fetchImageAsBlob(url);
      if (blob) {
        const extension = blob.type.includes('png') ? 'png' : 'jpg';
        const fileName = 'product-image-' + (i + 1) + '.' + extension;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        files.push(file);
        console.log('FB Lister: Created file:', fileName, 'size:', file.size, 'type:', file.type);
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
    
    console.log('FB Lister: Filling contentEditable element');
    
    // Focus and clear
    element.focus();
    
    // Try using execCommand first (more reliable for React)
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, value);
      console.log('FB Lister: Used execCommand to fill contentEditable');
    } catch (e) {
      // Fallback to direct manipulation
      element.textContent = value;
      element.innerHTML = value.replace(/\n/g, '<br>');
    }
    
    // Fire all possible events
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  }

  // Find and fill a specific field type
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

  function findDescriptionField() {
    console.log('FB Lister: Searching for description field...');
    
    // Strategy 1: Direct selectors
    const directSelectors = [
      '[aria-label*="Description" i][contenteditable="true"]',
      '[aria-label*="Describe" i][contenteditable="true"]',
      'textarea[aria-label*="Description" i]',
      'textarea[aria-label*="Describe" i]',
      '[role="textbox"][aria-label*="Description" i]',
      '[role="textbox"][aria-label*="Describe" i]',
      'textarea[placeholder*="Description" i]',
      'textarea[placeholder*="Describe" i]'
    ];
    
    for (const sel of directSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          console.log('FB Lister: Found description via selector:', sel);
          return el;
        }
      } catch (e) {}
    }
    
    // Strategy 2: Find all textboxes and check context
    const textboxes = document.querySelectorAll('[role="textbox"], [contenteditable="true"], textarea');
    console.log('FB Lister: Found', textboxes.length, 'textbox elements');
    
    for (const tb of textboxes) {
      const ariaLabel = (tb.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (tb.getAttribute('placeholder') || '').toLowerCase();
      
      // Check the element itself
      if (ariaLabel.includes('description') || ariaLabel.includes('describe') ||
          placeholder.includes('description') || placeholder.includes('describe')) {
        console.log('FB Lister: Found description via aria-label/placeholder');
        return tb;
      }
      
      // Check parent containers for description label
      const parent = tb.closest('div[role="group"], label, div');
      if (parent) {
        const parentText = parent.textContent.toLowerCase();
        if ((parentText.includes('description') || parentText.includes('describe')) && 
            !parentText.includes('title') && !parentText.includes('price')) {
          console.log('FB Lister: Found description via parent text');
          return tb;
        }
      }
    }
    
    // Strategy 3: Look for the 3rd major input area (after title and price)
    const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
    let inputCount = 0;
    for (const input of allInputs) {
      if (input.offsetParent !== null) { // visible
        inputCount++;
        if (inputCount >= 3) {
          const isLargeField = input.tagName === 'TEXTAREA' || 
                               input.getAttribute('contenteditable') === 'true' ||
                               input.getAttribute('role') === 'textbox';
          if (isLargeField) {
            console.log('FB Lister: Found description as 3rd visible input');
            return input;
          }
        }
      }
    }
    
    console.log('FB Lister: Could not find description field');
    return null;
  }

  // Unified field finder and filler
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
      console.log('FB Lister: Found', labelText, 'field:', element.tagName, element.className);
      
      // Check if it's a contenteditable element
      if (element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox') {
        return fillContentEditable(element, value);
      }
      return simulateNativeInput(element, value);
    }
    
    console.log('FB Lister: Could not find field for:', labelText);
    return false;
  }

  // Find input with multiple strategies
  function findAndFillField(labelText, value, isTextarea = false) {
    if (!value) return false;
    
    const lowerLabel = labelText.toLowerCase();
    console.log('FB Lister: Looking for field:', labelText, 'isTextarea:', isTextarea);
    
    // Strategy 1: Find by aria-label (exact and partial)
    let element = document.querySelector((isTextarea ? 'textarea' : 'input') + '[aria-label*="' + labelText + '" i]');
    if (element) console.log('FB Lister: Found via aria-label');
    
    // Strategy 2: Find by placeholder
    if (!element) {
      element = document.querySelector((isTextarea ? 'textarea' : 'input') + '[placeholder*="' + labelText + '" i]');
      if (element) console.log('FB Lister: Found via placeholder');
    }
    
    // Strategy 3: For description, look for textareas or large text inputs
    if (!element && isTextarea) {
      // Facebook often uses spans with role="textbox" for description
      const textboxes = document.querySelectorAll('[role="textbox"], textarea, [contenteditable="true"]');
      for (const tb of textboxes) {
        const ariaLabel = (tb.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (tb.getAttribute('placeholder') || '').toLowerCase();
        const parentText = (tb.closest('label, div[role="group"]')?.textContent || '').toLowerCase();
        
        if (ariaLabel.includes('description') || ariaLabel.includes('describe') ||
            placeholder.includes('description') || placeholder.includes('describe') ||
            parentText.includes('description') || parentText.includes('describe')) {
          element = tb;
          console.log('FB Lister: Found description textbox via role/content check');
          break;
        }
      }
    }
    
    // Strategy 4: Find label and get associated input
    if (!element) {
      const labels = document.querySelectorAll('label, span');
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label.textContent.toLowerCase().includes(lowerLabel)) {
          const parent = label.closest('div');
          if (parent) {
            element = parent.querySelector(isTextarea ? 'textarea' : 'input');
            if (!element && isTextarea) {
              // Try contenteditable or role=textbox
              element = parent.querySelector('[contenteditable="true"], [role="textbox"]');
            }
            if (element) {
              console.log('FB Lister: Found via parent label');
              break;
            }
          }
        }
      }
    }
    
    // Strategy 5: Find any contentEditable divs with matching context (Facebook's approach)
    if (!element) {
      const editables = document.querySelectorAll('[contenteditable="true"], [role="textbox"]');
      for (let i = 0; i < editables.length; i++) {
        const editable = editables[i];
        const parent = editable.closest('div[role="group"], div[class*="input"], label');
        if (parent && parent.textContent.toLowerCase().includes(lowerLabel)) {
          console.log('FB Lister: Found contentEditable for', labelText);
          return fillContentEditable(editable, value);
        }
      }
    }
    
    if (element) {
      // Check if it's a contenteditable element
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
      await new Promise(function(resolve) { setTimeout(resolve, 300); });
      
      let filledPrice = findAndFillField('Price', pendingListing.price);
      await new Promise(function(resolve) { setTimeout(resolve, 300); });
      
      // Fill description
      let filledDesc = false;
      const descValue = pendingListing.description ? pendingListing.description.substring(0, 2000) : '';
      if (descValue) {
        filledDesc = findAndFillField('Description', descValue, true);
        if (!filledDesc) {
          await new Promise(function(resolve) { setTimeout(resolve, 500); });
          filledDesc = findAndFillField('Describe', descValue, true);
        }
      }

      console.log('FB Lister: Fill results - Title:', filledTitle, 'Price:', filledPrice, 'Desc:', filledDesc, 'Images:', imagesUploaded);

      // Show success message
      if (imagesUploaded) {
        button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Done!';
      } else {
        button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Done! Add images manually';
      }
      button.classList.remove('loading');
      button.classList.add('success');

      console.log('=== FB Lister v1.4.1: Product Data ===');
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
      console.log('FB Lister: Detected marketplace create page, adding paste button...');
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
