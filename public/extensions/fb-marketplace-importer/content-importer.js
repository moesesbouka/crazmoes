// FB Marketplace Importer - Content Script for Your Listings Page
// Version 1.2.1 - Robust role=link tile extraction + background-image support
(function () {
  "use strict";

  const EXTENSION_VERSION = "1.2.1";

  // Configuration - Update this with your Supabase project URL
  const SUPABASE_URL = "https://dluabbbrdhvspbjmckuf.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4";

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;

  // GraphQL capture storage (kept as optional fallback)
  let capturedListings = new Map();
  let isCapturing = false;

  // ---------- UI ----------
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
    `;

    document.body.appendChild(container);

    document
      .querySelector("#fb-importer-button")
      .addEventListener("click", startImport);

    console.log(`FB Importer v${EXTENSION_VERSION}: Button created`);
  }

  // ---------- Helpers ----------
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function extractListingIdFromUrl(url) {
    if (!url) return null;

    const itemMatch = url.match(/\/marketplace\/item\/(\d+)/);
    if (itemMatch) return itemMatch[1];

    const shortItemMatch = url.match(/\/item\/(\d+)/);
    if (shortItemMatch) return shortItemMatch[1];

    const listingIdMatch = url.match(/[?&]listing_id=(\d+)/);
    if (listingIdMatch) return listingIdMatch[1];

    const itemIdMatch = url.match(/[?&]item_id=(\d+)/);
    if (itemIdMatch) return itemIdMatch[1];

    const pathMatch = url.match(/\/(\d{10,})/);
    if (pathMatch) return pathMatch[1];

    return null;
  }

  function extractIdFromAnyString(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{10,})/);
    return m ? m[1] : null;
  }

  function getVisibleText(el) {
    const t = (el?.textContent || "").replace(/\s+/g, " ").trim();
    return t;
  }

  function looksLikeUIChrome(el) {
    // Try to avoid sidebars/top nav etc.
    const rect = el.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 80) return true;

    const cls = (el.className || "").toString().toLowerCase();
    if (
      cls.includes("sidebar") ||
      cls.includes("nav") ||
      cls.includes("menu") ||
      cls.includes("header") ||
      cls.includes("footer")
    )
      return true;

    return false;
  }

  function findAnyMarketplaceUrlInElement(el) {
    // Look for any attribute that might contain a URL/id
    const attrsToCheck = [
      "href",
      "data-href",
      "data-url",
      "ajaxify",
      "data-testid",
      "aria-label",
      "data-ft",
      "data-visualcompletion",
    ];
    const all = el.querySelectorAll("*");
    for (const node of all) {
      for (const a of attrsToCheck) {
        const v = node.getAttribute && node.getAttribute(a);
        if (!v) continue;
        if (
          v.includes("marketplace") ||
          v.includes("/item/") ||
          v.includes("listing_id") ||
          v.includes("item_id")
        ) {
          return v;
        }
      }
    }
    return null;
  }

  function extractBackgroundImageUrl(el) {
    // Search for any background-image url(...) inside this tile
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

  // ---------- DOM Extraction ----------
  function extractListingData(element) {
    try {
      let listingUrl = null;
      let facebookId = null;

      // 1) Try anchors with href
      const anchors = element.querySelectorAll("a[href]");
      for (const anchor of anchors) {
        const href = anchor.href || "";
        const id = extractListingIdFromUrl(href);
        if (id) {
          facebookId = id;
          listingUrl = href;
          break;
        }
      }

      // 2) If element itself is an anchor
      if (!facebookId && element.tagName === "A") {
        facebookId = extractListingIdFromUrl(element.href);
        listingUrl = element.href;
      }

      // 3) Try data attributes / ajaxify / aria-label etc.
      if (!facebookId) {
        const possible = findAnyMarketplaceUrlInElement(element);
        facebookId = extractListingIdFromUrl(possible) || extractIdFromAnyString(possible);

        if (!facebookId) {
          facebookId =
            extractIdFromAnyString(element.getAttribute("data-testid")) ||
            extractIdFromAnyString(element.getAttribute("data-ft")) ||
            null;
        }

        if (facebookId) {
          listingUrl = `https://www.facebook.com/marketplace/item/${facebookId}`;
        }
      }

      // If still no ID, we cannot safely import because we'd duplicate/garbage key
      if (!facebookId) return null;

      // Title strategies
      let title = "";

      const headingEl = element.querySelector('[role="heading"]');
      if (headingEl) title = getVisibleText(headingEl);

      if (!title) {
        // best "non-price" span
        const spans = element.querySelectorAll('span[dir="auto"]:not([aria-hidden])');
        for (const s of spans) {
          const text = getVisibleText(s);
          if (!text) continue;
          if (/^\$[\d,]+/.test(text)) continue;
          if (text.length < 3 || text.length > 200) continue;
          title = text;
          break;
        }
      }

      if (!title) {
        // last resort: use the tile text minus price
        const allText = getVisibleText(element);
        title = allText.replace(/\$\s*[\d,]+(?:\.\d{2})?/g, "").trim();
      }

      title = title.replace(/^\$[\d,]+(\.\d{2})?\s*/, "");
      title = title.replace(/\s+/g, " ").trim();

      if (!title || title.length < 3) return null;

      // Price
      let price = null;
      const allText = getVisibleText(element);
      const priceMatch = allText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (priceMatch) price = parseFloat(priceMatch[1].replace(/,/g, ""));

      // Images: <img> OR background-image
      const images = [];
      const img = element.querySelector("img[src]");
      if (img?.src) images.push(img.src);

      if (images.length === 0) {
        const bgUrl = extractBackgroundImageUrl(element);
        if (bgUrl) images.push(bgUrl);
      }

      return {
        facebook_id: String(facebookId),
        title: title.substring(0, 255),
        price: Number.isFinite(price) ? price : null,
        images: images.slice(0, 10),
        listing_url: listingUrl || `https://www.facebook.com/marketplace/item/${facebookId}`,
        status: "active",
        imported_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("FB Importer: Error extracting listing:", error);
      return null;
    }
  }

  function getListingElements() {
    const containers = new Set();

    // Strategy 1: /marketplace/item/
    const itemLinks1 = document.querySelectorAll('a[href*="/marketplace/item/"]');
    console.log(`FB Importer: Strategy 1 (item links): ${itemLinks1.length}`);

    // Strategy 2: listing_id=
    const itemLinks2 = document.querySelectorAll('a[href*="listing_id="]');
    console.log(`FB Importer: Strategy 2 (listing_id): ${itemLinks2.length}`);

    // Strategy 3: /item/
    const itemLinks3 = document.querySelectorAll('a[href*="/item/"]');
    console.log(`FB Importer: Strategy 3 (/item/): ${itemLinks3.length}`);

    const allAnchors = new Set([...itemLinks1, ...itemLinks2, ...itemLinks3]);

    for (const link of allAnchors) {
      let parent = link.parentElement;
      for (let i = 0; i < 7 && parent; i++) {
        const rect = parent.getBoundingClientRect();
        const okSize = rect.height > 80 && rect.width > 120 && rect.height < 900;
        if (okSize && parent.contains(link)) {
          containers.add(parent);
          break;
        }
        parent = parent.parentElement;
      }
    }

    // Strategy 4: role="link" tiles (NO href on seller dashboard)
    if (containers.size === 0) {
      console.log("FB Importer: Trying role=\"link\" fallback strategy...");
      const roleLinks = Array.from(document.querySelectorAll('[role="link"]'));
      console.log(`FB Importer: Strategy 4 (role=link): ${roleLinks.length}`);

      for (const link of roleLinks) {
        if (looksLikeUIChrome(link)) continue;

        const text = getVisibleText(link);
        if (text.length < 5) continue;

        const hasPrice = /\$\s*[\d,]+(?:\.\d{2})?/.test(text);
        const hasImgTag = !!link.querySelector("img");
        const hasBgImage = !!extractBackgroundImageUrl(link);

        // If it looks like a listing tile, keep it
        if (hasPrice || hasImgTag || hasBgImage) {
          containers.add(link);
        }
      }
    }

    console.log(`FB Importer: Total containers found: ${containers.size}`);
    return Array.from(containers);
  }

  // ---------- GraphQL Interception (optional) ----------
  function setupGraphQLInterception() {
    // Keep this as best-effort; FB often doesn't emit easily capturable data during scrolling
    console.log("FB Importer: Setting up GraphQL interception (best-effort)...");

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);

      if (isCapturing) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (url.includes("graphql")) {
          try {
            const clone = response.clone();
            const text = await clone.text();
            parseGraphQLResponse(text);
          } catch (e) {}
        }
      }
      return response;
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._fbImporterUrl = url;
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", function () {
        if (isCapturing && this._fbImporterUrl && this._fbImporterUrl.includes("graphql")) {
          try {
            parseGraphQLResponse(this.responseText);
          } catch (e) {}
        }
      });
      return originalXHRSend.apply(this, args);
    };
  }

  function parseGraphQLResponse(text) {
    try {
      if (!text) return;

      // Strip FB anti-JSON prefix if present
      if (text.startsWith("for(;;);")) text = text.slice(8);

      const parts = text.includes("\n")
        ? text.split("\n").filter((l) => l.trim().startsWith("{") || l.trim().startsWith("["))
        : [text];

      for (const p of parts) {
        try {
          const data = JSON.parse(p);
          findListingsInObject(data);
        } catch (e) {}
      }
    } catch (e) {}
  }

  function findListingsInObject(obj, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 15) return;

    if (isListingObject(obj)) {
      const listing = extractListingFromGraphQL(obj);
      if (listing && listing.facebook_id && !capturedListings.has(listing.facebook_id)) {
        capturedListings.set(listing.facebook_id, listing);
      }
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => findListingsInObject(item, depth + 1));
    } else {
      for (const key of Object.keys(obj)) {
        findListingsInObject(obj[key], depth + 1);
      }
    }
  }

  function isListingObject(obj) {
    const hasId =
      obj.id ||
      obj.listing_id ||
      obj.marketplace_listing_id ||
      obj.primary_listing_id ||
      obj.story_id;
    const hasTitle = obj.title || obj.name || obj.marketplace_listing_title;
    const hasPrice =
      obj.price ||
      obj.listing_price ||
      obj.formatted_price ||
      obj.current_price ||
      obj.sale_price;
    const hasImage =
      obj.image ||
      obj.images ||
      obj.primary_photo ||
      obj.photo ||
      obj.listing_photos ||
      obj.primary_listing_photo;

    return !!(hasId && (hasTitle || hasPrice || hasImage));
  }

  function extractListingFromGraphQL(obj) {
    try {
      const id = String(
        obj.id ||
          obj.listing_id ||
          obj.marketplace_listing_id ||
          obj.primary_listing_id ||
          obj.story_id ||
          ""
      ).trim();
      if (!id || id.length < 5) return null;

      let title = obj.title || obj.name || obj.marketplace_listing_title || "";
      if (typeof title === "object") title = title.text || "";
      title = String(title).trim();

      let price = null;
      const priceField =
        obj.price ||
        obj.listing_price ||
        obj.formatted_price ||
        obj.current_price ||
        obj.sale_price;
      if (priceField) {
        let raw = priceField;
        if (typeof raw === "object") raw = raw.amount || raw.text || "";
        const num = String(raw).replace(/[^0-9.]/g, "");
        if (num) price = parseFloat(num);
      }

      const images = [];
      const imageField =
        obj.image ||
        obj.images ||
        obj.primary_photo ||
        obj.photo ||
        obj.listing_photos ||
        obj.primary_listing_photo;

      const pushUrl = (u) => {
        if (u && typeof u === "string" && u.startsWith("http") && !images.includes(u)) images.push(u);
      };

      if (Array.isArray(imageField)) {
        imageField.forEach((img) => pushUrl(typeof img === "string" ? img : img?.uri || img?.url || img?.src));
      } else if (typeof imageField === "object" && imageField) {
        pushUrl(imageField.uri || imageField.url || imageField.src);
      } else if (typeof imageField === "string") {
        pushUrl(imageField);
      }

      return {
        facebook_id: id,
        title: (title || "Untitled").slice(0, 255),
        price: Number.isFinite(price) ? price : null,
        images: images.slice(0, 10),
        listing_url: `https://www.facebook.com/marketplace/item/${id}`,
        status: "active",
        imported_at: new Date().toISOString(),
      };
    } catch (e) {
      return null;
    }
  }

  // ---------- Collection ----------
  async function collectAllListings() {
    const listings = [];
    const seenIds = new Set();
    let lastHeight = 0;
    let noNewListingsCount = 0;

    // GraphQL capture (best effort)
    capturedListings.clear();
    isCapturing = true;
    let lastCapturedSize = 0;

    console.log("FB Importer: Starting to collect listings...");
    console.log("FB Importer: === INITIAL PAGE DIAGNOSTIC ===");
    console.log('  a[href*="/marketplace/item/"]:', document.querySelectorAll('a[href*="/marketplace/item/"]').length);
    console.log('  a[href*="listing_id="]:', document.querySelectorAll('a[href*="listing_id="]').length);
    console.log('  a[href*="/item/"]:', document.querySelectorAll('a[href*="/item/"]').length);
    console.log('  [role="link"]:', document.querySelectorAll('[role="link"]').length);

    while (noNewListingsCount < 4) {
      const listingElements = getListingElements();

      // Extract from DOM
      for (const element of listingElements) {
        const data = extractListingData(element);
        if (data && data.facebook_id && !seenIds.has(data.facebook_id)) {
          seenIds.add(data.facebook_id);
          listings.push(data);
        }
      }

      console.log(
        `FB Importer: DOM listings: ${listings.length}, GraphQL captured: ${capturedListings.size}`
      );

      // Scroll to trigger lazy load
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(2000);

      const newHeight = document.documentElement.scrollHeight;
      const newCapturedSize = capturedListings.size;

      if (newHeight === lastHeight && newCapturedSize === lastCapturedSize) {
        noNewListingsCount++;
        console.log(`FB Importer: No new content (attempt ${noNewListingsCount}/4)`);
      } else {
        noNewListingsCount = 0;
        lastHeight = newHeight;
        lastCapturedSize = newCapturedSize;
      }
    }

    isCapturing = false;

    // Merge GraphQL captured listings into results (avoid duplicates)
    for (const [id, listing] of capturedListings) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        listings.push(listing);
      }
    }

    console.log(`FB Importer: === FINAL RESULTS ===`);
    console.log(`  GraphQL captured: ${capturedListings.size}`);
    console.log(`  Total unique: ${listings.length}`);

    return listings;
  }

  // ---------- Save ----------
  async function saveListing(listing) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(listing),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("FB Importer: Save error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("FB Importer: Network error:", error);
      return false;
    }
  }

  // ---------- Import Flow ----------
  async function startImport() {
    if (isImporting) return;

    console.log(`FB Importer v${EXTENSION_VERSION}: Starting import...`);
    console.log("FB Importer: Current URL:", window.location.href);

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
        console.log("FB Importer: No listings found to import");
        button.innerHTML = "No listings found";
        button.disabled = false;
        isImporting = false;
        return;
      }

      // Show progress
      progress.style.display = "block";
      totalSpan.textContent = String(totalCount);
      button.innerHTML = "Importing...";

      for (const listing of listings) {
        const success = await saveListing(listing);
        if (success) {
          importedCount++;
          countSpan.textContent = String(importedCount);
          progressFill.style.width = `${(importedCount / totalCount) * 100}%`;
        }
        await sleep(120);
      }

      console.log(`FB Importer: Successfully imported ${importedCount} listings`);
      button.innerHTML = `✓ Imported ${importedCount} listings`;
      button.classList.add("success");

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
        isImporting = false;
      }, 5000);
    } catch (error) {
      console.error("FB Importer: Import error:", error);
      button.innerHTML = "Error - Try Again";
      button.disabled = false;
      isImporting = false;
    }
  }

  // ---------- Init ----------
  function init() {
    if (window.location.href.includes("facebook.com/marketplace/you")) {
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
      console.log("FB Importer: URL changed, re-initializing...");
      setTimeout(init, 1500);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
