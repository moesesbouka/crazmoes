// FB Marketplace Importer - Content Script for Your Listings Page
// Version 3.1.0 - FIXED EXTRACTION EDITION
// Key fixes:
// - Fixed image filter that was blocking ALL real photos (_n.jpg = full size!)
// - Added support for webp/png image formats
// - Improved scroll container targeting for FB seller inventory page
// - Better "Load More" button detection
(function () {
  "use strict";

  const EXTENSION_VERSION = "3.1.0";

  const SUPABASE_URL = "https://dluabbbrdhvspbjmckuf.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4";

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;
  let selectedAccount = "MBFB";

  // GraphQL captured listings Map
  const capturedListings = new Map();
  const enrichedListings = new Map();
  let interceptorReady = false;

  // Dashboard state
  let currentPhase = "idle"; // idle, scanning, enriching, saving, complete, error
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
          if (!capturedListings.has(listing.facebook_id)) {
            capturedListings.set(listing.facebook_id, listing);
            updateDashboard();
            
            if (capturedListings.size <= 3) {
              addActivity(`📋 Found: "${listing.title?.slice(0, 25)}..."`);
            } else if (capturedListings.size % 25 === 0) {
              addActivity(`📦 ${capturedListings.size} listings found`);
            }
          }
        }
      }

      if (msg.type === "ENRICHED_LISTING") {
        const listing = msg.payload;
        if (listing && listing.facebook_id) {
          enrichedListings.set(listing.facebook_id, listing);
          updateDashboard();
        }
      }
    });

    // Inject the script into page context
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
    if (activityLog.length > 10) activityLog.pop();
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
    
    logEl.innerHTML = activityLog.slice(0, 6).map(entry => 
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

    // Update enriched count
    const enrichedCount = document.querySelector("#fb-importer-enriched-count");
    if (enrichedCount) enrichedCount.textContent = enrichedListings.size;

    // Update images count
    const imagesCount = document.querySelector("#fb-importer-images-count");
    if (imagesCount) {
      const totalImages = Array.from(enrichedListings.size > 0 ? enrichedListings.values() : capturedListings.values())
        .reduce((sum, l) => sum + (l.images?.length || 0), 0);
      imagesCount.textContent = totalImages;
    }

    // Update phase indicator
    const phaseEl = document.querySelector("#fb-importer-phase");
    const phaseDot = document.querySelector("#fb-importer-phase-dot");
    if (phaseEl) {
      const phaseLabels = {
        idle: "Ready to Import",
        scanning: "Scanning Feed...",
        enriching: "Enriching Photos...",
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
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <span class="stat-value" id="fb-importer-listings-count">${capturedListings.size}</span>
            <span class="stat-label">Found</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">✨</div>
          <div class="stat-content">
            <span class="stat-value" id="fb-importer-enriched-count">0</span>
            <span class="stat-label">Enriched</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">📸</div>
          <div class="stat-content">
            <span class="stat-value" id="fb-importer-images-count">0</span>
            <span class="stat-label">Photos</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <span class="stat-value" id="fb-importer-elapsed">0:00</span>
            <span class="stat-label">Time</span>
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
        <span class="button-text">Start Full Import</span>
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
        width: 320px;
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

      .logo-icon { font-size: 20px; }
      .title-text { font-size: 15px; font-weight: 700; }

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

      .dashboard-phase { margin-bottom: 14px; }

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
      .phase-dot.enriching { 
        background: #f59e0b; 
        animation: pulse-orange 1.5s ease-in-out infinite;
      }
      .phase-dot.saving { 
        background: #8b5cf6; 
        animation: pulse-purple 1.5s ease-in-out infinite;
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

      @keyframes pulse-purple {
        0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.5); }
        50% { box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
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
        min-width: 60px;
        text-align: right;
      }

      .dashboard-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        margin-bottom: 12px;
      }

      .stat-box {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 8px 6px;
        text-align: center;
      }

      .stat-icon { font-size: 14px; margin-bottom: 4px; }

      .stat-value {
        font-size: 16px;
        font-weight: 700;
        color: #10b981;
        display: block;
      }

      .stat-label {
        font-size: 8px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.3px;
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

      .interceptor-label { color: #888; }
      .status-ok { color: #10b981; }
      .status-pending { color: #f59e0b; }

      .dashboard-activity, .dashboard-errors {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
      }

      .section-header {
        font-size: 11px;
        font-weight: 600;
        color: #888;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .activity-log, .error-list {
        max-height: 80px;
        overflow-y: auto;
      }

      .activity-entry {
        font-size: 11px;
        color: #aaa;
        padding: 3px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .error-entry {
        font-size: 11px;
        color: #f87171;
        padding: 3px 0;
      }

      .error-entry.success { color: #10b981; }

      .dashboard-button {
        width: 100%;
        padding: 12px 16px;
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

  // ============= PHASE 1: FAST SCAN TO COLLECT ALL IDs =============
  async function scanAllListings() {
    console.log("%c=== FB IMPORTER v3.1.0 - PHASE 1: SCANNING ===", "color: #3b82f6; font-weight: bold; font-size: 16px");
    addActivity(`🔍 Scanning for all ${selectedAccount} listings...`);

    if (!interceptorReady) {
      addActivity("⏳ Waiting for interceptor...");
      await sleep(2000);
    }

    // Fast aggressive scrolling - no stopping until we hit the end
    let noNewData = 0;
    let lastCapturedCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 1000; // Very high limit
    const stallThreshold = 30; // Very patient - increased from 25

    const progressFill = document.querySelector("#fb-importer-progress-fill");
    const progressText = document.querySelector("#fb-importer-progress-text");

    // v3.1.0: Improved scroll container selectors for FB seller inventory
    const scrollContainerSelectors = [
      '[role="main"]',
      '[data-pagelet="MainFeed"]',
      '[data-pagelet*="Selling"]',
      '[data-pagelet*="Inventory"]',
      '[data-pagelet*="Marketplace"]',
      'div[style*="overflow: auto"]',
      'div[style*="overflow-y: auto"]',
      'div[style*="overflow-y: scroll"]',
      '.x78zum5',
      '.x1y1aw1k',
      '.x1n2onr6',
      '[role="feed"]',
      '[data-pagelet*="Feed"]',
    ];

    while (noNewData < stallThreshold && scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;
      
      try {
        // v3.1.0: Multi-target aggressive scrolling
        // 1. Window scroll
        window.scrollTo({ top: document.body.scrollHeight + 5000, behavior: 'instant' });
        
        // 2. Document element scroll
        document.documentElement.scrollTop = document.documentElement.scrollHeight;
        
        // 3. Body scroll
        document.body.scrollTop = document.body.scrollHeight;
        
        // 4. Scroll all potential feed containers
        scrollContainerSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            try {
              if (el.scrollHeight > el.clientHeight) {
                el.scrollTop = el.scrollHeight;
              }
            } catch (e) {}
          });
        });

        await sleep(350); // Slightly faster scrolling

        const currentCapturedCount = capturedListings.size;

        // Update progress
        if (progressFill) progressFill.style.width = `${Math.min((scrollAttempts / 200) * 50, 50)}%`;
        if (progressText) progressText.textContent = `${currentCapturedCount} found`;

        if (scrollAttempts % 10 === 0) {
          updateDashboard();
        }

        if (currentCapturedCount === lastCapturedCount) {
          noNewData++;
          
          // v3.1.0: Improved load more button detection
          if (noNewData === 5 || noNewData === 10 || noNewData === 20) {
            // Multiple selector patterns for FB's various button styles
            const loadMoreSelectors = [
              '[role="button"]',
              'div[tabindex="0"]',
              'span[role="button"]',
              'a[role="button"]',
            ];
            
            loadMoreSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(btn => {
                const text = (btn.textContent || '').toLowerCase();
                if (text.includes('see more') || text.includes('load more') || 
                    text.includes('show more') || text.includes('view more') ||
                    text.includes('see all') || text.includes('load all')) {
                  try {
                    btn.click();
                    console.log('FB Importer: Clicked load more button:', text.slice(0, 30));
                  } catch (e) {}
                }
              });
            });
            
            await sleep(1500);
          }
        } else {
          noNewData = 0;
          lastCapturedCount = currentCapturedCount;
          
          if (scrollAttempts % 50 === 0) {
            addActivity(`📦 ${currentCapturedCount} listings found...`);
          }
        }
      } catch (err) {
        noNewData++;
        await sleep(500);
      }
    }

    window.scrollTo(0, 0);
    console.log(`FB Importer: Scan complete - found ${capturedListings.size} listings in ${scrollAttempts} scrolls`);
    addActivity(`✓ Scan complete: ${capturedListings.size} listings`);

    return Array.from(capturedListings.values());
  }

  // ============= PHASE 2: ENRICH EACH LISTING =============
  async function enrichListings(listings) {
    console.log("%c=== FB IMPORTER v3.1.0 - PHASE 2: ENRICHING ===", "color: #f59e0b; font-weight: bold; font-size: 16px");
    addActivity(`✨ Enriching ${listings.length} listings for full photos...`);

    const progressFill = document.querySelector("#fb-importer-progress-fill");
    const progressText = document.querySelector("#fb-importer-progress-text");

    // Create hidden iframe for fetching detail pages
    let iframe = document.getElementById('fb-importer-enricher');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'fb-importer-enricher';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;visibility:hidden;';
      document.body.appendChild(iframe);
    }

    const enrichedResults = [];
    let enrichedCount = 0;
    const batchSize = 5; // Process in batches for balance

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      
      try {
        // Fetch the detail page
        const detailUrl = `https://www.facebook.com/marketplace/item/${listing.facebook_id}`;
        
        const response = await fetch(detailUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });

        if (response.ok) {
          const html = await response.text();
          
          // v3.1.0: FIXED image extraction - support ALL formats including _n.jpg (full size!)
          const imageUrls = [];
          
          // Pattern 1: scontent URLs - ALL image formats (jpg, jpeg, png, webp)
          const scontentMatches = html.match(/https:\/\/scontent[^"'\s\\]+\.(jpg|jpeg|png|webp)[^"'\s\\]*/gi) || [];
          scontentMatches.forEach(url => {
            const clean = url.replace(/\\u0025/g, '%').replace(/\\/g, '');
            if (clean.includes('fbcdn') || clean.includes('scontent')) {
              if (!imageUrls.includes(clean) && imageUrls.length < 30) {
                imageUrls.push(clean);
              }
            }
          });

          // Pattern 2: fbcdn URLs - ALL formats
          const fbcdnMatches = html.match(/https:\/\/[^"'\s\\]*fbcdn[^"'\s\\]+\.(jpg|jpeg|png|webp)[^"'\s\\]*/gi) || [];
          fbcdnMatches.forEach(url => {
            const clean = url.replace(/\\u0025/g, '%').replace(/\\/g, '');
            if (!imageUrls.includes(clean) && imageUrls.length < 30) {
              imageUrls.push(clean);
            }
          });

          // Pattern 3: Look for image JSON in scripts - ALL formats
          const jsonMatches = html.match(/"uri"\s*:\s*"(https:[^"]+)"/gi) || [];
          jsonMatches.forEach(match => {
            const urlMatch = match.match(/"uri"\s*:\s*"(https:[^"]+)"/i);
            if (urlMatch && urlMatch[1]) {
              let url = urlMatch[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
              if ((url.includes('fbcdn') || url.includes('scontent')) && 
                  url.match(/\.(jpg|jpeg|png|webp)/i)) {
                if (!imageUrls.includes(url) && imageUrls.length < 30) {
                  imageUrls.push(url);
                }
              }
            }
          });

          // v3.1.0: FIXED filter - KEEP _n.jpg (these are the REAL full-size images!)
          // Only filter out obvious tiny thumbnails
          const uniqueImages = [...new Set(imageUrls)].filter(url => {
            // Skip explicit tiny thumbnails
            if (url.includes('_t.jpg') || url.includes('_t.png') || url.includes('_t.webp')) return false;
            if (url.includes('_s.jpg') || url.includes('_s.png') || url.includes('_s.webp')) return false;
            // Skip by dimension markers (tiny sizes)
            if (url.includes('p50x50')) return false;
            if (url.includes('p60x60')) return false;
            if (url.includes('p75x75')) return false;
            if (url.includes('p100x100')) return false;
            if (url.includes('c0.0.50.50')) return false;  // Cropped tiny
            if (url.includes('c0.0.100.100')) return false;
            // KEEP _n.jpg - these are full-size images! (this was the v3.0.0 bug)
            return true;
          });

          // If we found more images, use them
          if (uniqueImages.length > (listing.images?.length || 0)) {
            listing.images = uniqueImages;
            listing.is_enriched = true;
            console.log(`FB Importer: ✨ Enriched ${listing.facebook_id} with ${uniqueImages.length} photos`);
          }
        }

        enrichedCount++;
        enrichedListings.set(listing.facebook_id, listing);
        enrichedResults.push(listing);

        // Update progress
        const percent = 50 + ((enrichedCount / listings.length) * 30);
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${enrichedCount}/${listings.length}`;
        
        if (enrichedCount % 10 === 0) {
          addActivity(`✨ Enriched ${enrichedCount}/${listings.length} listings`);
          updateDashboard();
        }

        // Balanced throttling - 800ms between requests
        await sleep(800);

      } catch (err) {
        console.warn(`FB Importer: Failed to enrich ${listing.facebook_id}:`, err.message);
        enrichedResults.push(listing); // Still save the basic listing
        enrichedCount++;
        await sleep(400);
      }
    }

    console.log(`FB Importer: Enrichment complete - ${enrichedCount} listings processed`);
    addActivity(`✓ Enrichment complete`);

    return enrichedResults;
  }

  // ============= SAVE LISTING =============
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
        source: "graphql-enriched",
        last_seen_at: new Date().toISOString(),
      };

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

  // ============= MAIN IMPORT =============
  async function startImport() {
    if (isImporting) return;

    await loadSelectedAccount();

    isImporting = true;
    importedCount = 0;
    currentPhase = "scanning";
    clearErrors();
    startElapsedTimer();
    capturedListings.clear();
    enrichedListings.clear();
    updateDashboard();

    const button = document.querySelector("#fb-importer-button");
    const buttonText = button.querySelector(".button-text");
    const progressFill = document.querySelector("#fb-importer-progress-fill");

    button.disabled = true;
    buttonText.textContent = `Scanning ${selectedAccount}...`;
    addActivity(`▶️ Starting FULL import for ${selectedAccount}`);

    try {
      // Phase 1: Scan all listings
      const scannedListings = await scanAllListings();
      totalCount = scannedListings.length;

      if (totalCount === 0) {
        currentPhase = "error";
        buttonText.textContent = "No listings found";
        button.disabled = false;
        isImporting = false;
        stopElapsedTimer();
        updateDashboard();
        return;
      }

      // Phase 2: Enrich with full photos
      currentPhase = "enriching";
      updateDashboard();
      buttonText.textContent = `Enriching ${totalCount} listings...`;
      
      const enrichedList = await enrichListings(scannedListings);

      // Phase 3: Save to database
      currentPhase = "saving";
      updateDashboard();
      buttonText.textContent = `Saving ${enrichedList.length} listings...`;
      addActivity(`💾 Saving ${enrichedList.length} listings...`);

      let successCount = 0;
      let errorCount = 0;

      for (const item of enrichedList) {
        const ok = await saveListing(item);
        if (ok) {
          successCount++;
          importedCount++;
        } else {
          errorCount++;
        }
        
        const savePercent = 80 + ((successCount + errorCount) / enrichedList.length) * 20;
        if (progressFill) progressFill.style.width = `${savePercent}%`;
        
        const progressText = document.querySelector("#fb-importer-progress-text");
        if (progressText) progressText.textContent = `${successCount}/${enrichedList.length}`;
        
        if ((successCount + errorCount) % 50 === 0) {
          updateDashboard();
        }
        
        await sleep(50);
      }

      // Success state
      currentPhase = "complete";
      buttonText.textContent = `✓ ${successCount} saved`;
      button.classList.add("success");

      const totalImages = enrichedList.reduce((sum, l) => sum + (l.images?.length || 0), 0);
      addActivity(`✓ Complete: ${successCount}/${enrichedList.length} saved`);
      addActivity(`📸 ${totalImages} total photos captured`);

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
            totalImages: totalImages,
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
        buttonText.textContent = "Start Full Import";
        currentPhase = "idle";
        isImporting = false;
        if (progressFill) progressFill.style.width = "0%";
        
        capturedListings.clear();
        enrichedListings.clear();
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
    const url = window.location.href;
    const isYourListings = url.includes("facebook.com/marketplace/you");
    
    if (!isYourListings) {
      console.log("FB Importer: Not on Your Listings page, skipping...");
      return;
    }

    await loadSelectedAccount();

    console.log(`FB Importer v${EXTENSION_VERSION}: Initializing for ${selectedAccount}...`);

    injectGraphQLInterceptor();

    setTimeout(createDashboard, 1500);
  }

  init();

  // Watch for URL changes (FB is a SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("FB Importer: URL changed, re-initializing...");
      capturedListings.clear();
      enrichedListings.clear();
      activityLog = [];
      errorLog = [];
      currentPhase = "idle";
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
