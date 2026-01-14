// FB Marketplace Importer - Content Script for Your Listings Page
// Version 1.2.7 - GraphQL-first architecture, no duplicate IDs, enhanced title extraction
(function () {
  "use strict";

  const EXTENSION_VERSION = "1.2.7";

  const SUPABASE_URL = "https://dluabbbrdhvspbjmckuf.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4";

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;
  let selectedAccount = "MBFB"; // Default account

  // GraphQL captured listings (includes description, condition, category)
  const capturedListings = new Map();
  let lastCapturedSize = 0;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Load selected account from storage
  async function loadSelectedAccount() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["selectedAccount", "accountConfigured"], (result) => {
        if (!result.accountConfigured) {
          // First-time user - show warning in console
          console.warn(`FB Importer v${EXTENSION_VERSION}: Account not configured! Please open extension popup and select account first.`);
        }
        selectedAccount = result.selectedAccount || "MBFB";
        console.log(`FB Importer v${EXTENSION_VERSION}: Account loaded: ${selectedAccount}`);
        resolve(selectedAccount);
      });
    });
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

    const accountClass = selectedAccount === "MBFB" ? "mbfb" : "cmfb";
    const accountColor = selectedAccount === "MBFB" ? "#3b82f6" : "#a855f7";

    const container = document.createElement("div");
    container.id = "fb-importer-container";
    container.innerHTML = `
      <div id="fb-importer-account-badge" class="fb-importer-account-badge ${accountClass}">
        ● IMPORTING TO: ${selectedAccount}
      </div>
      <button id="fb-importer-button" class="fb-importer-btn ${accountClass}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        Import All Listings
      </button>
      <div id="fb-importer-version" class="fb-importer-version">v${EXTENSION_VERSION}</div>
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

    // Add account badge styles with larger, more visible badge
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
    `;
    document.head.appendChild(style);

    console.log(`FB Importer v${EXTENSION_VERSION}: Button created for account ${selectedAccount}`);
  }

  function updateStatus(text) {
    const status = document.querySelector("#fb-importer-status");
    if (status) {
      status.style.display = "block";
      status.textContent = text;
    }
    console.log(`FB Importer: ${text}`);
  }

  // ============= GRAPHQL-FIRST COLLECTION =============
  // NO more DOM ID extraction - GraphQL is the source of truth
  // DOM is only used for scroll detection as a fallback

  async function collectAllListings() {
    console.log("FB Importer: === STARTING GRAPHQL-FIRST COLLECTION ===");
    console.log("FB Importer: URL:", window.location.href);
    console.log(`FB Importer: Account: ${selectedAccount}`);
    console.log(`FB Importer: GraphQL already captured: ${capturedListings.size}`);

    // Phase 1: Scroll to trigger ALL GraphQL responses
    updateStatus(`Scrolling to load all ${selectedAccount} listings...`);
    
    let noGrowth = 0;
    let lastHeight = 0;
    let lastCapturedCount = 0;
    
    // More patience - wait for GraphQL captures to stop growing
    while (noGrowth < 6) {
      // Scroll to trigger lazy load and GraphQL calls
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(2500);

      const currentHeight = document.documentElement.scrollHeight;
      const currentCapturedCount = capturedListings.size;
      
      updateStatus(`Scanning: ${currentCapturedCount} listings captured via GraphQL...`);

      // Stop only when BOTH scroll height AND GraphQL captures stop growing
      if (currentHeight === lastHeight && currentCapturedCount === lastCapturedCount) {
        noGrowth++;
        console.log(`FB Importer: No new content (attempt ${noGrowth}/6)`);
      } else {
        noGrowth = 0;
        lastHeight = currentHeight;
        lastCapturedCount = currentCapturedCount;
      }
    }

    console.log(`FB Importer: Scroll complete. GraphQL captured: ${capturedListings.size} listings`);

    // Phase 2: Convert GraphQL captured listings to array
    // ONLY use GraphQL data - no DOM ID extraction
    const listings = Array.from(capturedListings.values()).map(gql => ({
      ...gql,
      account_tag: selectedAccount,
      source: 'graphql'
    }));

    console.log(`FB Importer: === PHASE 1 COMPLETE ===`);
    console.log(`  GraphQL captured: ${listings.length}`);
    console.log(`  Account: ${selectedAccount}`);

    // Phase 3: If GraphQL captured ZERO, show warning (but don't fall back to bad DOM extraction)
    if (listings.length === 0) {
      console.warn('FB Importer: GraphQL captured 0 listings!');
      console.warn('FB Importer: Possible causes:');
      console.warn('  - Page not fully loaded');
      console.warn('  - Facebook changed their GraphQL structure');
      console.warn('  - Extension not properly injected');
      updateStatus('⚠️ No listings found. Try scrolling manually first, then re-import.');
    }

    // Log data quality stats
    const withDesc = listings.filter(l => l.description).length;
    const withCondition = listings.filter(l => l.condition).length;
    const withCategory = listings.filter(l => l.category).length;
    const withMultipleImages = listings.filter(l => l.images && l.images.length > 1).length;
    const avgImages = listings.length > 0 
      ? listings.reduce((sum, l) => sum + (l.images?.length || 0), 0) / listings.length 
      : 0;

    console.log(`FB Importer: === DATA QUALITY ===`);
    console.log(`  With description: ${withDesc}/${listings.length}`);
    console.log(`  With condition: ${withCondition}/${listings.length}`);
    console.log(`  With category: ${withCategory}/${listings.length}`);
    console.log(`  With multiple images: ${withMultipleImages}/${listings.length}`);
    console.log(`  Average images per listing: ${avgImages.toFixed(1)}`);

    // Check for any H_ hash IDs (should be ZERO with GraphQL-first)
    const hashIds = listings.filter(l => l.facebook_id?.startsWith('H_'));
    if (hashIds.length > 0) {
      console.warn(`FB Importer: WARNING - Found ${hashIds.length} hash IDs. This shouldn't happen!`);
    }

    return listings;
  }

  async function saveListing(listing) {
    try {
      // Clean up the listing object - only send fields the DB accepts
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
        source: listing.source || 'graphql',
        last_seen_at: new Date().toISOString(),
      };

      // Use proper upsert with composite unique constraint
      // on_conflict=account_tag,facebook_id ensures updates instead of duplicates
      const res = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings?on_conflict=account_tag,facebook_id`, {
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

    // Reload account selection in case it changed
    await loadSelectedAccount();

    isImporting = true;
    importedCount = 0;

    const button = document.querySelector("#fb-importer-button");
    const progress = document.querySelector("#fb-importer-progress");
    const progressFill = document.querySelector("#progress-fill");

    // Update progress text with account name
    progress.querySelector('.progress-text').innerHTML = 
      `Importing to <strong>${selectedAccount}</strong>: <span id="import-count">0</span> / <span id="import-total">0</span>`;

    button.disabled = true;
    button.innerHTML = `Scanning listings for ${selectedAccount}...`;

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
      document.querySelector("#import-total").textContent = String(totalCount);
      button.innerHTML = `Importing to ${selectedAccount}...`;
      updateStatus(`Saving ${totalCount} listings to ${selectedAccount} database...`);

      for (const item of listings) {
        const ok = await saveListing(item);
        if (ok) {
          importedCount++;
          document.querySelector("#import-count").textContent = String(importedCount);
          progressFill.style.width = `${(importedCount / totalCount) * 100}%`;
        }
        await sleep(100);
      }

      button.innerHTML = `✓ ${selectedAccount}: ${importedCount} saved`;
      button.classList.add("success");
      
      const totalImages = listings.reduce((sum, l) => sum + (l.images?.length || 0), 0);
      updateStatus(`Complete! ${selectedAccount}: ${importedCount} listings, ${totalImages} images`);

      // Update storage with import count
      chrome.storage.local.get(['totalImported'], (result) => {
        const currentTotal = result.totalImported || 0;
        chrome.storage.local.set({
          lastImport: {
            count: importedCount,
            account: selectedAccount,
            date: new Date().toISOString(),
          },
          totalImported: currentTotal + importedCount,
        });
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

  async function init() {
    if (window.location.href.includes("facebook.com/marketplace/you")) {
      // Load account first
      await loadSelectedAccount();
      
      console.log(`FB Importer v${EXTENSION_VERSION}: Detected page, initializing for ${selectedAccount}...`);
      
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
