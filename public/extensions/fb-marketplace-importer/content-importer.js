// FB Marketplace Importer - Content Script for Your Listings Page
// Version 1.2.4 - Deep image extraction: clicks into each listing to capture ALL gallery images
(function () {
  "use strict";

  const EXTENSION_VERSION = "1.2.4";

  const SUPABASE_URL = "https://dluabbbrdhvspbjmckuf.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4";

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;

  // GraphQL captured listings (includes description, condition, category)
  const capturedListings = new Map();
  let lastCapturedSize = 0;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Inject the page-context GraphQL interceptor
  function injectGraphQLInterceptor() {
    if (window.__fbImporterGraphqlInjected) return;
    window.__fbImporterGraphqlInjected = true;

    console.log("FB Importer: Injecting GraphQL interceptor into page context...");

    // Listen for messages from the injected page script
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || msg.source !== "fb-importer") return;

      if (msg.type === "READY") {
        console.log("FB Importer: GraphQL interceptor is READY");
      }

      if (msg.type === "LISTING") {
        const listing = msg.payload;
        if (listing && listing.facebook_id && !capturedListings.has(listing.facebook_id)) {
          capturedListings.set(listing.facebook_id, listing);
          console.log(`FB Importer: GraphQL captured (${capturedListings.size}):`, listing.title?.slice(0, 50));
        }
      }
    });

    // Inject the script into page context
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("page-graphql-interceptor.js");
    script.onload = () => script.remove();
    document.documentElement.appendChild(script);
  }

  function createImportButton() {
    if (document.querySelector("#fb-importer-button")) return;

    const container = document.createElement("div");
    container.id = "fb-importer-container";
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
      <div id="fb-importer-status" class="fb-importer-status" style="display:none;"></div>
    `;

    document.body.appendChild(container);
    document.querySelector("#fb-importer-button").addEventListener("click", startImport);

    console.log(`FB Importer v${EXTENSION_VERSION}: Button created`);
  }

  function updateStatus(text) {
    const status = document.querySelector("#fb-importer-status");
    if (status) {
      status.style.display = "block";
      status.textContent = text;
    }
    console.log(`FB Importer: ${text}`);
  }

  function extractListingIdFromUrl(url) {
    if (!url) return null;

    const m1 = url.match(/\/marketplace\/item\/(\d+)/);
    if (m1) return m1[1];

    const m2 = url.match(/\/item\/(\d+)/);
    if (m2) return m2[1];

    const m3 = url.match(/[?&]listing_id=(\d+)/);
    if (m3) return m3[1];

    const m4 = url.match(/[?&]item_id=(\d+)/);
    if (m4) return m4[1];

    const m5 = url.match(/\/(\d{10,})/);
    if (m5) return m5[1];

    return null;
  }

  function extractIdFromAnyString(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{10,})/);
    return m ? m[1] : null;
  }

  function getVisibleText(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function extractBackgroundImageUrl(el) {
    const nodes = el.querySelectorAll("div, span");
    for (const n of nodes) {
      const bg = window.getComputedStyle(n).backgroundImage;
      if (bg && bg !== "none" && bg.includes("url(")) {
        const m = bg.match(/url\(["']?(.*?)["']?\)/);
        if (m && m[1] && m[1].startsWith("http")) return m[1];
      }
    }
    return null;
  }

  function findAnyMarketplaceUrlInElement(el) {
    const attrsToCheck = ["href", "data-href", "data-url", "ajaxify", "data-testid", "aria-label", "data-ft"];
    const all = el.querySelectorAll("*");
    for (const node of all) {
      for (const a of attrsToCheck) {
        const v = node.getAttribute && node.getAttribute(a);
        if (!v) continue;
        if (v.includes("marketplace") || v.includes("/item/") || v.includes("listing_id") || v.includes("item_id")) {
          return v;
        }
      }
    }
    return null;
  }

  // ============= DEEP IMAGE EXTRACTION =============
  
  // Wait for image gallery to appear in modal/detail view
  async function waitForImageGallery(maxWait = 4000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // Look for common Facebook gallery selectors
      const gallerySelectors = [
        '[data-pagelet*="MediaViewerPhoto"]',
        '[data-pagelet*="PhotoViewer"]',
        '[role="dialog"] img[src*="scontent"]',
        '[role="main"] img[src*="scontent"]',
        '.x1n2onr6 img[src*="scontent"]', // Common FB container class
        'div[style*="background-image"] img',
      ];
      
      for (const sel of gallerySelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
          // Wait a bit more for all images to load
          await sleep(500);
          return true;
        }
      }
      
      await sleep(200);
    }
    
    return false;
  }

  // Extract all high-res images from the current view (modal or detail page)
  function extractAllVisibleImages() {
    const images = new Set();
    const minSize = 100; // Skip tiny images (icons, etc.)
    
    // Get all img elements with Facebook CDN sources
    const allImgs = document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
    
    for (const img of allImgs) {
      const src = img.src;
      if (!src || src.includes("emoji") || src.includes("static")) continue;
      
      // Check if it's a reasonably sized image
      const rect = img.getBoundingClientRect();
      if (rect.width >= minSize || rect.height >= minSize) {
        // Try to get highest resolution version
        let highResSrc = src;
        
        // Facebook often has size params we can strip/upgrade
        if (src.includes("_n.jpg") || src.includes("_o.jpg")) {
          images.add(src);
        } else {
          // Add base URL, may be lower res but still useful
          images.add(src);
        }
      }
    }
    
    // Also check background images
    const bgElements = document.querySelectorAll('[style*="background-image"]');
    for (const el of bgElements) {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== "none" && (bg.includes("scontent") || bg.includes("fbcdn"))) {
        const m = bg.match(/url\(["']?(.*?)["']?\)/);
        if (m && m[1]) {
          images.add(m[1]);
        }
      }
    }
    
    return Array.from(images);
  }

  // Click into a listing to get full gallery, then extract images
  async function extractFullImagesFromTile(tile, listingTitle) {
    const originalUrl = window.location.href;
    
    try {
      // Find clickable element within tile
      const clickTarget = tile.querySelector('a[href*="marketplace"]') || 
                          tile.querySelector('[role="link"]') ||
                          tile.querySelector('[role="button"]') ||
                          tile;
      
      if (!clickTarget) {
        console.log(`FB Importer: No clickable element found for "${listingTitle?.slice(0, 30)}"`);
        return null;
      }
      
      // Simulate click
      clickTarget.click();
      
      // Wait for modal/detail page to open
      await sleep(800);
      
      // Check if we're in a modal or navigated to detail page
      const galleryLoaded = await waitForImageGallery(4000);
      
      if (!galleryLoaded) {
        console.log(`FB Importer: Gallery didn't load for "${listingTitle?.slice(0, 30)}"`);
        // Try to go back/close modal
        await closeModalOrGoBack(originalUrl);
        return null;
      }
      
      // Extract all images from the gallery
      let allImages = extractAllVisibleImages();
      
      // Try to navigate through gallery to capture more images
      const nextButton = document.querySelector('[aria-label="Next"]') || 
                         document.querySelector('[data-testid="photo-viewer-next"]') ||
                         document.querySelector('div[role="button"] svg[viewBox="0 0 24 24"]');
      
      if (nextButton && allImages.length < 10) {
        // Click through gallery up to 10 times
        for (let i = 0; i < 10; i++) {
          nextButton.click();
          await sleep(400);
          const newImages = extractAllVisibleImages();
          newImages.forEach(img => allImages.includes(img) || allImages.push(img));
          
          // Stop if we've looped back (same image count)
          if (allImages.length >= 20) break;
        }
      }
      
      // Close modal or navigate back
      await closeModalOrGoBack(originalUrl);
      
      // Deduplicate and limit
      const uniqueImages = [...new Set(allImages)].slice(0, 20);
      console.log(`FB Importer: Extracted ${uniqueImages.length} images for "${listingTitle?.slice(0, 30)}"`);
      
      return uniqueImages;
      
    } catch (e) {
      console.error(`FB Importer: Error extracting images for "${listingTitle?.slice(0, 30)}"`, e);
      await closeModalOrGoBack(originalUrl);
      return null;
    }
  }

  async function closeModalOrGoBack(originalUrl) {
    // Try to close modal first
    const closeButtons = [
      '[aria-label="Close"]',
      '[aria-label="close"]',
      'div[role="dialog"] div[role="button"]:first-child',
      'div[aria-label="Close"][role="button"]',
    ];
    
    for (const sel of closeButtons) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        await sleep(300);
        return;
      }
    }
    
    // If no close button found and URL changed, go back
    if (window.location.href !== originalUrl) {
      window.history.back();
      await sleep(500);
    }
    
    // Press Escape as fallback
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 }));
    await sleep(300);
  }

  // ============= END DEEP IMAGE EXTRACTION =============

  // Find listing tiles by locating price nodes ($xx) then climbing to a "card"
  function getListingElements() {
    const containers = new Set();

    // Price nodes are the strongest signal on this page
    const priceSpans = Array.from(document.querySelectorAll('span[dir="auto"]'))
      .filter((s) => /\$\s*[\d,]+(?:\.\d{2})?/.test(getVisibleText(s)));

    console.log(`FB Importer: Price spans found: ${priceSpans.length}`);

    for (const priceEl of priceSpans) {
      let card = priceEl;

      // climb up to find a reasonable "tile"
      for (let i = 0; i < 10 && card; i++) {
        const rect = card.getBoundingClientRect?.();
        const okSize = rect && rect.width > 180 && rect.height > 120 && rect.height < 950;

        const hasText = getVisibleText(card).length > 10;
        const hasImg = !!card.querySelector("img[src]") || !!extractBackgroundImageUrl(card);

        const isClickable =
          card.getAttribute?.("role") === "link" ||
          card.getAttribute?.("role") === "button" ||
          card.tagName === "A";

        if (okSize && hasText && hasImg) {
          containers.add(card);
          break;
        }

        if (okSize && hasText && isClickable) {
          containers.add(card);
          break;
        }

        card = card.parentElement;
      }
    }

    // fallback: include role=link that contains price somewhere
    if (containers.size === 0) {
      const roleLinks = Array.from(document.querySelectorAll('[role="link"], [role="button"]'));
      const candidates = roleLinks.filter((el) => /\$\s*[\d,]+(?:\.\d{2})?/.test(getVisibleText(el)));
      console.log(`FB Importer: role=link/button candidates with price: ${candidates.length}`);
      candidates.forEach((c) => containers.add(c));
    }

    console.log(`FB Importer: Total containers found: ${containers.size}`);
    return Array.from(containers);
  }

  function extractListingData(tile) {
    try {
      // ID: try hrefs, then attributes
      let listingUrl = null;
      let facebookId = null;

      const a = tile.querySelector('a[href]') || (tile.tagName === "A" ? tile : null);
      if (a?.href) {
        facebookId = extractListingIdFromUrl(a.href);
        listingUrl = a.href;
      }

      if (!facebookId) {
        const possible = findAnyMarketplaceUrlInElement(tile);
        facebookId = extractListingIdFromUrl(possible) || extractIdFromAnyString(possible);
      }

      if (!facebookId) {
        // Facebook Selling dashboard often hides IDs in DOM.
        // Create a stable fallback id from title+price+image.
        const fallbackTitle =
          (tile.querySelector('[role="heading"]')?.textContent || tile.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120);

        const txt = (tile.textContent || "").replace(/\s+/g, " ");
        const pm = txt.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
        const fallbackPrice = pm ? pm[1].replace(/,/g, "") : "";

        const img = tile.querySelector("img[src]")?.src || extractBackgroundImageUrl(tile) || "";

        // simple hash
        const raw = `${fallbackTitle}||${fallbackPrice}||${img}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
          hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
        }

        facebookId = `dom_${Math.abs(hash)}`;
        listingUrl = "";
      }

      if (!listingUrl) listingUrl = facebookId.startsWith("dom_") ? "" : `https://www.facebook.com/marketplace/item/${facebookId}`;

      // Title
      let title = "";
      const heading = tile.querySelector('[role="heading"]');
      if (heading) title = getVisibleText(heading);

      if (!title) {
        const spans = Array.from(tile.querySelectorAll('span[dir="auto"]'))
          .map((s) => getVisibleText(s))
          .filter((t) => t && t.length > 3 && t.length < 200 && !/^\$[\d,]+/.test(t));
        title = spans[0] || "";
      }

      title = title.replace(/\s+/g, " ").trim();
      if (!title || title.length < 3) return null;

      // Price
      let price = null;
      const txt = getVisibleText(tile);
      const pm = txt.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (pm) price = parseFloat(pm[1].replace(/,/g, ""));

      // Images (just thumbnail for now - deep extraction happens later)
      const images = [];
      const img = tile.querySelector("img[src]");
      if (img?.src) images.push(img.src);
      const bg = extractBackgroundImageUrl(tile);
      if (images.length === 0 && bg) images.push(bg);

      return {
        facebook_id: String(facebookId),
        title: title.substring(0, 255),
        price: Number.isFinite(price) ? price : null,
        images: images.slice(0, 10),
        listing_url: listingUrl,
        status: "active",
        imported_at: new Date().toISOString(),
        // DOM extraction doesn't have these - GraphQL will fill them
        description: null,
        condition: null,
        category: null,
        location: null,
        // Reference to tile for deep extraction
        _tile: tile,
      };
    } catch (e) {
      console.error("FB Importer: extractListingData error", e);
      return null;
    }
  }

  async function collectAllListings() {
    const listings = [];
    const seen = new Set();

    let lastHeight = 0;
    let noNew = 0;

    console.log("FB Importer: Starting to collect listings...");
    console.log("FB Importer: URL:", window.location.href);
    console.log(`FB Importer: GraphQL already captured: ${capturedListings.size}`);

    // Phase 1: Scroll and collect all listing tiles
    updateStatus("Phase 1: Scanning all listings...");
    
    while (noNew < 4) {
      // DOM extraction (fallback)
      const tiles = getListingElements();

      for (const t of tiles) {
        const data = extractListingData(t);
        if (data?.facebook_id && !seen.has(data.facebook_id)) {
          seen.add(data.facebook_id);
          listings.push(data);
        }
      }

      const newCapturedSize = capturedListings.size;
      updateStatus(`Scanning: ${listings.length} DOM, ${newCapturedSize} GraphQL`);

      // Scroll to trigger lazy load and more GraphQL calls
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(2000);

      const h = document.documentElement.scrollHeight;
      
      // Stop if both scroll height and GraphQL captures stop increasing
      if (h === lastHeight && newCapturedSize === lastCapturedSize) {
        noNew++;
        console.log(`FB Importer: No new content (attempt ${noNew}/4)`);
      } else {
        noNew = 0;
        lastHeight = h;
        lastCapturedSize = newCapturedSize;
      }
    }

    // Merge GraphQL captured listings - these have full data (description, condition, etc.)
    // GraphQL data takes priority because it has more fields
    for (const [id, gqlListing] of capturedListings) {
      const existingIndex = listings.findIndex(l => l.facebook_id === id);
      if (existingIndex >= 0) {
        // Merge: GraphQL data overwrites DOM data, keep tile reference
        const tile = listings[existingIndex]._tile;
        listings[existingIndex] = { ...listings[existingIndex], ...gqlListing, _tile: tile };
      } else if (!seen.has(id)) {
        seen.add(id);
        listings.push(gqlListing);
      }
    }

    console.log(`FB Importer: === PHASE 1 COMPLETE ===`);
    console.log(`  Total listings found: ${listings.length}`);
    
    // Phase 2: Deep image extraction for listings with only 1 image
    // Skip if GraphQL captured full image arrays
    const needsDeepExtraction = listings.filter(l => 
      l._tile && 
      (!l.images || l.images.length <= 1) && 
      !capturedListings.has(l.facebook_id)
    );

    if (needsDeepExtraction.length > 0) {
      console.log(`FB Importer: === PHASE 2: Deep image extraction for ${needsDeepExtraction.length} listings ===`);
      updateStatus(`Phase 2: Extracting images (0/${needsDeepExtraction.length})...`);
      
      // Scroll back to top first
      window.scrollTo(0, 0);
      await sleep(1000);
      
      let extractedCount = 0;
      let totalImagesExtracted = 0;
      
      for (const listing of needsDeepExtraction) {
        extractedCount++;
        updateStatus(`Extracting images: ${extractedCount}/${needsDeepExtraction.length} - "${listing.title?.slice(0, 25)}..."`);
        
        const fullImages = await extractFullImagesFromTile(listing._tile, listing.title);
        
        if (fullImages && fullImages.length > 0) {
          listing.images = fullImages;
          totalImagesExtracted += fullImages.length;
        }
        
        // Small delay between extractions to avoid rate limiting
        await sleep(800);
      }
      
      console.log(`FB Importer: Deep extraction complete. Total images: ${totalImagesExtracted}`);
      updateStatus(`Extracted ${totalImagesExtracted} images from ${needsDeepExtraction.length} listings`);
      await sleep(1000);
    }

    // Clean up tile references before returning
    for (const listing of listings) {
      delete listing._tile;
    }

    console.log(`FB Importer: === FINAL RESULTS ===`);
    console.log(`  DOM-based: ${listings.length - capturedListings.size}`);
    console.log(`  GraphQL captured: ${capturedListings.size}`);
    console.log(`  Total unique: ${listings.length}`);

    // Log what data we have
    const withDesc = listings.filter(l => l.description).length;
    const withCondition = listings.filter(l => l.condition).length;
    const withCategory = listings.filter(l => l.category).length;
    const avgImages = listings.reduce((sum, l) => sum + (l.images?.length || 0), 0) / listings.length;
    console.log(`  With description: ${withDesc}, With condition: ${withCondition}, With category: ${withCategory}`);
    console.log(`  Average images per listing: ${avgImages.toFixed(1)}`);

    return listings;
  }

  async function saveListing(listing) {
    try {
      // Clean up the listing object - only send fields the DB accepts
      const payload = {
        facebook_id: listing.facebook_id,
        title: listing.title,
        price: listing.price,
        description: listing.description || null,
        condition: listing.condition || null,
        category: listing.category || null,
        location: listing.location || null,
        images: listing.images || [],
        listing_url: listing.listing_url || null,
        status: listing.status || "active",
        imported_at: listing.imported_at || new Date().toISOString(),
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("FB Importer: Save error:", err);
        return false;
      }
      return true;
    } catch (e) {
      console.error("FB Importer: Network error:", e);
      return false;
    }
  }

  async function startImport() {
    if (isImporting) return;

    isImporting = true;
    importedCount = 0;

    const button = document.querySelector("#fb-importer-button");
    const progress = document.querySelector("#fb-importer-progress");
    const countSpan = document.querySelector("#import-count");
    const totalSpan = document.querySelector("#import-total");
    const progressFill = document.querySelector("#progress-fill");

    button.disabled = true;
    button.innerHTML = "Scanning listings...";

    try {
      const listings = await collectAllListings();
      totalCount = listings.length;

      if (totalCount === 0) {
        button.innerHTML = "No listings found";
        button.disabled = false;
        isImporting = false;
        return;
      }

      progress.style.display = "block";
      totalSpan.textContent = String(totalCount);
      button.innerHTML = "Importing...";
      updateStatus("Phase 3: Saving to database...");

      for (const item of listings) {
        const ok = await saveListing(item);
        if (ok) {
          importedCount++;
          countSpan.textContent = String(importedCount);
          progressFill.style.width = `${(importedCount / totalCount) * 100}%`;
        }
        await sleep(120);
      }

      button.innerHTML = `✓ Imported ${importedCount}`;
      button.classList.add("success");
      
      const totalImages = listings.reduce((sum, l) => sum + (l.images?.length || 0), 0);
      updateStatus(`Complete! ${importedCount} listings, ${totalImages} images`);

      chrome.storage.local.set({
        lastImport: {
          count: importedCount,
          date: new Date().toISOString(),
        },
      });

      setTimeout(() => {
        button.disabled = false;
        button.classList.remove("success");
        button.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Import All Listings
        `;
        progress.style.display = "none";
        document.querySelector("#fb-importer-status").style.display = "none";
        isImporting = false;
      }, 5000);
    } catch (e) {
      console.error("FB Importer: Import error:", e);
      button.innerHTML = "Error - Try Again";
      button.disabled = false;
      isImporting = false;
    }
  }

  function init() {
    if (window.location.href.includes("facebook.com/marketplace/you")) {
      console.log(`FB Importer v${EXTENSION_VERSION}: Detected page, initializing...`);
      
      // Inject GraphQL interceptor FIRST to start capturing network data
      injectGraphQLInterceptor();
      
      setTimeout(createImportButton, 2000);
    }
  }

  init();

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("FB Importer: URL changed, re-init...");
      setTimeout(init, 1200);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
