// FB Marketplace Importer - Content Script for Your Listings Page
// Version 1.2.2 - Price-node driven tile detection (works when no <a href> and no role=link cards)
(function () {
  "use strict";

  const EXTENSION_VERSION = "1.2.2";

  const SUPABASE_URL = "https://dluabbbrdhvspbjmckuf.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWFiYmJyZGh2c3Biam1ja3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI5MjEsImV4cCI6MjA4MzEzODkyMX0.nMQ1zf3dQawA6bHHPEUYj2CdHCMtCCvFVF-mmWlMHF4";

  let isImporting = false;
  let importedCount = 0;
  let totalCount = 0;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
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
    `;

    document.body.appendChild(container);
    document.querySelector("#fb-importer-button").addEventListener("click", startImport);

    console.log(`FB Importer v${EXTENSION_VERSION}: Button created`);
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

  // -------- NEW: find listing tiles by locating price nodes ($xx) then climbing to a "card"
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

        // Many FB tiles are clickable as role=link/button, but not always
        const isClickable =
          card.getAttribute?.("role") === "link" ||
          card.getAttribute?.("role") === "button" ||
          card.tagName === "A";

        if (okSize && hasText && hasImg) {
          containers.add(card);
          break;
        }

        // If clickable + contains price + decent size, accept too
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

        // simple hash (no crypto needed)
        const raw = `${fallbackTitle}||${fallbackPrice}||${img}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
          hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
        }

        facebookId = `dom_${Math.abs(hash)}`;
        listingUrl = ""; // unknown at this stage
      }

      if (!listingUrl) listingUrl = facebookId.startsWith("dom_") ? "" : `https://www.facebook.com/marketplace/item/${facebookId}`;

      // Title: first heading-like text in tile that isn't price
      let title = "";
      const heading = tile.querySelector('[role="heading"]');
      if (heading) title = getVisibleText(heading);

      if (!title) {
        const spans = Array.from(tile.querySelectorAll('span[dir="auto"]'))
          .map((s) => getVisibleText(s))
          .filter((t) => t && t.length > 3 && t.length < 200 && !/^\$[\d,]+/.test(t));
        // Often the first non-price span is title
        title = spans[0] || "";
      }

      title = title.replace(/\s+/g, " ").trim();
      if (!title || title.length < 3) return null;

      // Price
      let price = null;
      const txt = getVisibleText(tile);
      const pm = txt.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (pm) price = parseFloat(pm[1].replace(/,/g, ""));

      // Images
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

    while (noNew < 4) {
      const tiles = getListingElements();

      for (const t of tiles) {
        const data = extractListingData(t);
        if (data?.facebook_id && !seen.has(data.facebook_id)) {
          seen.add(data.facebook_id);
          listings.push(data);
        }
      }

      console.log(`FB Importer: Collected so far: ${listings.length}`);

      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(2000);

      const h = document.documentElement.scrollHeight;
      if (h === lastHeight) {
        noNew++;
        console.log(`FB Importer: No new content (attempt ${noNew}/4)`);
      } else {
        noNew = 0;
        lastHeight = h;
      }
    }

    console.log(`FB Importer: FINAL unique listings: ${listings.length}`);
    return listings;
  }

  async function saveListing(listing) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(listing),
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
