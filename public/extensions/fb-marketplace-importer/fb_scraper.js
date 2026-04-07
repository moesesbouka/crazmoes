/**
 * fb_scraper.js  — Crazy Moe's Active Listings Sync
 * ─────────────────────────────────────────────────
 * ONE job: scrape your active FB Marketplace listings
 * and sync them to the `active_listings` Supabase table.
 * Works on: facebook.com/marketplace/you/selling (any query string)
 */

(function () {
  "use strict";
  if (window !== window.top) return;
  if (document.getElementById("__cmoe_sync_btn__")) return;

  console.log("[CrazyMoe Sync] loaded");

  // ── Config ──────────────────────────────────────────────────────────────
  const KNOWN_DOC_ID = "25837631222593538";
  let SB_URL = "";
  let SB_KEY = "";
  let TABLE   = "active_listings";
  // Account tag is configurable — default 'crazymoe', second account uses different tag
  // Loaded from chrome.storage.local key 'cmoeAccountTag'
  let ACCOUNT = "crazymoe";
  let IS_PUBLISHED_DEFAULT = true; // crazymoe = public, other accounts = private
  try {
    chrome.storage.local.get(["cmoeAccountTag","cmoeIsPublished"], r => {
      if (r?.cmoeAccountTag) { ACCOUNT = r.cmoeAccountTag; }
      if (r?.cmoeIsPublished !== undefined) { IS_PUBLISHED_DEFAULT = r.cmoeIsPublished; }
      if (accountTagInput) { accountTagInput.value = ACCOUNT; }
      if (publishedToggle) { publishedToggle.checked = IS_PUBLISHED_DEFAULT; updatePublishedLabel(); }
    });
  } catch(_) {}
  let accountTagInput = null, publishedToggle = null;

  async function loadSupabaseConfig() {
    try {
      const cfg = await chrome.storage.local.get(["cm_sb_url","cm_sb_key","cm_sb_table","cmoeAccountTag","cmoeIsPublished"]);
      SB_URL = (cfg.cm_sb_url || "").replace(/\/$/, "");
      SB_KEY = cfg.cm_sb_key || "";
      TABLE = cfg.cm_sb_table || "active_listings";
      if (cfg?.cmoeAccountTag) ACCOUNT = cfg.cmoeAccountTag;
      if (cfg?.cmoeIsPublished !== undefined) IS_PUBLISHED_DEFAULT = cfg.cmoeIsPublished;
    } catch(_) {}
  }
  function hasSupabaseConfig() { return !!(SB_URL && SB_KEY); }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── Capture GraphQL token from MAIN world ────────────────────────────────
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    if (e.data?.type === "__FB_CAP__" && e.data.docId) {
      const cap = { docId: e.data.docId, fbDtsg: e.data.fbDtsg || "", cursor: e.data.cursor || "", vars: e.data.vars || "{}", ts: Date.now() };
      try { localStorage.setItem("__fb_cap__", JSON.stringify(cap)); } catch(_) {}
      try { chrome.storage.session.set({ fbCapture: cap }, () => void chrome.runtime.lastError); } catch(_) {}
      console.log("[CrazyMoe Sync] token captured:", cap.docId);
      setStatus("✅ Token captured! Ready to sync.");
    }
  });

  // ── Banner ────────────────────────────────────────────────────────────────
  const banner = document.createElement("div");
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#e65100;color:#fff;padding:10px 20px;text-align:center;font:bold 14px Arial;cursor:default;";
  banner.textContent = "⚡ Crazy Moe's — Active Listings Sync";
  document.documentElement.appendChild(banner);

  // ── Panel ─────────────────────────────────────────────────────────────────
  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;bottom:25px;right:25px;z-index:2147483647;background:#fff;border:3px solid #e65100;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);width:360px;max-height:520px;display:flex;flex-direction:column;font:14px Arial;color:#000;overflow:hidden;";

  const dragHandle = document.createElement("div");
  dragHandle.style.cssText = "background:#e65100;color:#fff;padding:8px 12px;border-radius:13px 13px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:grab;user-select:none;flex-shrink:0;";
  const dragTitle = document.createElement("span");
  dragTitle.textContent = "🛒 Active Listings Sync";
  dragTitle.style.cssText = "font:bold 13px Arial;";
  const hdBtns = document.createElement("span");
  hdBtns.style.cssText = "display:flex;gap:6px;";
  const minBtn = document.createElement("button");
  minBtn.textContent = "—"; minBtn.title = "Minimize";
  minBtn.style.cssText = "background:rgba(255,255,255,0.25);border:none;color:#fff;border-radius:4px;width:22px;height:22px;cursor:pointer;font:bold 14px Arial;line-height:1;padding:0;";
  const hideBtn = document.createElement("button");
  hideBtn.textContent = "✕"; hideBtn.title = "Hide (click banner to restore)";
  hideBtn.style.cssText = "background:rgba(255,255,255,0.25);border:none;color:#fff;border-radius:4px;width:22px;height:22px;cursor:pointer;font:bold 13px Arial;line-height:1;padding:0;";
  hdBtns.append(minBtn, hideBtn);
  dragHandle.append(dragTitle, hdBtns);

  const body = document.createElement("div");
  body.style.cssText = "padding:16px;overflow-y:auto;flex:1;";
  panel.append(dragHandle, body);
  document.documentElement.appendChild(panel);

  // Minimize
  let minimised = false;
  minBtn.addEventListener("click", () => {
    minimised = !minimised;
    body.style.display = minimised ? "none" : "block";
    panel.style.maxHeight = minimised ? "44px" : "520px";
    minBtn.textContent = minimised ? "▲" : "—";
  });

  // Hide / restore
  let hidden = false;
  hideBtn.addEventListener("click", () => { hidden = true; panel.style.display = "none"; banner.style.cursor = "pointer"; });
  banner.addEventListener("click", () => { if (hidden) { hidden = false; panel.style.display = "flex"; banner.style.cursor = "default"; } });

  // Drag
  (function() {
    let drag = false, ox = 0, oy = 0;
    dragHandle.addEventListener("mousedown", e => {
      if (e.target === minBtn || e.target === hideBtn) return;
      drag = true;
      panel.style.bottom = "auto"; panel.style.right = "auto";
      panel.style.left = panel.offsetLeft + "px"; panel.style.top = panel.offsetTop + "px";
      ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop;
      dragHandle.style.cursor = "grabbing"; e.preventDefault();
    });
    document.addEventListener("mousemove", e => { if (!drag) return; panel.style.left = (e.clientX-ox)+"px"; panel.style.top = (e.clientY-oy)+"px"; });
    document.addEventListener("mouseup", () => { drag = false; dragHandle.style.cursor = "grab"; });
  })();

  // ── Status ────────────────────────────────────────────────────────────────
  const statusEl = document.createElement("div");
  statusEl.style.cssText = "font-size:13px;line-height:1.6;margin-bottom:14px;min-height:52px;color:#333;background:#f5f5f5;border-radius:8px;padding:10px;";
  statusEl.innerHTML = "Ready. Click <b>Sync Active Listings</b> to pull your live FB listings and update the website.";
  function setStatus(html) { statusEl.innerHTML = html; }

  // ── Import mode buttons (3 modes per Dev 2 recommendation) ──────────────
  const importModeBox = document.createElement("div");
  importModeBox.style.cssText = "display:flex;flex-direction:column;gap:7px;";

  // Full Import (original behavior)
  const syncBtn = document.createElement("button");
  syncBtn.id = "__cmoe_sync_btn__";
  syncBtn.textContent = "🔄 Full Import";
  syncBtn.title = "Wipe all rows for this account and re-import everything from FB";
  syncBtn.style.cssText = "width:100%;padding:12px;background:#e65100;color:#fff;border:none;border-radius:9px;font:bold 14px Arial;cursor:pointer;";

  // New Only button
  const newOnlyBtn = document.createElement("button");
  newOnlyBtn.id = "__cmoe_newonly_btn__";
  newOnlyBtn.textContent = "⚡ Import New Only";
  newOnlyBtn.title = "Fetch from FB and only insert IDs not already in the DB — fastest";
  newOnlyBtn.style.cssText = "width:100%;padding:12px;background:#1565c0;color:#fff;border:none;border-radius:9px;font:bold 14px Arial;cursor:pointer;";

  // Refresh Availability button
  const refreshAvailBtn = document.createElement("button");
  refreshAvailBtn.id = "__cmoe_refresh_btn__";
  refreshAvailBtn.textContent = "🔍 Refresh Availability";
  refreshAvailBtn.title = "Mark sold/removed items as inactive, update last_seen_at for active ones";
  refreshAvailBtn.style.cssText = "width:100%;padding:12px;background:#6a1b9a;color:#fff;border:none;border-radius:9px;font:bold 14px Arial;cursor:pointer;";

  importModeBox.append(syncBtn, newOnlyBtn, refreshAvailBtn);

  const infoEl = document.createElement("div");
  infoEl.style.cssText = "font-size:11px;color:#888;margin-top:10px;text-align:center;";

  // ── Account Settings UI ──────────────────────────────────────────────────
  const settingsBox = document.createElement("div");
  settingsBox.style.cssText = "background:#fff8f0;border:1px solid #e65100;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;";
  settingsBox.innerHTML = "<b style='color:#e65100'>⚙️ Account Settings</b>";

  const tagRow = document.createElement("div");
  tagRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;";
  const tagLabel = document.createElement("label");
  tagLabel.textContent = "Account Tag:";
  tagLabel.style.cssText = "font-size:12px;color:#555;white-space:nowrap;";
  accountTagInput = document.createElement("input");
  accountTagInput.type = "text";
  accountTagInput.value = "crazymoe";
  accountTagInput.placeholder = "e.g. crazymoe2";
  accountTagInput.style.cssText = "flex:1;padding:4px 8px;border:1px solid #ccc;border-radius:5px;font-size:12px;";
  accountTagInput.addEventListener("change", () => {
    ACCOUNT = accountTagInput.value.trim() || "crazymoe";
    IS_PUBLISHED_DEFAULT = ACCOUNT === "crazymoe";
    publishedToggle.checked = IS_PUBLISHED_DEFAULT;
    updatePublishedLabel();
    try { chrome.storage.local.set({ cmoeAccountTag: ACCOUNT, cmoeIsPublished: IS_PUBLISHED_DEFAULT }); } catch(_) {}
  });
  tagRow.append(tagLabel, accountTagInput);

  const pubRow = document.createElement("div");
  pubRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;";
  const pubLabel = document.createElement("label");
  pubLabel.style.cssText = "font-size:12px;color:#555;white-space:nowrap;";
  publishedToggle = document.createElement("input");
  publishedToggle.type = "checkbox";
  publishedToggle.checked = true;
  publishedToggle.style.cssText = "width:16px;height:16px;cursor:pointer;";
  function updatePublishedLabel() {
    pubLabel.innerHTML = publishedToggle.checked
      ? "<b style='color:#27ae60'>✅ Visible on website</b> (customers can see)"
      : "<b style='color:#e65100'>🔒 Private / hidden</b> (admin only)";
  }
  updatePublishedLabel();
  publishedToggle.addEventListener("change", () => {
    IS_PUBLISHED_DEFAULT = publishedToggle.checked;
    updatePublishedLabel();
    try { chrome.storage.local.set({ cmoeIsPublished: IS_PUBLISHED_DEFAULT }); } catch(_) {}
  });
  pubRow.append(publishedToggle, pubLabel);
  settingsBox.append(tagRow, pubRow);

  body.append(settingsBox, statusEl, importModeBox, infoEl);

  try { chrome.storage.local.get("cmoeLastSync", r => { if (r?.cmoeLastSync) infoEl.textContent = "Last sync: " + new Date(r.cmoeLastSync).toLocaleString(); }); } catch(_) {}
  loadSupabaseConfig().then(() => { if (!hasSupabaseConfig()) setStatus("⚠️ Supabase is not configured — use Setup in the popup first."); });

  // ── Post Queue Section ────────────────────────────────────────────────────
  const divider = document.createElement("hr");
  divider.style.cssText = "border:none;border-top:1px solid #e0e0e0;margin:14px 0;";

  const queueSection = document.createElement("div");
  queueSection.style.cssText = "background:#f0faf0;border:1px solid #27ae60;border-radius:8px;padding:10px 12px;";
  queueSection.innerHTML = "<b style='color:#27ae60;font-size:13px;'>📬 Post Queue</b>";

  const queueStatus = document.createElement("div");
  queueStatus.style.cssText = "font-size:12px;color:#555;margin:6px 0 10px;min-height:18px;";
  queueStatus.textContent = "Loading queue...";

  const queueActions = document.createElement("div");
  queueActions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

  const startQueueBtn = document.createElement("button");
  startQueueBtn.textContent = "▶ Start Posting Queue";
  startQueueBtn.style.cssText = "flex:1;padding:9px;background:#27ae60;color:#fff;border:none;border-radius:7px;font:bold 13px Arial;cursor:pointer;";

  const stopQueueBtn = document.createElement("button");
  stopQueueBtn.textContent = "⏹ Stop";
  stopQueueBtn.style.cssText = "padding:9px 12px;background:#e74c3c;color:#fff;border:none;border-radius:7px;font:bold 13px Arial;cursor:pointer;";

  const refreshQueueBtn = document.createElement("button");
  refreshQueueBtn.textContent = "🔄";
  refreshQueueBtn.title = "Refresh queue count";
  refreshQueueBtn.style.cssText = "padding:9px 10px;background:#ddd;color:#333;border:none;border-radius:7px;font:13px Arial;cursor:pointer;";

  queueActions.append(startQueueBtn, stopQueueBtn, refreshQueueBtn);
  queueSection.append(queueStatus, queueActions);

  async function refreshQueueCount() {
    await loadSupabaseConfig();
    if (!hasSupabaseConfig()) { queueStatus.textContent = "Supabase not configured"; startQueueBtn.disabled = true; return; }
    try {
      const r = await fetch(`${SB_URL}/rest/v1/post_queue?select=status&status=in.(pending,done,failed)&limit=500`, {
        headers: { apikey: SB_KEY, Authorization: "Bearer "+SB_KEY }
      });
      const rows = await r.json();
      const pending = rows.filter(x=>x.status==="pending").length;
      const done    = rows.filter(x=>x.status==="done").length;
      queueStatus.innerHTML = pending > 0
        ? `<b style="color:#27ae60">${pending}</b> pending · <b>${done}</b> done`
        : done > 0 ? `<b style="color:#27ae60">✅ All done!</b> ${done} posted`
        : `<span style="color:#aaa">Queue empty</span>`;
      startQueueBtn.disabled = pending === 0;
    } catch(e) { queueStatus.textContent = "Error loading queue"; }
  }
  refreshQueueCount();

  startQueueBtn.addEventListener("click", async () => {
    // Set queue active flag so fb_fill.js auto-triggers
    try { await chrome.storage.local.set({ cmoeQueueActive: true }); } catch(_) {}
    // Navigate to FB create page on current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true }).catch(()=>[]);
    if (tabs[0]) {
      chrome.tabs.update(tabs[0].id, { url: "https://www.facebook.com/marketplace/create/item" });
    } else {
      window.open("https://www.facebook.com/marketplace/create/item", "_blank");
    }
    window.close(); // close popup
  });

  stopQueueBtn.addEventListener("click", async () => {
    try { await chrome.storage.local.remove("cmoeQueueActive"); } catch(_) {}
    queueStatus.innerHTML = `<span style="color:#e74c3c">⏹ Queue stopped</span>`;
    startQueueBtn.disabled = false;
  });

  refreshQueueBtn.addEventListener("click", () => refreshQueueCount());

  body.append(divider, queueSection);

  // ── Get captured FB token ─────────────────────────────────────────────────
  function getCapture() {
    try { const d = JSON.parse(localStorage.getItem("__fb_cap__") || "null"); if (d?.docId) return d; } catch(_) {}
    return { docId: KNOWN_DOC_ID, fbDtsg: "", cursor: "", vars: "{}", ts: 0 };
  }

  function getDtsgAndUser() {
    let dtsg = "", userID = "";
    try {
      const cap = JSON.parse(localStorage.getItem("__fb_main_cap__") || "null");
      if (cap?.fbDtsg) dtsg = cap.fbDtsg;
      if (cap?.vars) { try { const v = typeof cap.vars === "string" ? JSON.parse(cap.vars) : cap.vars; userID = v.sellerID || v.userID || v.seller_id || ""; } catch(_) {} }
    } catch(_) {}
    if (!dtsg || !userID) {
      document.querySelectorAll("script:not([src])").forEach(s => {
        const t = s.textContent || "";
        if (!dtsg) { const m = t.match(/"DTSGInitialData"[^}]{0,300}"token"\s*:\s*"([^"]+)"/) || t.match(/"fb_dtsg"\s*:\s*\{"value"\s*:\s*"([^"]+)"/); if (m) dtsg = m[1]; }
        if (!userID) { const m = t.match(/"USER_ID"\s*:\s*"(\d+)"/) || t.match(/"actorID"\s*:\s*"(\d+)"/); if (m) userID = m[1]; }
      });
    }
    return { dtsg, userID };
  }

  // ── Paginate FB active listings via GraphQL ───────────────────────────────
  async function paginateActive() {
    const cap = getCapture();
    const { dtsg, userID } = getDtsgAndUser();
    const docId = cap.docId || KNOWN_DOC_ID;
    const fbDtsg = cap.fbDtsg || dtsg || "";

    let baseVars = {};
    try { baseVars = JSON.parse(cap.vars || "{}"); } catch(_) {}
    let liveVars = null;
    try { const mc = JSON.parse(localStorage.getItem("__fb_main_cap__") || "null"); if (mc?.vars) liveVars = typeof mc.vars === "string" ? JSON.parse(mc.vars) : mc.vars; } catch(_) {}

    const listings = {};
    let cursor = cap.cursor || "";
    let pages = 0;

    function dec(s) {
      if (!s) return "";
      return s.replace(/\\n/g,"\n").replace(/\\t/g,"\t").replace(/\\"/g,'"')
               .replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))
               .replace(/\\\\/g,"\\");
    }

    function extract(obj) {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) { obj.forEach(extract); return; }
      if (obj.__typename === "MarketplaceListing" || obj.marketplace_listing_title) {
        const id = obj.id || obj.listing_id;
        if (id && /^\d{10,19}$/.test(id) && !listings[id]) {
          const price = obj.listing_price?.amount || obj.listing_price?.formatted_amount || "";
          const imgs = [];
          if (obj.primary_listing_photo?.image?.uri) imgs.push(obj.primary_listing_photo.image.uri);
          (obj.listing_photos || []).forEach(p => { if (p?.image?.uri) imgs.push(p.image.uri); });
          listings[id] = {
            facebook_id:  id,
            account_tag:  ACCOUNT,
            title:        dec(obj.marketplace_listing_title || ""),
            price:        parseFloat(String(price).replace(/[^0-9.]/g,"")) || null,
            description:  dec(obj.redacted_description?.text || obj.description?.text || ""),
            category:     obj.category_name || obj.marketplace_listing_category?.display_name || "",
            condition:    obj.item_condition || "",
            listing_url:  "https://www.facebook.com/marketplace/item/" + id + "/",
            images:       [...new Set(imgs)].slice(0,10),
            status:       "active",
            is_active:    true,
            is_published: IS_PUBLISHED_DEFAULT,
            synced_at:    new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          };
        }
      }
      Object.values(obj).forEach(v => { if (v && typeof v === "object") extract(v); });
    }

    while (pages < 300) {
      const vars = Object.assign({ count: 24 }, liveVars || baseVars);
      if (userID) { vars.sellerID = userID; vars.seller_id = userID; }
      if (cursor) vars.cursor = cursor; else delete vars.cursor;
      // Force ACTIVE state, strip any conflicting filters
      vars.marketplaceListingState = "ACTIVE";
      vars.listing_state = "ACTIVE";
      for (const k of ["filters","contextual_data","filter_by","filterBy","listing_status","listingStatus","state","listingState"]) delete vars[k];
      for (const k of Object.keys(vars)) { if (/^(status|state|filter)\[/.test(k)) delete vars[k]; }

      const params = new URLSearchParams({ doc_id: docId, variables: JSON.stringify(vars), server_timestamps: "true", __a: "1" });
      if (fbDtsg) params.set("fb_dtsg", fbDtsg);

      let text = "";
      try {
        const resp = await fetch("https://www.facebook.com/api/graphql/", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });
        text = await resp.text();
      } catch(e) { console.warn("[Sync] fetch error:", e.message); break; }

      const before = Object.keys(listings).length;
      try { extract(JSON.parse(text)?.data); } catch(_) { text.split("\n").forEach(line => { try { extract(JSON.parse(line)?.data); } catch(_) {} }); }
      const after = Object.keys(listings).length;
      console.log(`[Sync] page ${pages+1} +${after-before} total:${after}`);
      setStatus(`⏳ Paginating FB…<br><b>${after}</b> active listings found so far`);
      banner.textContent = `⚡ Crazy Moe's — Syncing… ${after} listings found`;

      const cm = text.match(/"end_cursor"\s*:\s*"([^"]+)"/);
      const hasNext = text.includes('"has_next_page":true');
      const newCursor = (hasNext && cm) ? cm[1] : "";
      if (!newCursor || after === before) break;
      cursor = newCursor; pages++;
      await sleep(300);
    }

    if (Object.keys(listings).length === 0) {
      console.log("[Sync] GraphQL returned 0; falling back to DOM scrape");
      setStatus("⏳ GraphQL returned 0. Falling back to visible-page scrape…");

      const norm = s => String(s || "").replace(/\s+/g, " ").trim();
      const parsePrice = s => {
        const m = String(s || "").match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
        return m ? parseFloat(m[1].replace(/,/g, "")) : null;
      };
      const isActionText = s => /^(share|renew listing|hide from friends|boost listing|mark as sold|mark out of stock|delete listing|view listing|pending|sold|in stock|out of stock)$/i.test(norm(s));
      const getCardHref = card => {
        const a = card.querySelector('a[href*="/marketplace/item/"]');
        const href = a?.href || a?.getAttribute('href') || '';
        return href ? (href.startsWith('http') ? href : `https://www.facebook.com${href}`) : '';
      };
      const extractId = (card, txt) => {
        const href = getCardHref(card);
        const m1 = href.match(/\/marketplace\/item\/(\d{6,25})/);
        if (m1) return m1[1];
        const m2 = String(txt || '').match(/\b(\d{10,25})\b/);
        return m2 ? m2[1] : '';
      };
      const getLikelyCard = el => {
        const chain = [];
        let cur = el;
        for (let i = 0; i < 8 && cur; i++, cur = cur.parentElement) chain.push(cur);
        return chain.find(node => {
          const txt = norm(node.innerText || '');
          const hasImage = !!node.querySelector('img');
          const hasPrice = /\$\s*[\d,]+/.test(txt);
          const hasAction = /(Mark as sold|Mark out of stock|Renew listing|Share)/i.test(txt);
          return txt.length > 30 && hasImage && hasPrice && hasAction;
        }) || el.closest('[role="article"]') || el.parentElement || el;
      };
      const titleFromCard = card => {
        const texts = Array.from(card.querySelectorAll('span, div, a'))
          .map(el => norm(el.textContent))
          .filter(Boolean);
        const choices = texts.filter(t =>
          t.length > 8 &&
          t.length < 220 &&
          !/^\$/.test(t) &&
          !/^Listed on /i.test(t) &&
          !/^\d+ clicks on listing$/i.test(t) &&
          !isActionText(t)
        );
        return choices.sort((a,b)=>b.length-a.length)[0] || "";
      };
      const collectCards = () => {
        const seedEls = Array.from(document.querySelectorAll('div, span, a, button')).filter(el => {
          const t = norm(el.textContent);
          const href = el.getAttribute && (el.getAttribute('href') || '');
          return /^(Mark as sold|Mark out of stock|Renew listing|Share)$/i.test(t) || /\/marketplace\/item\//i.test(href);
        });
        const cards = seedEls.map(getLikelyCard).filter(Boolean);
        const unique = [];
        const seen = new Set();
        for (const card of cards) {
          const txt = norm(card.innerText || '');
          const id = extractId(card, txt) || txt.slice(0, 120);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          unique.push(card);
        }
        return unique;
      };

      let stagnantPasses = 0;
      let lastCount = 0;
      for (let pass = 0; pass < 30; pass++) {
        const cards = collectCards();
        for (const card of cards) {
          const txt = norm(card.innerText || '');
          const id = extractId(card, txt);
          if (!id || listings[id]) continue;
          const imgs = Array.from(card.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => /^https?:/.test(src) && !/profile|scontent.*cp0/i.test(src));
          const activeStatus = /\b(active|in stock)\b/i.test(txt) ? 'active' : (/\bout of stock\b/i.test(txt) ? 'out_of_stock' : 'active');
          const href = getCardHref(card) || '';
          listings[id] = {
            facebook_id:  id,
            account_tag:  ACCOUNT,
            title:        titleFromCard(card) || `FB Listing ${id}`,
            price:        parsePrice(txt),
            description:  '',
            category:     '',
            condition:    '',
            listing_url:  href,
            images:       [...new Set(imgs)].slice(0,10),
            status:       activeStatus,
            is_active:    !/\b(sold|deleted|removed)\b/i.test(txt),
            is_published: IS_PUBLISHED_DEFAULT,
            synced_at:    new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          };
        }
        const count = Object.keys(listings).length;
        console.log(`[Sync] DOM pass ${pass+1} -> total:${count}`);
        if (count > lastCount) {
          stagnantPasses = 0;
          lastCount = count;
        } else {
          stagnantPasses++;
        }
        if (pass >= 3 && stagnantPasses >= 3) break;
        const before = Math.max(document.documentElement.scrollTop || 0, document.body.scrollTop || 0);
        window.scrollBy(0, Math.max(window.innerHeight * 1.5, 1200));
        await sleep(1400);
        window.scrollBy(0, 800);
        await sleep(800);
        const after = Math.max(document.documentElement.scrollTop || 0, document.body.scrollTop || 0);
        if (after <= before + 50) stagnantPasses++;
      }
    }

    return Object.values(listings);
  }

  // ── log to import_runs ────────────────────────────────────────────────────
  async function logImportRun(runType, counts) {
    try {
      await fetch(`${SB_URL}/rest/v1/import_runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "return=minimal" },
        body: JSON.stringify({
          account_tag:    ACCOUNT,
          run_type:       runType,
          finished_at:    new Date().toISOString(),
          new_count:      counts.new_count     || 0,
          updated_count:  counts.updated_count || 0,
          inactive_count: counts.inactive_count|| 0,
          error_count:    counts.errors        || 0,
          total_found:    counts.total_found   || 0
        })
      });
    } catch(e) { console.warn("[Sync] import_runs log error:", e.message); }
  }

  // ── Get existing facebook_ids from DB for this account ───────────────────
  async function getExistingIds() {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${TABLE}?select=facebook_id&account_tag=eq.${ACCOUNT}&limit=10000`, {
        headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }
      });
      const rows = await r.json();
      return new Set(rows.map(r => r.facebook_id));
    } catch(e) { return new Set(); }
  }

  // ── Sync to Supabase — 3 modes ────────────────────────────────────────────
  // mode: "full" | "new_only" | "availability_refresh"
  
  // ── Upload listing images to permanent Supabase storage ──────────────
  async function uploadListingImages(listing) {
    const imgs = listing.images || [];
    if (imgs.length === 0) return listing;
    const CM_STORAGE = SB_URL + '/storage/v1/object/listing-images';
    const permanent = [];
    for (let i = 0; i < Math.min(imgs.length, 3); i++) {
      const url = imgs[i];
      if (!url || !url.startsWith('http')) { permanent.push(url); continue; }
      // Skip if already permanent
      if (url.includes('supabase.co/storage')) { permanent.push(url); continue; }
      try {
        const resp = await fetch(url, {
          headers: {
            'Referer': 'https://www.facebook.com/marketplace/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (!resp.ok) { permanent.push(url); continue; }
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        if (!ct.startsWith('image/')) { permanent.push(url); continue; }
        const buf = await resp.arrayBuffer();
        if (buf.byteLength < 3000) { permanent.push(url); continue; }
        const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
        const path = `listings/${listing.facebook_id}/img_${i}.${ext}`;
        const up = await fetch(`${CM_STORAGE}/${path}`, {
          method: 'POST',
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': ct, 'x-upsert': 'true' },
          body: buf
        });
        if (up.ok) {
          permanent.push(SB_URL + '/storage/v1/object/public/listing-images/' + path);
        } else {
          permanent.push(url);
        }
      } catch(_) { permanent.push(url); }
    }
    return { ...listing, images: permanent };
  }

async function syncToSupabase(listings, onProgress, mode = "full") {
    const BATCH = 50;
    let synced = 0, errors = 0, newCount = 0, inactiveCount = 0;

    const existingIds = await getExistingIds();

    if (mode === "full") {
      // ── FULL: wipe + re-import all ──────────────────────────────────────
      setStatus("🧹 Clearing stale rows…");
      try {
        await fetch(`${SB_URL}/rest/v1/${TABLE}?account_tag=eq.${ACCOUNT}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "return=minimal" },
          body: JSON.stringify({ is_active: false, status: "inactive" }),
        });
      } catch(e) { console.warn("[Sync] clear error:", e.message); }
      await sleep(300);

      for (let i = 0; i < listings.length; i += BATCH) {
        // Upload images to permanent storage before saving
        const rawBatch = listings.slice(i, i + BATCH);
        const batch = [];
        for (const listing of rawBatch) {
          try { batch.push(await uploadListingImages(listing)); }
          catch(_) { batch.push(listing); }
        }
        try {
          const resp = await fetch(`${SB_URL}/rest/v1/${TABLE}?on_conflict=facebook_id,account_tag`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify(batch),
          });
          if (!resp.ok) { errors += batch.length; console.error("[Sync] upsert error:", await resp.text()); }
          else { synced += batch.length; newCount += batch.filter(l => !existingIds.has(l.facebook_id)).length; }
        } catch(e) { errors += batch.length; }
        if (onProgress) onProgress(Math.min(i + BATCH, listings.length), listings.length);
        await sleep(150);
      }

    } else if (mode === "new_only") {
      // ── NEW ONLY: insert IDs not in DB yet ──────────────────────────────
      const fresh = listings.filter(l => !existingIds.has(l.facebook_id));
      setStatus(`⚡ ${fresh.length} new listings to insert…`);
      for (let i = 0; i < fresh.length; i += BATCH) {
        const rawBatch2 = fresh.slice(i, i + BATCH);
        const batch = [];
        for (const listing of rawBatch2) {
          try { batch.push(await uploadListingImages(listing)); }
          catch(_) { batch.push(listing); }
        }
        try {
          const resp = await fetch(`${SB_URL}/rest/v1/${TABLE}?on_conflict=facebook_id,account_tag`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify(batch),
          });
          if (!resp.ok) errors += batch.length;
          else { synced += batch.length; newCount += batch.length; }
        } catch(e) { errors += batch.length; }
        if (onProgress) onProgress(Math.min(i + BATCH, fresh.length), fresh.length);
        await sleep(150);
      }

    } else if (mode === "availability_refresh") {
      // ── AVAILABILITY: mark missing as inactive, update last_seen_at ─────
      const liveIds = new Set(listings.map(l => l.facebook_id));

      // Find IDs in DB that are NOT in live feed → mark inactive
      const toDeactivate = [...existingIds].filter(id => !liveIds.has(id));
      if (toDeactivate.length > 0) {
        setStatus(`🔍 Marking ${toDeactivate.length} sold/removed items…`);
        for (let i = 0; i < toDeactivate.length; i += BATCH) {
          const batchIds = toDeactivate.slice(i, i + BATCH).map(id => `"${id}"`).join(",");
          try {
            await fetch(`${SB_URL}/rest/v1/${TABLE}?facebook_id=in.(${batchIds})&account_tag=eq.${ACCOUNT}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "return=minimal" },
              body: JSON.stringify({ is_active: false, status: "inactive" }),
            });
            inactiveCount += toDeactivate.slice(i, i + BATCH).length;
          } catch(e) {}
          await sleep(100);
        }
      }

      // Update last_seen_at for all still-active ones in batches
      const stillActive = listings.filter(l => existingIds.has(l.facebook_id));
      setStatus(`✅ Updating last_seen_at for ${stillActive.length} active items…`);
      for (let i = 0; i < stillActive.length; i += BATCH) {
        const batch = stillActive.slice(i, i + BATCH);
        try {
          const resp = await fetch(`${SB_URL}/rest/v1/${TABLE}?on_conflict=facebook_id,account_tag`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify(batch.map(l => ({ ...l, synced_at: new Date().toISOString(), last_seen_at: new Date().toISOString() }))),
          });
          if (resp.ok) synced += batch.length;
        } catch(e) {}
        if (onProgress) onProgress(Math.min(i + BATCH, stillActive.length), stillActive.length);
        await sleep(150);
      }
    }

    await logImportRun(mode, { new_count: newCount, updated_count: synced, inactive_count: inactiveCount, errors, total_found: listings.length });
    return { synced, errors, newCount, inactiveCount };
  }

  // ── Shared run logic ─────────────────────────────────────────────────────
  async function runImport(mode) {
    await loadSupabaseConfig();
    if (!hasSupabaseConfig()) { setStatus("⚠️ Supabase is not configured — use Setup in the popup first."); return; }
    const btns = [syncBtn, newOnlyBtn, refreshAvailBtn];
    if (btns.some(b => b.dataset.busy === "1")) return;
    btns.forEach(b => { b.dataset.busy = "1"; b.disabled = true; });
    const labels = { full: ["🔄 Full Import","#e65100"], new_only: ["⚡ Import New Only","#1565c0"], availability_refresh: ["🔍 Refresh Availability","#6a1b9a"] };
    const activeBtn = mode === "full" ? syncBtn : mode === "new_only" ? newOnlyBtn : refreshAvailBtn;
    activeBtn.textContent = "⏳ Working…"; activeBtn.style.background = "#555";
    banner.textContent = "⚡ Crazy Moe's — Importing…";

    try {
      setStatus("⏳ Connecting to Facebook…");
      const listings = await paginateActive();
      if (listings.length === 0) {
        setStatus("⚠️ Got 0 listings. Refresh and try again.");
        banner.textContent = "⚡ Crazy Moe's — Sync failed (0 listings)";
        btns.forEach((b,i) => { b.dataset.busy="0"; b.disabled=false; b.textContent=["🔄 Full Import","⚡ Import New Only","🔍 Refresh Availability"][i]; b.style.background=["#e65100","#1565c0","#6a1b9a"][i]; });
        return;
      }
      setStatus(`✅ Found <b>${listings.length}</b> listings on FB…`);
      const result = await syncToSupabase(listings, (done, total) => { setStatus(`💾 ${mode.replace("_"," ")}… <b>${done} / ${total}</b>`); }, mode);
      const now = new Date();
      try { chrome.storage.local.set({ cmoeLastSync: now.toISOString() }); } catch(_) {}
      const modeLabels = { full: "Full sync", new_only: "New only", availability_refresh: "Availability refresh" };
      let msg = `✅ <b>${modeLabels[mode]} complete!</b><br>`;
      if (mode === "full")                  msg += `${result.synced} listings synced`;
      if (mode === "new_only")              msg += `${result.newCount} new listings added`;
      if (mode === "availability_refresh")  msg += `${result.synced} active · ${result.inactiveCount} marked sold`;
      if (result.errors > 0) msg += `<br><small style="color:#c00">${result.errors} errors</small>`;
      setStatus(msg);
      banner.textContent = `⚡ Crazy Moe's — ✅ ${modeLabels[mode]} done`;
      infoEl.textContent = "Last sync: " + now.toLocaleString();
      refreshQueueCount();
    } catch(e) {
      console.error("[CrazyMoe Sync] error:", e);
      setStatus("❌ Error: " + e.message);
      banner.textContent = "⚡ Crazy Moe's — ❌ Sync error";
    }
    btns.forEach((b,i) => { b.dataset.busy="0"; b.disabled=false; b.textContent=["🔄 Full Import","⚡ Import New Only","🔍 Refresh Availability"][i]; b.style.background=["#e65100","#1565c0","#6a1b9a"][i]; });
  }

  syncBtn.addEventListener("click",        () => runImport("full"));
  newOnlyBtn.addEventListener("click",     () => runImport("new_only"));
  refreshAvailBtn.addEventListener("click",() => runImport("availability_refresh"));

  console.log("[CrazyMoe Sync] panel ready on", location.href);
})();
