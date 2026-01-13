// FB Marketplace Importer - Content Script for Your Listings Page
// Version 1.2.0 - Multi-strategy with GraphQL fallback for seller dashboard
(function() {
  'use strict';

  const EXTENSION_VERSION = '1.2.0';

  // Configuration - Update this with your Supabase project URL
  const SUPABASE_URL = 'https://dluabbbrdhvspbjmckuf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4';

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;
  
  // GraphQL capture storage
  let capturedListings = new Map();
  let isCapturing = false;

  // Create floating import button
  function createImportButton() {
    if (document.querySelector('#fb-importer-button')) return;

    const container = document.createElement('div');
    container.id = 'fb-importer-container';
    container.innerHTML = `
      <button id="fb-importer-button" class="fb-importer-btn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        Import All Listings
      </button>
      <div id="fb-importer-version" class="fb-importer-version">v${EXTENSION_VERSION}</div>
      <div id="fb-importer-progress" class="fb-importer-progress" style="display:none;">
        <div class="progress-text">Importing: <span id="import-count">0</span> / <span id="import-total">0</span></div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    document.querySelector('#fb-importer-button').addEventListener('click', startImport);
    
    console.log(`FB Importer v${EXTENSION_VERSION}: Button created`);
  }

  // ============= FLEXIBLE ID EXTRACTION =============
  
  // Extract listing ID from various URL patterns Facebook uses
  function extractListingIdFromUrl(url) {
    if (!url) return null;
    
    // Pattern 1: /marketplace/item/123456789
    const itemMatch = url.match(/\/marketplace\/item\/(\d+)/);
    if (itemMatch) return itemMatch[1];
    
    // Pattern 2: /item/123456789 (shorter variant)
    const shortItemMatch = url.match(/\/item\/(\d+)/);
    if (shortItemMatch) return shortItemMatch[1];
    
    // Pattern 3: listing_id=123456789
    const listingIdMatch = url.match(/[?&]listing_id=(\d+)/);
    if (listingIdMatch) return listingIdMatch[1];
    
    // Pattern 4: item_id=123456789
    const itemIdMatch = url.match(/[?&]item_id=(\d+)/);
    if (itemIdMatch) return itemIdMatch[1];
    
    // Pattern 5: Look for any long numeric ID in the URL path
    const pathMatch = url.match(/\/(\d{10,})/);
    if (pathMatch) return pathMatch[1];
    
    return null;
  }

  // ============= DOM EXTRACTION (Track A) =============
  
  // Extract listing data from a listing element
  function extractListingData(element) {
    try {
      // Find any anchor with a marketplace-related URL
      const anchors = element.querySelectorAll('a[href]');
      let listingUrl = null;
      let facebookId = null;
      
      for (const anchor of anchors) {
        const href = anchor.href || '';
        const id = extractListingIdFromUrl(href);
        if (id) {
          facebookId = id;
          listingUrl = href;
          break;
        }
      }
      
      // If no ID found in anchors, check the element's own link if it's clickable
      if (!facebookId && element.tagName === 'A') {
        facebookId = extractListingIdFromUrl(element.href);
        listingUrl = element.href;
      }
      
      // If still no ID, check role="link" elements
      if (!facebookId) {
        const roleLinks = element.querySelectorAll('[role="link"]');
        for (const link of roleLinks) {
          // Check for data attributes or nested anchors
          const nestedAnchor = link.querySelector('a[href]');
          if (nestedAnchor) {
            facebookId = extractListingIdFromUrl(nestedAnchor.href);
            listingUrl = nestedAnchor.href;
            if (facebookId) break;
          }
        }
      }
      
      if (!facebookId) return null;
      
      // Get title - multiple strategies prioritizing role="heading"
      let title = '';
      const headingEl = element.querySelector('[role="heading"]');
      if (headingEl) {
        title = headingEl.textContent?.trim() || '';
      }
      if (!title) {
        const spanEls = element.querySelectorAll('span[dir="auto"]:not([aria-hidden])');
        for (const span of spanEls) {
          const text = span.textContent?.trim() || '';
          // Skip if it looks like a price
          if (text && !text.match(/^\$[\d,]+/) && text.length > 3 && text.length < 200) {
            title = text;
            break;
          }
        }
      }
      if (!title) {
        title = element.querySelector('a[href*="marketplace"] span')?.textContent?.trim() || 'Untitled';
      }
      
      // Clean up title (remove price if mixed in)
      title = title.replace(/^\$[\d,]+(\.\d{2})?\s*/, ''); // Remove leading price
      title = title.replace(/\s+/g, ' ').trim(); // Normalize whitespace
      
      // Get price - look for currency patterns
      let price = null;
      const allText = element.textContent || '';
      const priceMatch = allText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
      
      // Get image - try multiple sources (fbcdn/scontent are Facebook CDNs)
      const imageElement = 
        element.querySelector('img[src*="scontent"]') ||
        element.querySelector('img[src*="fbcdn"]') ||
        element.querySelector('img[src*="facebook"]') ||
        element.querySelector('img[src]:not([src*="emoji"]):not([src*="gif"]):not([src*="static"])');
      
      const images = imageElement?.src ? [imageElement.src] : [];
      
      // Only return if we have the essential data
      if (!facebookId || title === 'Untitled' || title.length < 3) return null;
      
      return {
        facebook_id: facebookId,
        title: title.substring(0, 255),
        price: price,
        images: images,
        listing_url: listingUrl || `https://www.facebook.com/marketplace/item/${facebookId}`,
        status: 'active',
        imported_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('FB Importer: Error extracting listing:', error);
      return null;
    }
  }

  // Get listing elements using multiple strategies
  function getListingElements() {
    const containers = new Set();
    
    // Strategy 1: Traditional item links
    const itemLinks1 = document.querySelectorAll('a[href*="/marketplace/item/"]');
    console.log(`FB Importer: Strategy 1 (item links): ${itemLinks1.length}`);
    
    // Strategy 2: listing_id parameter links
    const itemLinks2 = document.querySelectorAll('a[href*="listing_id="]');
    console.log(`FB Importer: Strategy 2 (listing_id): ${itemLinks2.length}`);
    
    // Strategy 3: /item/ links (shorter pattern)
    const itemLinks3 = document.querySelectorAll('a[href*="/item/"]');
    console.log(`FB Importer: Strategy 3 (/item/): ${itemLinks3.length}`);
    
    // Combine all anchors
    const allAnchors = new Set([...itemLinks1, ...itemLinks2, ...itemLinks3]);
    
    // Walk up from each anchor to find card containers
    for (const link of allAnchors) {
      let parent = link.parentElement;
      for (let i = 0; i < 6 && parent; i++) {
        // Look for a container that has an image and reasonable size
        if (parent.querySelector('img') && parent.offsetHeight > 80 && parent.offsetWidth > 80) {
          // Avoid grabbing the whole page
          if (parent.offsetHeight < 600 && parent.contains(link)) {
            containers.add(parent);
            break;
          }
        }
        parent = parent.parentElement;
      }
    }
    
    // Strategy 4: If no href-based links found, try role="link" clickable tiles
    if (containers.size === 0) {
      console.log('FB Importer: Trying role="link" fallback strategy...');
      const roleLinks = document.querySelectorAll('[role="link"]');
      console.log(`FB Importer: Strategy 4 (role=link): ${roleLinks.length}`);
      
      for (const link of roleLinks) {
        // Only consider if it has an image (likely a listing tile)
        if (link.querySelector('img') && link.offsetHeight > 80) {
          containers.add(link);
        }
      }
    }
    
    console.log(`FB Importer: Total containers found: ${containers.size}`);
    return Array.from(containers);
  }

  // ============= GRAPHQL INTERCEPTION (Track B) =============
  
  // Set up fetch/XHR interception to capture GraphQL responses
  function setupGraphQLInterception() {
    console.log('FB Importer: Setting up GraphQL interception...');
    
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      
      if (isCapturing) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (url.includes('graphql') || url.includes('/api/graphql')) {
          try {
            const clone = response.clone();
            const text = await clone.text();
            parseGraphQLResponse(text);
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
      
      return response;
    };
    
    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._fbImporterUrl = url;
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('load', function() {
        if (isCapturing && this._fbImporterUrl && 
            (this._fbImporterUrl.includes('graphql') || this._fbImporterUrl.includes('/api/graphql'))) {
          try {
            parseGraphQLResponse(this.responseText);
          } catch (e) {
            // Ignore parsing errors
          }
        }
      });
      return originalXHRSend.apply(this, args);
    };
  }
  
  // Parse GraphQL response and extract listing data
  function parseGraphQLResponse(text) {
    try {
      // Sometimes responses are JSON lines, try both
      const jsonObjects = text.includes('\n') ? 
        text.split('\n').filter(line => line.trim().startsWith('{')) :
        [text];
      
      for (const jsonStr of jsonObjects) {
        try {
          const data = JSON.parse(jsonStr);
          findListingsInObject(data);
        } catch (e) {
          // Not valid JSON, skip
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  // Recursively search for listing-like objects in GraphQL response
  function findListingsInObject(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 15) return;
    
    // Check if this object looks like a listing
    if (isListingObject(obj)) {
      const listing = extractListingFromGraphQL(obj);
      if (listing && listing.facebook_id && !capturedListings.has(listing.facebook_id)) {
        capturedListings.set(listing.facebook_id, listing);
        console.log(`FB Importer: Captured listing from GraphQL: ${listing.title?.substring(0, 50)}`);
      }
    }
    
    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      obj.forEach(item => findListingsInObject(item, depth + 1));
    } else {
      for (const key of Object.keys(obj)) {
        findListingsInObject(obj[key], depth + 1);
      }
    }
  }
  
  // Check if an object looks like a listing
  function isListingObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    
    // Must have an ID-like field
    const hasId = obj.id || obj.listing_id || obj.marketplace_listing_id || 
                  obj.primary_listing_id || obj.story_id;
    
    // Must have some content indicators
    const hasTitle = obj.title || obj.name || obj.marketplace_listing_title;
    const hasPrice = obj.price || obj.listing_price || obj.formatted_price || 
                     obj.current_price || obj.sale_price;
    const hasImage = obj.image || obj.images || obj.primary_photo || 
                     obj.photo || obj.listing_photos || obj.primary_listing_photo;
    
    return hasId && (hasTitle || hasPrice || hasImage);
  }
  
  // Extract listing data from a GraphQL object
  function extractListingFromGraphQL(obj) {
    try {
      // Extract ID (try multiple field names)
      const id = String(obj.id || obj.listing_id || obj.marketplace_listing_id || 
                       obj.primary_listing_id || obj.story_id || '');
      if (!id || id.length < 5) return null;
      
      // Extract title
      let title = obj.title || obj.name || obj.marketplace_listing_title || '';
      if (typeof title === 'object') title = title.text || '';
      title = String(title).trim();
      
      // Extract price
      let price = null;
      const priceField = obj.price || obj.listing_price || obj.formatted_price || 
                        obj.current_price || obj.sale_price;
      if (priceField) {
        if (typeof priceField === 'object') {
          price = parseFloat(String(priceField.amount || priceField.text || '').replace(/[^0-9.]/g, ''));
        } else {
          price = parseFloat(String(priceField).replace(/[^0-9.]/g, ''));
        }
      }
      
      // Extract images
      const images = [];
      const imageField = obj.image || obj.images || obj.primary_photo || 
                        obj.photo || obj.listing_photos || obj.primary_listing_photo;
      if (imageField) {
        if (Array.isArray(imageField)) {
          imageField.forEach(img => {
            const url = typeof img === 'string' ? img : img?.uri || img?.url || img?.src || '';
            if (url) images.push(url);
          });
        } else if (typeof imageField === 'object') {
          const url = imageField.uri || imageField.url || imageField.src || '';
          if (url) images.push(url);
        } else if (typeof imageField === 'string') {
          images.push(imageField);
        }
      }
      
      return {
        facebook_id: id,
        title: title.substring(0, 255) || 'Untitled',
        price: price || null,
        images: images.slice(0, 10),
        listing_url: `https://www.facebook.com/marketplace/item/${id}`,
        status: 'active',
        imported_at: new Date().toISOString()
      };
    } catch (e) {
      return null;
    }
  }

  // ============= MAIN COLLECTION LOGIC =============
  
  // Scroll and collect all listings using both DOM and GraphQL
  async function collectAllListings() {
    const listings = [];
    const seenIds = new Set();
    let lastHeight = 0;
    let noNewListingsCount = 0;
    
    // Start GraphQL capture
    capturedListings.clear();
    isCapturing = true;
    
    console.log('FB Importer: Starting to collect listings...');
    console.log('FB Importer: GraphQL interception active');
    
    // Initial diagnostic
    console.log('FB Importer: === INITIAL PAGE DIAGNOSTIC ===');
    console.log('  a[href*="/marketplace/item/"]:', document.querySelectorAll('a[href*="/marketplace/item/"]').length);
    console.log('  a[href*="listing_id="]:', document.querySelectorAll('a[href*="listing_id="]').length);
    console.log('  a[href*="/item/"]:', document.querySelectorAll('a[href*="/item/"]').length);
    console.log('  [role="link"]:', document.querySelectorAll('[role="link"]').length);
    
    while (noNewListingsCount < 4) {
      // Find all listing elements using multi-strategy approach
      const listingElements = getListingElements();
      
      // Extract from DOM
      listingElements.forEach(element => {
        const data = extractListingData(element);
        if (data && data.facebook_id && !seenIds.has(data.facebook_id)) {
          seenIds.add(data.facebook_id);
          listings.push(data);
        }
      });
      
      console.log(`FB Importer: DOM listings: ${listings.length}, GraphQL captured: ${capturedListings.size}`);
      
      // Scroll down to load more and trigger GraphQL requests
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newHeight = document.documentElement.scrollHeight;
      const newCapturedSize = capturedListings.size;
      
      if (newHeight === lastHeight && newCapturedSize === capturedListings.size) {
        noNewListingsCount++;
        console.log(`FB Importer: No new content (attempt ${noNewListingsCount}/4)`);
      } else {
        noNewListingsCount = 0;
        lastHeight = newHeight;
      }
    }
    
    // Stop capturing
    isCapturing = false;
    
    // Merge GraphQL captured listings with DOM listings
    for (const [id, listing] of capturedListings) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        listings.push(listing);
      }
    }
    
    console.log(`FB Importer: === FINAL RESULTS ===`);
    console.log(`  DOM extracted: ${listings.length - capturedListings.size}`);
    console.log(`  GraphQL captured: ${capturedListings.size}`);
    console.log(`  Total unique: ${listings.length}`);
    
    return listings;
  }

  // Send listing to Supabase
  async function saveListing(listing) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(listing)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('FB Importer: Save error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('FB Importer: Network error:', error);
      return false;
    }
  }

  // Start import process
  async function startImport() {
    if (isImporting) return;
    
    console.log(`FB Importer v${EXTENSION_VERSION}: Starting import...`);
    console.log('FB Importer: Current URL:', window.location.href);
    
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
      // Collect all listings by scrolling (uses both DOM and GraphQL)
      const listings = await collectAllListings();
      totalCount = listings.length;
      
      if (totalCount === 0) {
        console.log('FB Importer: No listings found to import');
        console.log('FB Importer: This may happen if Facebook is using a new DOM structure');
        console.log('FB Importer: Check the diagnostic output above for debugging info');
        button.innerHTML = 'No listings found';
        button.disabled = false;
        isImporting = false;
        return;
      }
      
      // Show progress
      progress.style.display = 'block';
      totalSpan.textContent = totalCount;
      button.innerHTML = 'Importing...';
      
      // Import each listing
      for (const listing of listings) {
        const success = await saveListing(listing);
        if (success) {
          importedCount++;
          countSpan.textContent = importedCount;
          progressFill.style.width = `${(importedCount / totalCount) * 100}%`;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Done
      console.log(`FB Importer: Successfully imported ${importedCount} listings`);
      button.innerHTML = `✓ Imported ${importedCount} listings`;
      button.classList.add('success');
      
      // Store import stats
      chrome.storage.local.set({
        lastImport: {
          count: importedCount,
          date: new Date().toISOString()
        }
      });
      
      setTimeout(() => {
        button.disabled = false;
        button.classList.remove('success');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Import All Listings
        `;
        progress.style.display = 'none';
        isImporting = false;
      }, 5000);
      
    } catch (error) {
      console.error('FB Importer: Import error:', error);
      button.innerHTML = 'Error - Try Again';
      button.disabled = false;
      isImporting = false;
    }
  }

  // Initialize on your listings page
  function init() {
    if (window.location.href.includes('facebook.com/marketplace/you')) {
      console.log(`FB Importer v${EXTENSION_VERSION}: Detected Your Listings page, initializing...`);
      setupGraphQLInterception();
      setTimeout(createImportButton, 2000);
    }
  }

  init();

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('FB Importer: URL changed, re-initializing...');
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
