import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Chrome, Upload, Package, Loader2, CheckCircle } from "lucide-react";
import JSZip from "jszip";
import { toast } from "@/hooks/use-toast";

// Extension file contents
const extensionFiles = {
  "fb-marketplace-lister": {
    "manifest.json": `{
  "manifest_version": 3,
  "name": "FB Marketplace Lister - Crazy Moe's",
  "version": "1.0.0",
  "description": "Copy product data from shopping sites and create Facebook Marketplace listings with one click",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://www.amazon.com/*",
    "https://www.ebay.com/*",
    "https://www.walmart.com/*",
    "https://www.bestbuy.com/*",
    "https://www.target.com/*",
    "https://www.facebook.com/*",
    "https://facebook.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.amazon.com/*",
        "https://www.ebay.com/*",
        "https://www.walmart.com/*",
        "https://www.bestbuy.com/*",
        "https://www.target.com/*"
      ],
      "js": ["content-scraper.js"],
      "css": ["styles.css"]
    },
    {
      "matches": [
        "https://www.facebook.com/marketplace/create/*",
        "https://facebook.com/marketplace/create/*"
      ],
      "js": ["content-paster.js"],
      "css": ["styles.css"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`,
    "popup.html": `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 280px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .header {
      text-align: center;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 16px;
      margin: 0 0 4px 0;
    }
    .header p {
      font-size: 11px;
      opacity: 0.8;
      margin: 0;
    }
    .status-card {
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .status-label {
      font-size: 10px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    .status-value {
      font-size: 14px;
      font-weight: 600;
    }
    .status-value.ready { color: #10b981; }
    .status-value.no-data { opacity: 0.5; }
    .instructions {
      font-size: 11px;
      opacity: 0.8;
      line-height: 1.5;
    }
    .instructions ol {
      margin: 8px 0 0 0;
      padding-left: 16px;
    }
    .instructions li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>FB Marketplace Lister</h1>
    <p>Crazy Moe's Discount Warehouse</p>
  </div>
  
  <div class="status-card">
    <div class="status-label">Copied Data</div>
    <div id="status" class="status-value no-data">No data copied</div>
  </div>
  
  <div class="instructions">
    <strong>How to use:</strong>
    <ol>
      <li>Browse to a product on Amazon, eBay, etc.</li>
      <li>Click the "Copy to Facebook" button</li>
      <li>On FB Marketplace, click "Paste Data"</li>
      <li>Add photos and publish!</li>
    </ol>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>`,
    "popup.js": `// Check for pending listing data
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
});`,
    "background.js": `// FB Marketplace Lister - Background Service Worker

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
});`,
    "content-scraper.js": `// FB Marketplace Lister - Content Script for Product Pages
(function() {
  'use strict';

  const extractors = {
    amazon: {
      match: /amazon\\.com/,
      extract: () => {
        const title = document.querySelector('#productTitle')?.textContent?.trim() || 
                      document.querySelector('h1.a-spacing-micro span')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('.a-price .a-offscreen') ||
                            document.querySelector('#priceblock_ourprice') ||
                            document.querySelector('#priceblock_dealprice') ||
                            document.querySelector('.a-price-whole');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('#productDescription p')?.textContent?.trim() ||
                           document.querySelector('#feature-bullets')?.textContent?.trim() || '';
        
        const images = [];
        const mainImage = document.querySelector('#landingImage')?.src ||
                         document.querySelector('#imgBlkFront')?.src;
        if (mainImage) images.push(mainImage);
        
        document.querySelectorAll('.imageThumbnail img, #altImages img').forEach(img => {
          const src = img.src?.replace(/\\._.*_\\./, '._AC_SL1500_.') || '';
          if (src && !images.includes(src)) images.push(src);
        });

        return { title, price, description, images };
      }
    },
    ebay: {
      match: /ebay\\.com/,
      extract: () => {
        const title = document.querySelector('h1.x-item-title__mainTitle span')?.textContent?.trim() ||
                      document.querySelector('h1[itemprop="name"]')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('.x-price-primary span') ||
                            document.querySelector('#prcIsum') ||
                            document.querySelector('[itemprop="price"]');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('#desc_ifr')?.contentDocument?.body?.textContent?.trim() ||
                           document.querySelector('.d-item-description')?.textContent?.trim() || '';
        
        const images = [];
        document.querySelectorAll('#vi_main_img_fs, .ux-image-carousel img').forEach(img => {
          if (img.src && !images.includes(img.src)) images.push(img.src);
        });

        return { title, price, description, images };
      }
    },
    walmart: {
      match: /walmart\\.com/,
      extract: () => {
        const title = document.querySelector('h1[itemprop="name"]')?.textContent?.trim() ||
                      document.querySelector('h1.prod-ProductTitle')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('[itemprop="price"]') ||
                            document.querySelector('.price-characteristic');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('.about-desc')?.textContent?.trim() ||
                           document.querySelector('.prod-description')?.textContent?.trim() || '';
        
        const images = [];
        document.querySelectorAll('.hover-zoom-hero-image img, .prod-hero-image img').forEach(img => {
          if (img.src && !images.includes(img.src)) images.push(img.src);
        });

        return { title, price, description, images };
      }
    },
    bestbuy: {
      match: /bestbuy\\.com/,
      extract: () => {
        const title = document.querySelector('.sku-title h1')?.textContent?.trim() ||
                      document.querySelector('h1')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('.priceView-customer-price span') ||
                            document.querySelector('[data-testid="customer-price"] span');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('.shop-product-description')?.textContent?.trim() || '';
        
        const images = [];
        document.querySelectorAll('.picture-wrapper img, .primary-image').forEach(img => {
          if (img.src && !images.includes(img.src)) images.push(img.src);
        });

        return { title, price, description, images };
      }
    },
    target: {
      match: /target\\.com/,
      extract: () => {
        const title = document.querySelector('[data-test="product-title"]')?.textContent?.trim() ||
                      document.querySelector('h1')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('[data-test="product-price"]') ||
                            document.querySelector('.styles__CurrentPriceFontSize');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('[data-test="item-details-description"]')?.textContent?.trim() || '';
        
        const images = [];
        document.querySelectorAll('[data-test="image-gallery-image-0"] img, .slideDeckPicture img').forEach(img => {
          if (img.src && !images.includes(img.src)) images.push(img.src);
        });

        return { title, price, description, images };
      }
    }
  };

  function formatTitle(title) {
    if (title.length <= 75) return title;
    let formatted = title
      .replace(/\\s*\\([^)]*\\)\\s*/g, ' ')
      .replace(/\\s*-\\s*Amazon.*$/i, '')
      .replace(/\\s+/g, ' ')
      .trim();
    if (formatted.length <= 75) return formatted;
    return formatted.substring(0, 72).trim() + '...';
  }

  function calculateMarketplacePrice(price) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) return '';
    return Math.round(numPrice / 2).toString();
  }

  function createFloatingButton() {
    if (document.querySelector('#fb-lister-button')) return;

    const button = document.createElement('button');
    button.id = 'fb-lister-button';
    button.innerHTML = \\\`
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
      </svg>
      Copy to Facebook
    \\\`;
    button.className = 'fb-lister-floating-btn';
    
    button.addEventListener('click', handleCopyClick);
    document.body.appendChild(button);
  }

  async function handleCopyClick() {
    const button = document.querySelector('#fb-lister-button');
    button.classList.add('loading');
    button.innerHTML = 'Copying...';

    try {
      let productData = null;
      for (const [site, extractor] of Object.entries(extractors)) {
        if (extractor.match.test(window.location.href)) {
          productData = extractor.extract();
          break;
        }
      }

      if (!productData || !productData.title) {
        throw new Error('Could not extract product data');
      }

      const marketplaceData = {
        title: formatTitle(productData.title),
        originalTitle: productData.title,
        price: calculateMarketplacePrice(productData.price),
        originalPrice: productData.price,
        description: productData.description,
        images: productData.images,
        sourceUrl: window.location.href,
        copiedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({ pendingListing: marketplaceData });
      chrome.runtime.sendMessage({ 
        action: 'openMarketplace', 
        url: 'https://www.facebook.com/marketplace/create/item' 
      });

      button.innerHTML = \\\`
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Copied!
      \\\`;
      button.classList.remove('loading');
      button.classList.add('success');

      setTimeout(() => {
        button.classList.remove('success');
        button.innerHTML = \\\`
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
          </svg>
          Copy to Facebook
        \\\`;
      }, 3000);

    } catch (error) {
      button.innerHTML = 'Error - Try Again';
      button.classList.remove('loading');
      button.classList.add('error');
      console.error('FB Lister Error:', error);

      setTimeout(() => {
        button.classList.remove('error');
        button.innerHTML = \\\`
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
          </svg>
          Copy to Facebook
        \\\`;
      }, 3000);
    }
  }

  function init() {
    const isProductPage = extractors.amazon.match.test(window.location.href) ||
                         extractors.ebay.match.test(window.location.href) ||
                         extractors.walmart.match.test(window.location.href) ||
                         extractors.bestbuy.match.test(window.location.href) ||
                         extractors.target.match.test(window.location.href);

    if (isProductPage) {
      setTimeout(createFloatingButton, 1500);
    }
  }

  init();
  
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1000);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();`,
    "content-paster.js": `// FB Marketplace Lister - Content Script for Facebook Marketplace Create Page
(function() {
  'use strict';

  let pendingListing = null;

  function createPasteButton() {
    if (document.querySelector('#fb-lister-paste-btn')) return;

    const button = document.createElement('button');
    button.id = 'fb-lister-paste-btn';
    button.innerHTML = 'Paste Data';
    button.className = 'fb-lister-paste-btn';
    
    button.addEventListener('click', handlePaste);
    document.body.appendChild(button);
    checkForPendingData();
  }

  async function checkForPendingData() {
    try {
      const result = await chrome.storage.local.get('pendingListing');
      if (result.pendingListing) {
        pendingListing = result.pendingListing;
        const button = document.querySelector('#fb-lister-paste-btn');
        if (button) {
          button.classList.add('has-data');
          button.innerHTML = \\\`Paste Data (\\\${pendingListing.title.substring(0, 20)}...)\\\`;
        }
      }
    } catch (error) {
      console.error('Error checking pending data:', error);
    }
  }

  function simulateInput(element, value) {
    if (!element || !value) return;
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }

  function findInput(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

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
      await new Promise(resolve => setTimeout(resolve, 500));

      const titleInput = findInput([
        'input[aria-label="Title"]',
        'input[placeholder*="Title"]',
        'input[name="title"]',
        'input[type="text"]:first-of-type'
      ]);
      
      if (titleInput) {
        simulateInput(titleInput, pendingListing.title);
      }

      const priceInput = findInput([
        'input[aria-label="Price"]',
        'input[placeholder*="Price"]',
        'input[name="price"]',
        'input[type="number"]'
      ]);
      
      if (priceInput && pendingListing.price) {
        simulateInput(priceInput, pendingListing.price);
      }

      const descInput = findInput([
        'textarea[aria-label="Description"]',
        'textarea[placeholder*="Description"]',
        'textarea[name="description"]',
        'textarea'
      ]);
      
      if (descInput && pendingListing.description) {
        const desc = pendingListing.description.substring(0, 1000);
        simulateInput(descInput, desc);
      }

      button.innerHTML = \\\`
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline;vertical-align:middle;margin-right:4px">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Done! Add images manually
      \\\`;
      button.classList.remove('loading');
      button.classList.add('success');

      if (pendingListing.images && pendingListing.images.length > 0) {
        console.log('=== FB Lister: Product Images ===');
        console.log('Download these images and upload them:');
        pendingListing.images.forEach((url, i) => {
          console.log(\\\`Image \\\${i + 1}: \\\${url}\\\`);
        });
      }

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

  function init() {
    if (window.location.href.includes('facebook.com/marketplace/create')) {
      setTimeout(createPasteButton, 2000);
    }
  }

  init();

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();`,
    "styles.css": `/* FB Marketplace Lister - Floating Button Styles */

.fb-lister-floating-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #1877f2 0%, #0a5dc2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(24, 119, 242, 0.4);
  transition: all 0.3s ease;
}

.fb-lister-floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(24, 119, 242, 0.5);
}

.fb-lister-floating-btn:active {
  transform: translateY(0);
}

.fb-lister-floating-btn.loading {
  pointer-events: none;
  opacity: 0.8;
}

.fb-lister-floating-btn.success {
  background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
  box-shadow: 0 4px 20px rgba(40, 167, 69, 0.4);
}

.fb-lister-floating-btn.error {
  background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%);
  box-shadow: 0 4px 20px rgba(220, 53, 69, 0.4);
}

.fb-lister-floating-btn svg {
  flex-shrink: 0;
}

/* Paste button for Facebook Marketplace */
.fb-lister-paste-btn {
  position: fixed;
  top: 100px;
  left: 20px;
  z-index: 999999;
  padding: 14px 24px;
  background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(40, 167, 69, 0.4);
  transition: all 0.3s ease;
}

.fb-lister-paste-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(40, 167, 69, 0.5);
}

.fb-lister-paste-btn.has-data {
  animation: pulse 2s infinite;
}

.fb-lister-paste-btn.loading {
  pointer-events: none;
  opacity: 0.8;
}

.fb-lister-paste-btn.success {
  background: linear-gradient(135deg, #1877f2 0%, #0a5dc2 100%);
  box-shadow: 0 4px 20px rgba(24, 119, 242, 0.4);
}

.fb-lister-paste-btn.error {
  background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%);
  box-shadow: 0 4px 20px rgba(220, 53, 69, 0.4);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(40, 167, 69, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(40, 167, 69, 0.7);
  }
}`
  },
  "fb-marketplace-importer": {
    "manifest.json": `{
  "manifest_version": 3,
  "name": "FB Marketplace Importer - Crazy Moe's",
  "version": "1.0.0",
  "description": "Backup your Facebook Marketplace inventory to prevent data loss",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://www.facebook.com/marketplace/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://www.facebook.com/marketplace/you/*"],
      "js": ["content-importer.js"],
      "css": ["styles.css"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`,
    "popup.html": `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 280px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
    }
    .header {
      text-align: center;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 16px;
      margin: 0 0 4px 0;
    }
    .header p {
      font-size: 11px;
      opacity: 0.8;
      margin: 0;
    }
    .stats {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      flex: 1;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
    }
    .stat-label {
      font-size: 10px;
      text-transform: uppercase;
      opacity: 0.7;
    }
    .action-btn {
      width: 100%;
      padding: 12px;
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .action-btn:hover {
      background: rgba(255,255,255,0.3);
    }
    .info {
      margin-top: 12px;
      font-size: 11px;
      opacity: 0.7;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>FB Marketplace Importer</h1>
    <p>Crazy Moe's Discount Warehouse</p>
  </div>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value" id="total-saved">0</div>
      <div class="stat-label">Total Saved</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="last-import">Never</div>
      <div class="stat-label">Last Import</div>
    </div>
  </div>
  
  <button class="action-btn" id="go-to-listings">
    Go to Your Listings →
  </button>
  
  <div class="info">
    Navigate to your Marketplace listings to start importing
  </div>
  
  <script src="popup.js"></script>
</body>
</html>`,
    "popup.js": `// Load stats
chrome.storage.local.get(['lastImport', 'totalImported'], (result) => {
  const lastImportEl = document.getElementById('last-import');
  const totalSavedEl = document.getElementById('total-saved');
  
  if (result.lastImport) {
    const date = new Date(result.lastImport.date);
    const today = new Date();
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      lastImportEl.textContent = 'Today';
    } else if (diffDays === 1) {
      lastImportEl.textContent = 'Yesterday';
    } else {
      lastImportEl.textContent = \`\${diffDays}d ago\`;
    }
  }
  
  totalSavedEl.textContent = result.totalImported || 0;
});

// Go to listings button
document.getElementById('go-to-listings').addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://www.facebook.com/marketplace/you/selling'
  });
});`,
    "background.js": `// FB Marketplace Importer - Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('FB Marketplace Importer installed!');
    chrome.storage.local.set({ totalImported: 0 });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    chrome.storage.local.get('totalImported', (result) => {
      const newTotal = (result.totalImported || 0) + request.count;
      chrome.storage.local.set({
        totalImported: newTotal,
        lastImport: {
          count: request.count,
          date: new Date().toISOString()
        }
      });
      sendResponse({ success: true, total: newTotal });
    });
    return true;
  }
});`,
    "content-importer.js": `// FB Marketplace Importer - Content Script for Your Listings Page
(function() {
  'use strict';

  const SUPABASE_URL = 'https://dluabbbrdhvspbjmckuf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4';

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;

  function createImportButton() {
    if (document.querySelector('#fb-importer-button')) return;

    const container = document.createElement('div');
    container.id = 'fb-importer-container';
    container.innerHTML = \`
      <button id="fb-importer-button" class="fb-importer-btn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        Import All Listings
      </button>
      <div id="fb-importer-progress" class="fb-importer-progress" style="display:none;">
        <div class="progress-text">Importing: <span id="import-count">0</span> / <span id="import-total">0</span></div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>
    \`;
    
    document.body.appendChild(container);
    document.querySelector('#fb-importer-button').addEventListener('click', startImport);
  }

  function extractListingData(element) {
    try {
      const linkElement = element.querySelector('a[href*="/marketplace/item/"]');
      if (!linkElement) return null;
      
      const listingUrl = linkElement.href;
      const facebookId = listingUrl.match(/\\/item\\/(\\d+)/)?.[1] || null;
      
      const titleElement = element.querySelector('span[dir="auto"]') ||
                          element.querySelector('[role="heading"]') ||
                          linkElement;
      const title = titleElement?.textContent?.trim() || 'Untitled';
      
      const priceElement = element.querySelector('span[dir="auto"]:last-of-type');
      let price = null;
      if (priceElement) {
        const priceMatch = priceElement.textContent?.match(/\\$?([\\d,]+(?:\\.\\d{2})?)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', ''));
        }
      }
      
      const imageElement = element.querySelector('img[src*="fbcdn"]');
      const images = imageElement?.src ? [imageElement.src] : [];
      
      return {
        facebook_id: facebookId,
        title: title,
        price: price,
        images: images,
        listing_url: listingUrl,
        status: 'active',
        imported_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting listing:', error);
      return null;
    }
  }

  async function saveListing(listing) {
    try {
      const response = await fetch(\`\${SUPABASE_URL}/rest/v1/marketplace_listings\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(listing)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Save error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Network error:', error);
      return false;
    }
  }

  async function collectAllListings() {
    const listings = [];
    const seenIds = new Set();
    let lastHeight = 0;
    let noNewListingsCount = 0;
    
    while (noNewListingsCount < 3) {
      const listingElements = document.querySelectorAll('[data-pagelet*="BrowseFeed"] > div > div');
      
      listingElements.forEach(element => {
        const data = extractListingData(element);
        if (data && data.facebook_id && !seenIds.has(data.facebook_id)) {
          seenIds.add(data.facebook_id);
          listings.push(data);
        }
      });
      
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newHeight = document.documentElement.scrollHeight;
      if (newHeight === lastHeight) {
        noNewListingsCount++;
      } else {
        noNewListingsCount = 0;
        lastHeight = newHeight;
      }
    }
    
    return listings;
  }

  async function startImport() {
    if (isImporting) return;
    
    isImporting = true;
    importedCount = 0;
    
    const button = document.querySelector('#fb-importer-button');
    const progress = document.querySelector('#fb-importer-progress');
    const countSpan = document.querySelector('#import-count');
    const totalSpan = document.querySelector('#import-total');
    const progressFill = document.querySelector('#progress-fill');
    
    button.disabled = true;
    button.innerHTML = 'Scanning listings...';
    
    try {
      const listings = await collectAllListings();
      totalCount = listings.length;
      
      if (totalCount === 0) {
        button.innerHTML = 'No listings found';
        button.disabled = false;
        isImporting = false;
        return;
      }
      
      progress.style.display = 'block';
      totalSpan.textContent = totalCount;
      button.innerHTML = 'Importing...';
      
      for (const listing of listings) {
        const success = await saveListing(listing);
        if (success) {
          importedCount++;
          countSpan.textContent = importedCount;
          progressFill.style.width = \`\${(importedCount / totalCount) * 100}%\`;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      button.innerHTML = \`✓ Imported \${importedCount} listings\`;
      button.classList.add('success');
      
      chrome.storage.local.set({
        lastImport: {
          count: importedCount,
          date: new Date().toISOString()
        }
      });
      
      setTimeout(() => {
        button.disabled = false;
        button.classList.remove('success');
        button.innerHTML = \`
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Import All Listings
        \`;
        progress.style.display = 'none';
        isImporting = false;
      }, 5000);
      
    } catch (error) {
      console.error('Import error:', error);
      button.innerHTML = 'Error - Try Again';
      button.disabled = false;
      isImporting = false;
    }
  }

  function init() {
    if (window.location.href.includes('facebook.com/marketplace/you')) {
      setTimeout(createImportButton, 2000);
    }
  }

  init();

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();`,
    "styles.css": `/* FB Marketplace Importer Styles */

#fb-importer-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 999999;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fb-importer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  transition: all 0.3s ease;
}

.fb-importer-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
}

.fb-importer-btn:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.fb-importer-btn.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
}

.fb-importer-progress {
  background: rgba(0, 0, 0, 0.85);
  padding: 16px;
  border-radius: 12px;
  min-width: 200px;
}

.progress-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #fff;
  margin-bottom: 10px;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: 0%;
}`
  }
};

// Simple placeholder icon as base64 PNG
const createPlaceholderIcon = (size: number, color: string, letter: string): string => {
  // Create a simple SVG and convert to data URL
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${color}"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold">${letter}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export function AdminTools() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadComplete, setDownloadComplete] = useState<string | null>(null);

  const downloadExtension = async (extensionName: string) => {
    setDownloading(extensionName);
    setDownloadComplete(null);
    
    try {
      const zip = new JSZip();
      const files = extensionFiles[extensionName as keyof typeof extensionFiles];
      
      if (!files) {
        throw new Error("Extension not found");
      }

      // Add all text files
      for (const [filename, content] of Object.entries(files)) {
        zip.file(filename, content);
      }

      // Add placeholder icons
      const iconColor = extensionName === "fb-marketplace-lister" ? "#f97316" : "#6366f1";
      const iconLetter = extensionName === "fb-marketplace-lister" ? "L" : "I";
      
      // Create icons folder with placeholder SVG icons (Chrome accepts SVG in manifest v3)
      const sizes = [16, 48, 128];
      for (const size of sizes) {
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${iconColor}"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold">${iconLetter}</text>
</svg>`;
        // Chrome extensions need PNG icons, so we'll use a tiny 1x1 placeholder
        // The SVG will be embedded, users can replace with real PNGs later
        zip.file(`icons/icon${size}.svg`, iconSvg);
        
        // Also create a simple PNG placeholder (1x1 pixel encoded)
        // This is a minimal valid PNG
        const pngData = createMinimalPng(size, iconColor, iconLetter);
        zip.file(`icons/icon${size}.png`, pngData, { base64: true });
      }

      // Generate and download the ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${extensionName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloadComplete(extensionName);
      toast({
        title: "Download complete!",
        description: `${extensionName}.zip has been downloaded. Extract it and load in Chrome.`,
      });
      
      setTimeout(() => setDownloadComplete(null), 3000);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error creating the extension package.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* FB Lister Extension */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  FB Marketplace Lister
                </CardTitle>
                <CardDescription className="mt-2">
                  Copy product data from shopping sites and create Facebook Marketplace listings with one click
                </CardDescription>
              </div>
              <Badge variant="outline">Chrome Extension</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Features:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Floating "Copy to Facebook" button on product pages</li>
                <li>Auto-formats titles (65-75 chars optimal)</li>
                <li>Automatically halves price for Marketplace</li>
                <li>Copies all product images</li>
                <li>"Paste Data" button on FB Marketplace create page</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Supported Sites:</h4>
              <p className="text-muted-foreground">Amazon, eBay, Walmart, Best Buy, Target, and more</p>
            </div>

            <Button 
              className="w-full" 
              onClick={() => downloadExtension("fb-marketplace-lister")}
              disabled={downloading === "fb-marketplace-lister"}
            >
              {downloading === "fb-marketplace-lister" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating ZIP...
                </>
              ) : downloadComplete === "fb-marketplace-lister" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Extension
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* FB Importer Extension */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  FB Marketplace Importer
                </CardTitle>
                <CardDescription className="mt-2">
                  Backup your entire Facebook Marketplace inventory to prevent data loss
                </CardDescription>
              </div>
              <Badge variant="outline">Chrome Extension</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Features:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Imports all active Marketplace listings</li>
                <li>Captures titles, descriptions, prices, images</li>
                <li>Saves to your inventory database</li>
                <li>Searchable & exportable backup</li>
                <li>Protection against account loss</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Why this matters:</strong> Facebook has no export tool. If your account is disabled, you lose everything.
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={() => downloadExtension("fb-marketplace-importer")}
              disabled={downloading === "fb-marketplace-importer"}
            >
              {downloading === "fb-marketplace-importer" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating ZIP...
                </>
              ) : downloadComplete === "fb-marketplace-importer" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Extension
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Installation Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            Installation Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Download</span> the extension ZIP file using the button above
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Extract</span> the ZIP file to a folder on your computer
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Open Chrome</span> and go to{" "}
              <code className="px-1.5 py-0.5 bg-muted rounded text-xs">chrome://extensions</code>
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Enable</span> "Developer mode" using the toggle in the top right
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Click</span> "Load unpacked" and select the extracted folder
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Pin</span> the extension to your toolbar for easy access
            </li>
          </ol>

          <div className="p-4 bg-muted/50 rounded-lg mt-4">
            <h4 className="font-medium text-sm mb-2">Quick Test:</h4>
            <p className="text-sm text-muted-foreground">
              After installing the <strong>FB Marketplace Importer</strong>, go to{" "}
              <code className="px-1.5 py-0.5 bg-background rounded text-xs">facebook.com/marketplace/you/selling</code>{" "}
              and look for the floating "Import All Listings" button in the top-right corner.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to create a minimal valid PNG
function createMinimalPng(size: number, color: string, letter: string): string {
  // Create a canvas to generate a real PNG
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Draw rounded rectangle background
    const radius = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw letter
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2 + size * 0.05);
  }
  
  // Convert to base64 (remove the data:image/png;base64, prefix)
  return canvas.toDataURL('image/png').split(',')[1];
}
