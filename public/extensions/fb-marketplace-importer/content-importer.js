// FB Marketplace Importer - Content Script for Your Listings Page
// Version 2.1.0 - DIAGNOSTIC DASHBOARD EDITION
// Key improvements:
// - Visual progress dashboard with real-time stats
// - Activity log showing what's happening
// - Elapsed timer and phase tracking
// - Better error visibility
(function () {
  "use strict";

  const EXTENSION_VERSION = "2.2.0";

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

  // Dashboard state
  let currentPhase = "idle"; // idle, scanning, saving, complete, error
  let startTime = null;
  let elapsedTimer = null;
  let activityLog = [];
  let errorLog = [];

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Load selected account from storage
  async function loadSelectedAccount() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["selectedAccount", "accountConfigured"], (result) => {
        if (!result.accountConfigured) {
          console.warn(`FB Importer v${EXTENSION_VERSION}: Account not configured! Open popup first.`);
          addActivity("⚠️ Account not configured - open popup first");
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
    addActivity("🔧 Injecting GraphQL interceptor...");

    // Listen for messages from the injected page script
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || msg.source !== "fb-importer") return;

      if (msg.type === "READY") {
        interceptorReady = true;
        console.log(`FB Importer: GraphQL interceptor v${msg.version || '?'} is READY`);
        addActivity(`✓ Interceptor v${msg.version || '?'} ready`);
        updateDashboard();
      }

      if (msg.type === "LISTING") {
        const listing = msg.payload;
        if (listing && listing.facebook_id) {
          // Check for duplicates
          if (!capturedListings.has(listing.facebook_id)) {
            capturedListings.set(listing.facebook_id, listing);
            updateDashboard();
            
            // Show activity for first few listings
            if (capturedListings.size <= 5) {
              addActivity(`📦 Found: "${listing.title?.slice(0, 30)}..."`);
            } else if (capturedListings.size % 10 === 0) {
              addActivity(`📦 ${capturedListings.size} listings detected`);
            }
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
      addActivity("❌ Failed to inject interceptor!");
      addError("Interceptor injection failed - try refreshing the page");
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function addActivity(text) {
    activityLog.unshift({ text, time: Date.now() });
    if (activityLog.length > 8) activityLog.pop();
    updateActivityLog();
  }

  function addError(text) {
    errorLog.push({ text, time: Date.now() });
    updateErrorPanel();
  }

  function clearErrors() {
    errorLog = [];
    updateErrorPanel();
  }

  function formatElapsed(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function startElapsedTimer() {
    startTime = Date.now();
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = setInterval(() => {
      const el = document.querySelector("#fb-importer-elapsed");
      if (el && startTime) {
        el.textContent = formatElapsed(Date.now() - startTime);
      }
    }, 1000);
  }

  function stopElapsedTimer() {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  }

  function updateActivityLog() {
    const logEl = document.querySelector("#fb-importer-activity-log");
    if (!logEl) return;
    
    logEl.innerHTML = activityLog.slice(0, 5).map(entry => 
      `<div class="activity-entry">${entry.text}</div>`
    ).join('');
  }

  function updateErrorPanel() {
    const countEl = document.querySelector("#fb-importer-error-count");
    const panelEl = document.querySelector("#fb-importer-error-list");
    
    if (countEl) countEl.textContent = errorLog.length;
    if (panelEl) {
      panelEl.innerHTML = errorLog.map(err => 
        `<div class="error-entry">• ${err.text}</div>`
      ).join('') || '<div class="error-entry success">No issues detected</div>';
    }
  }

  function updateDashboard() {
    // Update listings count
    const listingsCount = document.querySelector("#fb-importer-listings-count");
    if (listingsCount) listingsCount.textContent = capturedListings.size;

    // Update images count
    const imagesCount = document.querySelector("#fb-importer-images-count");
    if (imagesCount) {
      const totalImages = Array.from(capturedListings.values())
        .reduce((sum, l) => sum + (l.images?.length || 0), 0);
      imagesCount.textContent = totalImages;
    }

    // Update phase indicator
    const phaseEl = document.querySelector("#fb-importer-phase");
    const phaseDot = document.querySelector("#fb-importer-phase-dot");
    if (phaseEl) {
      const phaseLabels = {
        idle: "Ready to Import",
        scanning: "Scanning Listings",
        saving: "Saving to Database",
        complete: "Import Complete",
        error: "Error Occurred"
      };
      phaseEl.textContent = phaseLabels[currentPhase] || "Ready";
    }
    if (phaseDot) {
      phaseDot.className = `phase-dot ${currentPhase}`;
    }

    // Update interceptor status
    const interceptorEl = document.querySelector("#fb-importer-interceptor-status");
    if (interceptorEl) {
      interceptorEl.innerHTML = interceptorReady 
        ? '<span class="status-ok">●</span> Active' 
        : '<span class="status-pending">●</span> Initializing...';
    }
  }

  function createDashboard() {
    if (document.querySelector("#fb-importer-dashboard")) return;

    const accountClass = selectedAccount === "MBFB" ? "mbfb" : "cmfb";

    const container = document.createElement("div");
    container.id = "fb-importer-dashboard";
    container.innerHTML = `
      <div class="dashboard-header">
        <div class="dashboard-title">
          <span class="logo-icon">📦</span>
          <span class="title-text">FB Importer</span>
          <span class="version-badge">v${EXTENSION_VERSION}</span>
        </div>
        <div class="account-badge ${accountClass}">● ${selectedAccount}</div>
      </div>

      <div class="dashboard-phase">
        <div class="phase-row">
          <span id="fb-importer-phase-dot" class="phase-dot ${currentPhase}"></span>
          <span id="fb-importer-phase" class="phase-label">Ready to Import</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" id="fb-importer-progress-bar">
            <div class="progress-fill" id="fb-importer-progress-fill"></div>
          </div>
          <span class="progress-text" id="fb-importer-progress-text"></span>
        </div>
      </div>

      <div class="dashboard-stats">
        <div class="stat-box">
          <div class="stat-icon">✓</div>
          <div class="stat-content">
            <span class="stat-value" id="fb-importer-listings-count">${capturedListings.size}</span>
            <span class="stat-label">Listings</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">📸</div>
          <div class="stat-content">
            <span class="stat-value" id="fb-importer-images-count">0</span>
            <span class="stat-label">Images</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <span class="stat-value" id="fb-importer-elapsed">0:00</span>
            <span class="stat-label">Elapsed</span>
          </div>
        </div>
      </div>

      <div class="dashboard-interceptor">
        <span class="interceptor-label">Interceptor:</span>
        <span id="fb-importer-interceptor-status">
          <span class="status-pending">●</span> Initializing...
        </span>
      </div>

      <div class="dashboard-activity">
        <div class="section-header">📋 Activity Log</div>
        <div id="fb-importer-activity-log" class="activity-log">
          <div class="activity-entry">Waiting to start...</div>
        </div>
      </div>

      <div class="dashboard-errors">
        <div class="section-header">
          ⚠️ Issues: <span id="fb-importer-error-count">0</span>
        </div>
        <div id="fb-importer-error-list" class="error-list">
          <div class="error-entry success">No issues detected</div>
        </div>
      </div>

      <button id="fb-importer-button" class="dashboard-button ${accountClass}">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span class="button-text">Start Import</span>
      </button>
    `;

    document.body.appendChild(container);
    document.querySelector("#fb-importer-button").addEventListener("click", startImport);

    // Add dashboard styles
    const style = document.createElement("style");
    style.id = "fb-importer-dashboard-styles";
    style.textContent = `
      #fb-importer-dashboard {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 999999;
        width: 300px;
        background: linear-gradient(135deg, rgba(20, 20, 35, 0.98) 0%, rgba(25, 25, 45, 0.98) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #fff;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .dashboard-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .logo-icon {
        font-size: 20px;
      }

      .title-text {
        font-size: 15px;
        font-weight: 700;
      }

      .version-badge {
        font-size: 10px;
        background: rgba(16, 185, 129, 0.3);
        color: #10b981;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .account-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 6px;
      }

      .account-badge.mbfb {
        background: rgba(59, 130, 246, 0.3);
        border: 1px solid rgba(59, 130, 246, 0.5);
        color: #60a5fa;
      }

      .account-badge.cmfb {
        background: rgba(168, 85, 247, 0.3);
        border: 1px solid rgba(168, 85, 247, 0.5);
        color: #c084fc;
      }

      .dashboard-phase {
        margin-bottom: 14px;
      }

      .phase-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .phase-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #888;
      }

      .phase-dot.idle { background: #888; }
      .phase-dot.scanning { 
        background: #3b82f6; 
        animation: pulse-blue 1.5s ease-in-out infinite;
      }
      .phase-dot.saving { 
        background: #f59e0b; 
        animation: pulse-orange 1.5s ease-in-out infinite;
      }
      .phase-dot.complete { background: #10b981; }
      .phase-dot.error { background: #ef4444; }

      @keyframes pulse-blue {
        0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
        50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
      }

      @keyframes pulse-orange {
        0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
        50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
      }

      .phase-label {
        font-size: 13px;
        font-weight: 600;
        color: #ddd;
      }

      .progress-container {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .progress-bar {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
        border-radius: 3px;
        width: 0%;
        transition: width 0.3s ease;
      }

      .progress-text {
        font-size: 11px;
        color: #888;
        min-width: 45px;
      }

      .dashboard-stats {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .stat-box {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .stat-icon {
        font-size: 16px;
      }

      .stat-content {
        display: flex;
        flex-direction: column;
      }

      .stat-value {
        font-size: 16px;
        font-weight: 700;
        color: #10b981;
      }

      .stat-label {
        font-size: 9px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .dashboard-interceptor {
        background: rgba(255, 255, 255, 0.03);
        padding: 8px 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }

      .interceptor-label {
        color: #888;
      }

      .status-ok { color: #10b981; }
      .status-pending { color: #f59e0b; }

      .dashboard-activity {
        margin-bottom: 12px;
      }

      .section-header {
        font-size: 11px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .activity-log {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 8px;
        max-height: 100px;
        overflow-y: auto;
      }

      .activity-entry {
        font-size: 11px;
        color: #aaa;
        padding: 3px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .activity-entry:last-child {
        border-bottom: none;
      }

      .dashboard-errors {
        margin-bottom: 14px;
      }

      .error-list {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 8px;
        max-height: 60px;
        overflow-y: auto;
      }

      .error-entry {
        font-size: 11px;
        color: #ef4444;
        padding: 3px 0;
      }

      .error-entry.success {
        color: #10b981;
      }

      .dashboard-button {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        color: white;
      }

      .dashboard-button.mbfb {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }

      .dashboard-button.cmfb {
        background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
      }

      .dashboard-button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .dashboard-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .dashboard-button.success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      }
    `;
    document.head.appendChild(style);

    console.log(`FB Importer v${EXTENSION_VERSION}: Dashboard created for ${selectedAccount}`);
    addActivity("Dashboard initialized");
  }

  // ============= IMPROVED COLLECTION WITH MOMENTUM DETECTION =============
  async function collectAllListings() {
    console.log("%c=== FB IMPORTER v2.1.0 DIAGNOSTIC MODE ===", "color: #f59e0b; font-weight: bold; font-size: 16px");
    console.log("FB Importer: URL:", window.location.href);
    console.log(`FB Importer: Account: ${selectedAccount}`);
    console.log(`FB Importer: Already captured: ${capturedListings.size}`);
    console.log(`FB Importer: Interceptor ready: ${interceptorReady}`);

    addActivity(`Scanning for ${selectedAccount} listings...`);

    // Wait for interceptor to be ready
    if (!interceptorReady) {
      addActivity("⏳ Waiting for interceptor...");
      await sleep(2000);
      console.log(`FB Importer: Interceptor status after wait: ${interceptorReady}`);
    }

    // Phase 1: AGGRESSIVE scrolling to trigger ALL GraphQL pagination
    // For thousands of listings, we need MANY more scroll attempts
    let noNewData = 0;
    let lastHeight = 0;
    let lastCapturedCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 500; // Much higher limit for large inventories
    const stallThreshold = 15; // More patience before giving up
    let lastError = null;
    let consecutiveStalls = 0;

    // Clear any old captures from different page loads
    const startingCount = capturedListings.size;
    console.log(`FB Importer: Starting collection with ${startingCount} pre-captured listings`);
    console.log(`FB Importer: Max scroll attempts: ${maxScrollAttempts}, stall threshold: ${stallThreshold}`);

    while (noNewData < stallThreshold && scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      
      try {
        // Scroll with slight randomization to avoid detection
        const scrollVariation = Math.random() * 500;
        const targetScroll = document.documentElement.scrollHeight + scrollVariation;
        
        // Smooth scroll to bottom
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
        
        // Also try scrolling specific containers (FB sometimes uses these)
        try {
          const mainContent = document.querySelector('[role="main"]');
          if (mainContent) {
            mainContent.scrollTop = mainContent.scrollHeight;
          }
          // Try common FB scroll containers
          const scrollContainers = document.querySelectorAll('[data-pagelet], [role="feed"], .x1lliihq');
          scrollContainers.forEach(container => {
            try { container.scrollTop = container.scrollHeight; } catch (e) {}
          });
        } catch (containerErr) {
          // Ignore container scroll errors
        }

        // Faster scrolling with shorter delays for efficiency
        await sleep(800 + Math.random() * 400);

        const currentHeight = document.documentElement.scrollHeight;
        const currentCapturedCount = capturedListings.size;

        // Update progress - show listings count prominently
        const progressPercent = Math.min((scrollAttempts / maxScrollAttempts) * 100, 100);
        const progressFill = document.querySelector("#fb-importer-progress-fill");
        const progressText = document.querySelector("#fb-importer-progress-text");
        if (progressFill) progressFill.style.width = `${progressPercent}%`;
        if (progressText) progressText.textContent = `${currentCapturedCount} found`;

        // Update dashboard every 5 scrolls to reduce overhead
        if (scrollAttempts % 5 === 0) {
          updateDashboard();
          addActivity(`📜 Scroll #${scrollAttempts}: ${currentCapturedCount} listings`);
        }

        // Check for new data
        if (currentHeight === lastHeight && currentCapturedCount === lastCapturedCount) {
          noNewData++;
          consecutiveStalls++;
          
          if (noNewData === 5) {
            addActivity(`⏳ Waiting for more content...`);
            // Try clicking "See more" or "Load more" buttons
            try {
              const loadMoreBtns = document.querySelectorAll('[role="button"]');
              loadMoreBtns.forEach(btn => {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('see more') || text.includes('load more') || text.includes('show more')) {
                  console.log('FB Importer: Clicking load more button');
                  btn.click();
                }
              });
            } catch (e) {}
          }
          
          if (noNewData === 10) {
            addActivity(`⚠️ Stall detected (${noNewData}/${stallThreshold})`);
          }
          
          // Longer wait during stalls to let content load
          await sleep(2000);
        } else {
          // Reset stall counter on new data
          noNewData = 0;
          consecutiveStalls = 0;
          lastHeight = currentHeight;
          lastCapturedCount = currentCapturedCount;
        }
      } catch (scrollErr) {
        lastError = scrollErr;
        console.error(`FB Importer: ❌ SCROLL ERROR at attempt #${scrollAttempts}:`, scrollErr);
        addError(`Scroll error: ${scrollErr.message}`);
        
        noNewData++;
        if (noNewData >= stallThreshold) {
          console.warn(`FB Importer: Too many errors, stopping scroll loop`);
          break;
        }
        await sleep(1000);
      }
    }
    
    console.log(`FB Importer: Scroll loop exited - attempts: ${scrollAttempts}, stalls: ${noNewData}, lastError: ${lastError?.message || 'none'}`);
    addActivity(`Scan complete: ${scrollAttempts} scrolls`);

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
      addError("Failed to process captured listings");
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
      addActivity("⚠️ No listings found");
      addError("No listings detected - check console for diagnostics");
    } else {
      addActivity(`✓ Found ${listings.length} listings to save`);
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
    currentPhase = "scanning";
    clearErrors();
    startElapsedTimer();
    updateDashboard();

    const button = document.querySelector("#fb-importer-button");
    const buttonText = button.querySelector(".button-text");
    const progressFill = document.querySelector("#fb-importer-progress-fill");

    button.disabled = true;
    buttonText.textContent = `Scanning ${selectedAccount}...`;
    addActivity(`▶️ Starting import for ${selectedAccount}`);

    try {
      const listings = await collectAllListings();
      totalCount = listings.length;

      if (totalCount === 0) {
        currentPhase = "error";
        buttonText.textContent = "No listings found";
        button.disabled = false;
        isImporting = false;
        stopElapsedTimer();
        updateDashboard();
        return;
      }

      currentPhase = "saving";
      updateDashboard();
      buttonText.textContent = `Saving to ${selectedAccount}...`;
      addActivity(`💾 Saving ${totalCount} listings...`);

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
        
        const savePercent = ((successCount + errorCount) / totalCount) * 100;
        if (progressFill) progressFill.style.width = `${savePercent}%`;
        
        const progressText = document.querySelector("#fb-importer-progress-text");
        if (progressText) progressText.textContent = `${successCount + errorCount}/${totalCount}`;
        
        updateDashboard();
        
        // Small delay to avoid rate limiting
        await sleep(80);
      }

      // Success state
      currentPhase = "complete";
      buttonText.textContent = `✓ ${successCount} saved`;
      button.classList.add("success");

      const totalImages = listings.reduce((sum, l) => sum + (l.images?.length || 0), 0);
      addActivity(`✓ Complete: ${successCount}/${totalCount} saved`);
      addActivity(`📸 ${totalImages} images captured`);

      if (errorCount > 0) {
        addError(`${errorCount} listings failed to save`);
      }

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

      stopElapsedTimer();
      updateDashboard();

      // Reset after delay
      setTimeout(() => {
        button.disabled = false;
        button.classList.remove("success");
        buttonText.textContent = "Start Import";
        currentPhase = "idle";
        isImporting = false;
        if (progressFill) progressFill.style.width = "0%";
        
        // Clear captured listings for fresh next run
        capturedListings.clear();
        updateDashboard();
      }, 5000);

    } catch (e) {
      console.error("FB Importer: Import error:", e);
      currentPhase = "error";
      buttonText.textContent = "Error - Try Again";
      button.disabled = false;
      isImporting = false;
      stopElapsedTimer();
      addError(`Import failed: ${e.message}`);
      updateDashboard();
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

    // Create dashboard after a short delay for page to settle
    setTimeout(createDashboard, 1500);
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
      activityLog = [];
      errorLog = [];
      currentPhase = "idle";
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
