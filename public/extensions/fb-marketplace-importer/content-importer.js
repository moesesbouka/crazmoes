// FB Marketplace Importer - Content Script for Your Listings Page
// Version 2.0.0 - BULLETPROOF EDITION
// Key improvements:
// - Better scroll detection with momentum tracking
// - Improved duplicate prevention
// - Enhanced error recovery
// - Real-time capture feedback
(function () {
  "use strict";

  const EXTENSION_VERSION = "2.0.1";

  const SUPABASE_URL = "https://dluabbbrdhvspbjmckuf.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4";

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;
  let selectedAccount = "MBFB";

  // GraphQL captured listings Map
  const capturedListings = new Map();
  let interceptorReady = false;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Load selected account from storage
  async function loadSelectedAccount() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["selectedAccount", "accountConfigured"], (result) => {
        if (!result.accountConfigured) {
          console.warn(`FB Importer v${EXTENSION_VERSION}: Account not configured! Open popup first.`);
        }
        selectedAccount = result.selectedAccount || "MBFB";
        console.log(`FB Importer v${EXTENSION_VERSION}: Account: ${selectedAccount}`);
        resolve(selectedAccount);
      });
    });
  }

  // Inject the page-context GraphQL interceptor
  function injectGraphQLInterceptor() {
    if (window.__fbImporterGraphqlInjected) {
      console.log("FB Importer: Interceptor already injected");
      return;
    }
    window.__fbImporterGraphqlInjected = true;

    console.log(`%cFB Importer v${EXTENSION_VERSION}`, 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log("FB Importer: Injecting GraphQL interceptor into page context...");

    // Listen for messages from the injected page script
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || msg.source !== "fb-importer") return;

      if (msg.type === "READY") {
        interceptorReady = true;
        console.log(`FB Importer: GraphQL interceptor v${msg.version || '?'} is READY`);
      }

      if (msg.type === "LISTING") {
        const listing = msg.payload;
        if (listing && listing.facebook_id) {
          // Check for duplicates
          if (!capturedListings.has(listing.facebook_id)) {
            capturedListings.set(listing.facebook_id, listing);
            // Update live counter if visible
            updateLiveCounter();
          }
        }
      }
    });

    // Inject the script into page context using web_accessible_resources
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("page-graphql-interceptor.js");
    script.onload = () => {
      script.remove();
      console.log("FB Importer: Interceptor script injected successfully");
    };
    script.onerror = (e) => {
      console.error("FB Importer: Failed to inject interceptor script!", e);
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function updateLiveCounter() {
    const liveCounter = document.querySelector("#fb-importer-live-count");
    if (liveCounter) {
      liveCounter.textContent = capturedListings.size;
    }
  }

  function createImportButton() {
    if (document.querySelector("#fb-importer-button")) return;

    const accountClass = selectedAccount === "MBFB" ? "mbfb" : "cmfb";

    const container = document.createElement("div");
    container.id = "fb-importer-container";
    container.innerHTML = `
      <div id="fb-importer-account-badge" class="fb-importer-account-badge ${accountClass}">
        ● IMPORTING TO: ${selectedAccount}
      </div>
      <div id="fb-importer-live-capture" class="fb-importer-live-capture">
        <span class="pulse-dot"></span>
        Listings Detected: <strong id="fb-importer-live-count">${capturedListings.size}</strong>
      </div>
      <button id="fb-importer-button" class="fb-importer-btn ${accountClass}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        Import All Listings
      </button>
      <div id="fb-importer-version" class="fb-importer-version">v${EXTENSION_VERSION} BULLETPROOF</div>
      <div id="fb-importer-progress" class="fb-importer-progress" style="display:none;">
        <div class="progress-text">Importing to <strong>${selectedAccount}</strong>: <span id="import-count">0</span> / <span id="import-total">0</span></div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>
      <div id="fb-importer-status" class="fb-importer-status" style="display:none;"></div>
    `;

    document.body.appendChild(container);
    document.querySelector("#fb-importer-button").addEventListener("click", startImport);

    // Enhanced styles
    const style = document.createElement("style");
    style.textContent = `
      .fb-importer-account-badge {
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 10px;
        display: inline-block;
        letter-spacing: 0.5px;
      }
      .fb-importer-account-badge.mbfb {
        background: rgba(59, 130, 246, 0.3);
        border: 2px solid rgba(59, 130, 246, 0.6);
        color: #60a5fa;
      }
      .fb-importer-account-badge.cmfb {
        background: rgba(168, 85, 247, 0.3);
        border: 2px solid rgba(168, 85, 247, 0.6);
        color: #c084fc;
      }
      .fb-importer-btn.mbfb {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      }
      .fb-importer-btn.cmfb {
        background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%) !important;
      }
      .fb-importer-live-capture {
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.4);
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        color: #34d399;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pulse-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);

    console.log(`FB Importer v${EXTENSION_VERSION}: Button created for ${selectedAccount}`);
  }

  function updateStatus(text) {
    const status = document.querySelector("#fb-importer-status");
    if (status) {
      status.style.display = "block";
      status.textContent = text;
    }
    console.log(`FB Importer: ${text}`);
  }

  // ============= IMPROVED COLLECTION WITH MOMENTUM DETECTION =============
  async function collectAllListings() {
    console.log("%c=== FB IMPORTER v2.0.1 DIAGNOSTIC MODE ===", "color: #f59e0b; font-weight: bold; font-size: 16px");
    console.log("FB Importer: URL:", window.location.href);
    console.log(`FB Importer: Account: ${selectedAccount}`);
    console.log(`FB Importer: Already captured: ${capturedListings.size}`);
    console.log(`FB Importer: Interceptor ready: ${interceptorReady}`);

    updateStatus(`Scrolling to capture all ${selectedAccount} listings...`);

    // Wait for interceptor to be ready
    if (!interceptorReady) {
      console.log("FB Importer: ⏳ Waiting for interceptor to initialize...");
      await sleep(2000);
      console.log(`FB Importer: Interceptor status after wait: ${interceptorReady}`);
    }

    // Phase 1: Aggressive scrolling to trigger ALL GraphQL pagination
    let noNewData = 0;
    let lastHeight = 0;
    let lastCapturedCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Safety limit
    let lastError = null;

    // Clear any old captures from different page loads
    const startingCount = capturedListings.size;
    console.log(`FB Importer: Starting collection with ${startingCount} pre-captured listings`);

    while (noNewData < 8 && scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      
      try {
        // Scroll with slight randomization to avoid detection
        const scrollVariation = Math.random() * 200;
        const targetScroll = document.documentElement.scrollHeight + scrollVariation;
        
        console.log(`FB Importer: [Scroll #${scrollAttempts}] Scrolling to ${Math.round(targetScroll)}px`);
        window.scrollTo(0, targetScroll);
        
        // Also try scrolling specific containers (FB sometimes uses these)
        try {
          const mainContent = document.querySelector('[role="main"]');
          if (mainContent) {
            mainContent.scrollTop = mainContent.scrollHeight;
          }
        } catch (containerErr) {
          console.warn(`FB Importer: Container scroll failed:`, containerErr.message);
        }

        await sleep(2000 + Math.random() * 500); // Variable delay

        const currentHeight = document.documentElement.scrollHeight;
        const currentCapturedCount = capturedListings.size;

        console.log(`FB Importer: [Scroll #${scrollAttempts}] Captured: ${currentCapturedCount}, Height: ${currentHeight}`);
        updateStatus(`Scanning... ${currentCapturedCount} listings captured (scroll #${scrollAttempts})`);
        updateLiveCounter();

        // Check for new data
        if (currentHeight === lastHeight && currentCapturedCount === lastCapturedCount) {
          noNewData++;
          console.log(`FB Importer: ⚠️ No new content (stall ${noNewData}/8)`);
          
          // Try clicking "See More" or load more buttons
          try {
            const loadMoreButtons = document.querySelectorAll('[aria-label*="more"], [aria-label*="More"]');
            console.log(`FB Importer: Found ${loadMoreButtons.length} potential load-more buttons`);
            for (const btn of loadMoreButtons) {
              try {
                btn.click();
                await sleep(1000);
              } catch (btnErr) {
                // Ignore individual button click errors
              }
            }
          } catch (btnSearchErr) {
            console.warn(`FB Importer: Button search failed:`, btnSearchErr.message);
          }
        } else {
          noNewData = 0;
          lastHeight = currentHeight;
          lastCapturedCount = currentCapturedCount;
        }
      } catch (scrollErr) {
        lastError = scrollErr;
        console.error(`FB Importer: ❌ SCROLL ERROR at attempt #${scrollAttempts}:`, scrollErr);
        console.error(`FB Importer: Error stack:`, scrollErr.stack);
        console.error(`FB Importer: Current state - Captured: ${capturedListings.size}, noNewData: ${noNewData}`);
        
        // Try to continue despite error
        noNewData++;
        if (noNewData >= 8) {
          console.warn(`FB Importer: Too many errors, stopping scroll loop`);
          break;
        }
        await sleep(1000);
      }
    }
    
    console.log(`FB Importer: Scroll loop exited - attempts: ${scrollAttempts}, stalls: ${noNewData}, lastError: ${lastError?.message || 'none'}`);
    

    // Scroll back to top safely
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      console.warn("FB Importer: Could not scroll to top:", e.message);
    }

    console.log("%c=== SCROLL PHASE COMPLETE ===", "color: #10b981; font-weight: bold");
    console.log(`FB Importer: Total scroll attempts: ${scrollAttempts}`);
    console.log(`FB Importer: Total GraphQL captured: ${capturedListings.size} listings`);
    console.log(`FB Importer: Last error: ${lastError?.message || 'none'}`);

    // Phase 2: Convert to array with account tag
    let listings = [];
    try {
      listings = Array.from(capturedListings.values()).map((gql) => ({
        ...gql,
        account_tag: selectedAccount,
        source: "graphql",
      }));
    } catch (mapErr) {
      console.error("FB Importer: ❌ Failed to convert listings:", mapErr);
      return [];
    }

    // Log data quality stats
    const withDesc = listings.filter((l) => l.description).length;
    const withImages = listings.filter((l) => l.images && l.images.length > 0).length;
    const withMultipleImages = listings.filter((l) => l.images && l.images.length > 1).length;
    const avgImages = listings.length > 0
      ? listings.reduce((sum, l) => sum + (l.images?.length || 0), 0) / listings.length
      : 0;

    console.log(`%c=== DATA QUALITY REPORT ===`, "color: #3b82f6; font-weight: bold");
    console.log(`  Total listings: ${listings.length}`);
    console.log(`  With description: ${withDesc}/${listings.length} (${Math.round((withDesc/listings.length)*100) || 0}%)`);
    console.log(`  With images: ${withImages}/${listings.length} (${Math.round((withImages/listings.length)*100) || 0}%)`);
    console.log(`  With 2+ images: ${withMultipleImages}/${listings.length}`);
    console.log(`  Average images: ${avgImages.toFixed(1)}`);

    if (listings.length === 0) {
      console.warn("FB Importer: ⚠️ No listings captured!");
      console.warn("Troubleshooting:");
      console.warn("  1. Make sure you're on facebook.com/marketplace/you/selling");
      console.warn("  2. Try scrolling manually first, then click Import");
      console.warn("  3. Check browser console for interceptor errors");
      updateStatus("⚠️ No listings found. Try scrolling manually first.");
    }

    return listings;
  }

  async function saveListing(listing) {
    try {
      const payload = {
        facebook_id: listing.facebook_id,
        account_tag: listing.account_tag || selectedAccount,
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
        source: listing.source || "graphql",
        last_seen_at: new Date().toISOString(),
      };

      // Upsert using composite unique constraint
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/marketplace_listings?on_conflict=account_tag,facebook_id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(payload),
        }
      );

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

    // Reload account in case it changed
    await loadSelectedAccount();

    isImporting = true;
    importedCount = 0;

    const button = document.querySelector("#fb-importer-button");
    const progress = document.querySelector("#fb-importer-progress");
    const progressFill = document.querySelector("#progress-fill");
    const liveCapture = document.querySelector("#fb-importer-live-capture");

    // Hide live capture during import
    if (liveCapture) liveCapture.style.display = "none";

    // Update progress text
    progress.querySelector(".progress-text").innerHTML =
      `Importing to <strong>${selectedAccount}</strong>: <span id="import-count">0</span> / <span id="import-total">0</span>`;

    button.disabled = true;
    button.innerHTML = `Scanning ${selectedAccount} listings...`;

    try {
      const listings = await collectAllListings();
      totalCount = listings.length;

      if (totalCount === 0) {
        button.innerHTML = "No listings found - try scrolling first";
        button.disabled = false;
        isImporting = false;
        if (liveCapture) liveCapture.style.display = "flex";
        return;
      }

      progress.style.display = "block";
      document.querySelector("#import-total").textContent = String(totalCount);
      button.innerHTML = `Saving to ${selectedAccount}...`;
      updateStatus(`Saving ${totalCount} listings to ${selectedAccount}...`);

      // Batch save with progress
      let successCount = 0;
      let errorCount = 0;

      for (const item of listings) {
        const ok = await saveListing(item);
        if (ok) {
          successCount++;
          importedCount++;
        } else {
          errorCount++;
        }
        
        document.querySelector("#import-count").textContent = String(importedCount);
        progressFill.style.width = `${((successCount + errorCount) / totalCount) * 100}%`;
        
        // Small delay to avoid rate limiting
        await sleep(80);
      }

      // Success state
      button.innerHTML = `✓ ${selectedAccount}: ${successCount} saved`;
      button.classList.add("success");

      const totalImages = listings.reduce((sum, l) => sum + (l.images?.length || 0), 0);
      updateStatus(`Complete! ${successCount}/${totalCount} saved, ${totalImages} images captured`);

      // Update storage stats
      chrome.storage.local.get(["totalImported"], (result) => {
        const currentTotal = result.totalImported || 0;
        chrome.storage.local.set({
          lastImport: {
            count: successCount,
            account: selectedAccount,
            date: new Date().toISOString(),
            errors: errorCount,
          },
          totalImported: currentTotal + successCount,
        });
      });

      // Reset after delay
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
        if (liveCapture) liveCapture.style.display = "flex";
        isImporting = false;
        
        // Clear captured listings for fresh next run
        capturedListings.clear();
        updateLiveCounter();
      }, 5000);

    } catch (e) {
      console.error("FB Importer: Import error:", e);
      button.innerHTML = "Error - Try Again";
      button.disabled = false;
      if (liveCapture) liveCapture.style.display = "flex";
      isImporting = false;
    }
  }

  // ============= INITIALIZATION =============
  async function init() {
    // Check if we're on the correct page
    const url = window.location.href;
    const isYourListings = url.includes("facebook.com/marketplace/you");
    
    if (!isYourListings) {
      console.log("FB Importer: Not on Your Listings page, skipping...");
      return;
    }

    // Load account first
    await loadSelectedAccount();

    console.log(`FB Importer v${EXTENSION_VERSION}: Initializing for ${selectedAccount}...`);

    // Inject GraphQL interceptor FIRST (before any network requests)
    injectGraphQLInterceptor();

    // Create button after a short delay for page to settle
    setTimeout(createImportButton, 1500);
  }

  // Start initialization
  init();

  // Watch for URL changes (FB is a SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("FB Importer: URL changed, re-initializing...");
      capturedListings.clear();
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
