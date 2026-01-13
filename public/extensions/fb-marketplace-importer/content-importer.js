// FB Marketplace Importer - Content Script for Your Listings Page
// Version 1.1.0 - Multi-strategy DOM detection
(function() {
  'use strict';

  const EXTENSION_VERSION = '1.1.0';

  // Configuration - Update this with your Supabase project URL
  const SUPABASE_URL = 'https://dluabbbrdhvspbjmckuf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4';

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;

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

  // Extract listing data from a listing element
  function extractListingData(element) {
    try {
      // Get the listing link (anchor approach is most stable)
      const linkElement = element.querySelector('a[href*="/marketplace/item/"]');
      if (!linkElement) return null;
      
      const listingUrl = linkElement.href;
      const facebookId = listingUrl.match(/\/item\/(\d+)/)?.[1] || null;
      if (!facebookId) return null;
      
      // Get title - multiple strategies
      const titleElement = 
        element.querySelector('span[dir="auto"]:not([aria-hidden])') ||
        element.querySelector('[role="heading"]') ||
        element.querySelector('a[href*="/marketplace/item/"] span') ||
        linkElement;
      
      // Clean up title (remove price if mixed in)
      let title = titleElement?.textContent?.trim() || 'Untitled';
      title = title.replace(/^\$[\d,]+(\.\d{2})?\s*/, ''); // Remove leading price
      title = title.replace(/\s+/g, ' ').trim(); // Normalize whitespace
      
      // Get price - look for currency patterns
      let price = null;
      const allText = element.textContent || '';
      const priceMatch = allText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
      
      // Get image - try multiple sources
      const imageElement = 
        element.querySelector('img[src*="fbcdn"]') ||
        element.querySelector('img[src*="facebook"]') ||
        element.querySelector('img[src*="scontent"]') ||
        element.querySelector('img[src]:not([src*="emoji"]):not([src*="gif"])');
      
      const images = imageElement?.src ? [imageElement.src] : [];
      
      // Only return if we have the essential data
      if (!facebookId || title === 'Untitled') return null;
      
      return {
        facebook_id: facebookId,
        title: title.substring(0, 255), // Limit length
        price: price,
        images: images,
        listing_url: listingUrl,
        status: 'active',
        imported_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('FB Importer: Error extracting listing:', error);
      return null;
    }
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

  // Get listing elements using multiple strategies
  function getListingElements() {
    // Strategy 1: Links to marketplace items (most reliable)
    const itemLinks = document.querySelectorAll('a[href*="/marketplace/item/"]');
    
    console.log(`FB Importer: Found ${itemLinks.length} item links on page`);
    
    // Get parent containers of each link
    const containers = new Set();
    itemLinks.forEach(link => {
      // Walk up to find a reasonable container (usually 3-5 levels up)
      let parent = link.parentElement;
      for (let i = 0; i < 6 && parent; i++) {
        // Look for a container that has an image and reasonable size
        if (parent.querySelector('img') && parent.offsetHeight > 80 && parent.offsetWidth > 80) {
          // Make sure this container has our link but isn't too large (avoid grabbing the whole page)
          if (parent.offsetHeight < 500 && parent.contains(link)) {
            containers.add(parent);
            break;
          }
        }
        parent = parent.parentElement;
      }
    });
    
    // Fallback: if no containers found, use the links' immediate card-like parents
    if (containers.size === 0 && itemLinks.length > 0) {
      console.log('FB Importer: Using fallback container detection');
      itemLinks.forEach(link => {
        let parent = link.parentElement;
        for (let i = 0; i < 4 && parent; i++) {
          if (parent.offsetHeight > 50) {
            containers.add(parent);
            break;
          }
          parent = parent.parentElement;
        }
      });
    }
    
    return Array.from(containers);
  }

  // Scroll and collect all listings
  async function collectAllListings() {
    const listings = [];
    const seenIds = new Set();
    let lastHeight = 0;
    let noNewListingsCount = 0;
    
    console.log('FB Importer: Starting to collect listings...');
    
    while (noNewListingsCount < 3) {
      // Find all listing elements using multi-strategy approach
      const listingElements = getListingElements();
      
      console.log(`FB Importer: Found ${listingElements.length} listing containers`);
      
      listingElements.forEach(element => {
        const data = extractListingData(element);
        if (data && data.facebook_id && !seenIds.has(data.facebook_id)) {
          seenIds.add(data.facebook_id);
          listings.push(data);
        }
      });
      
      console.log(`FB Importer: Collected ${listings.length} unique listings so far`);
      
      // Scroll down to load more
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newHeight = document.documentElement.scrollHeight;
      if (newHeight === lastHeight) {
        noNewListingsCount++;
        console.log(`FB Importer: No new content loaded (attempt ${noNewListingsCount}/3)`);
      } else {
        noNewListingsCount = 0;
        lastHeight = newHeight;
      }
    }
    
    console.log(`FB Importer: Total unique listings collected: ${listings.length}`);
    return listings;
  }

  // Start import process
  async function startImport() {
    if (isImporting) return;
    
    console.log('FB Importer: Starting import...');
    console.log('FB Importer: Current URL:', window.location.href);
    console.log('FB Importer: Item links found:', 
      document.querySelectorAll('a[href*="/marketplace/item/"]').length);
    
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
      // Collect all listings by scrolling
      const listings = await collectAllListings();
      totalCount = listings.length;
      
      if (totalCount === 0) {
        console.log('FB Importer: No listings found to import');
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
