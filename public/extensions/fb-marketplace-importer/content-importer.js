// FB Marketplace Importer - Content Script for Your Listings Page
(function() {
  'use strict';

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
      <div id="fb-importer-progress" class="fb-importer-progress" style="display:none;">
        <div class="progress-text">Importing: <span id="import-count">0</span> / <span id="import-total">0</span></div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    document.querySelector('#fb-importer-button').addEventListener('click', startImport);
  }

  // Extract listing data from a listing element
  function extractListingData(element) {
    try {
      // Get the listing link
      const linkElement = element.querySelector('a[href*="/marketplace/item/"]');
      if (!linkElement) return null;
      
      const listingUrl = linkElement.href;
      const facebookId = listingUrl.match(/\/item\/(\d+)/)?.[1] || null;
      
      // Get title
      const titleElement = element.querySelector('span[dir="auto"]') ||
                          element.querySelector('[role="heading"]') ||
                          linkElement;
      const title = titleElement?.textContent?.trim() || 'Untitled';
      
      // Get price
      const priceElement = element.querySelector('span[dir="auto"]:last-of-type');
      let price = null;
      if (priceElement) {
        const priceMatch = priceElement.textContent?.match(/\$?([\d,]+(?:\.\d{2})?)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', ''));
        }
      }
      
      // Get image
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
        console.error('Save error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Network error:', error);
      return false;
    }
  }

  // Scroll and collect all listings
  async function collectAllListings() {
    const listings = [];
    const seenIds = new Set();
    let lastHeight = 0;
    let noNewListingsCount = 0;
    
    while (noNewListingsCount < 3) {
      // Find all listing elements
      const listingElements = document.querySelectorAll('[data-pagelet*="BrowseFeed"] > div > div');
      
      listingElements.forEach(element => {
        const data = extractListingData(element);
        if (data && data.facebook_id && !seenIds.has(data.facebook_id)) {
          seenIds.add(data.facebook_id);
          listings.push(data);
        }
      });
      
      // Scroll down
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

  // Start import process
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
      // Collect all listings by scrolling
      const listings = await collectAllListings();
      totalCount = listings.length;
      
      if (totalCount === 0) {
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
      console.error('Import error:', error);
      button.innerHTML = 'Error - Try Again';
      button.disabled = false;
      isImporting = false;
    }
  }

  // Initialize on your listings page
  function init() {
    if (window.location.href.includes('facebook.com/marketplace/you')) {
      setTimeout(createImportButton, 2000);
    }
  }

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
