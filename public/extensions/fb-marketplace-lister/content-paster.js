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
      // Wait for the form to be fully loaded
      await new Promise(function(resolve) { setTimeout(resolve, 1000); });

      console.log('FB Lister: Attempting to paste data...', pendingListing);

      // Upload images first
      let imagesUploaded = false;
      if (pendingListing.images && pendingListing.images.length > 0) {
        imagesUploaded = await uploadImages(pendingListing.images);
        // Wait a moment for images to process
        await new Promise(function(resolve) { setTimeout(resolve, 500); });
      }

      // Find and fill fields
      let filledTitle = findAndFillField('Title', pendingListing.title);
      let filledPrice = findAndFillField('Price', pendingListing.price);
      
      // Try multiple label variations for description
      let filledDesc = false;
      const descValue = pendingListing.description ? pendingListing.description.substring(0, 1000) : '';
      if (descValue) {
        filledDesc = findAndFillField('Description', descValue, true);
        if (!filledDesc) filledDesc = findAndFillField('Describe', descValue, true);
        if (!filledDesc) filledDesc = findAndFillField('describe your item', descValue, true);
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

      // Log data for debugging
      console.log('=== FB Lister: Product Data ===');
      console.log('Title:', pendingListing.title);
      console.log('Price:', pendingListing.price);
      console.log('Original Price:', pendingListing.originalPrice);
      console.log('Images:', pendingListing.images);

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
