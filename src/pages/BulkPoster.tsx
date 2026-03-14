import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────
interface Listing {
  id: number;
  facebook_id: string;
  account_tag: string;
  title: string;
  price: number | null;
  condition: string;
  category: string;
  listing_url: string;
  images: string[];
  status: string;
  is_active: boolean;
  is_published: boolean;
  synced_at: string;
  description?: string;
}

interface QueueCounts { pending: number; done: number; failed: number; }

const SB_URL   = "https://sfheqjnxlkygjfohoybo.supabase.co";
const SB_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaGVxam54bGt5Z2pmb2hveWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTc3NjUsImV4cCI6MjA4MzkzMzc2NX0.oWEnB48w_k_hOtYM1Ls2AHj8j-THDs_43BBzXrqPyxY";
const AI_MODEL = "claude-sonnet-4-20250514";
const sbH = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" };

// ── Supabase paginated fetch (bypasses 1000-row cap) ─────────────────────────
async function fetchAllPages(path: string): Promise<Listing[]> {
  const PAGE = 1000;
  let offset = 0, all: Listing[] = [];
  while (true) {
    const r = await fetch(SB_URL + path, {
      headers: { ...sbH, "Range-Unit": "items", "Range": `${offset}-${offset + PAGE - 1}`, "Prefer": "count=none" }
    });
    if (!r.ok) throw new Error("Fetch error " + r.status);
    const batch: Listing[] = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all = all.concat(batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function sbPost(path: string, body: unknown) {
  const r = await fetch(SB_URL + path, { method: "POST", headers: { ...sbH, Prefer: "return=representation" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("POST " + r.status + " " + await r.text());
  return r.json();
}

async function sbPatch(path: string, body: unknown) {
  await fetch(SB_URL + path, { method: "PATCH", headers: { ...sbH, Prefer: "return=minimal" }, body: JSON.stringify(body) });
}

async function sbDelete(path: string) {
  await fetch(SB_URL + path, { method: "DELETE", headers: sbH });
}

function manualTweak(text: string) {
  return (text || "")
    .replace(/NEW SEALED/g, "Brand New Sealed").replace(/NIB/g, "Never Opened")
    .replace(/PACK OF (\d+)/g, "$1-Pack").replace(/^NEW\b/, "Sealed New")
    .replace(/Special Offers?$/i, "").replace(/Finance Options?$/i, "").trim();
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BulkPoster() {
  const [allListings, setAllListings]   = useState<Listing[]>([]);
  const [filtered, setFiltered]         = useState<Listing[]>([]);
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [accounts, setAccounts]         = useState<string[]>([]);
  const [categories, setCategories]     = useState<string[]>([]);
  const [queueCounts, setQueueCounts]   = useState<QueueCounts>({ pending: 0, done: 0, failed: 0 });

  // Filters
  const [search, setSearch]             = useState("");
  const [filterAcc, setFilterAcc]       = useState("");
  const [filterCat, setFilterCat]       = useState("");
  const [filterPub, setFilterPub]       = useState("");

  // Config
  const [cfgAccount, setCfgAccount]     = useState("");
  const [cfgAlteration, setCfgAlteration] = useState("medium");
  const [cfgImg, setCfgImg]             = useState("subtle");

  // Progress
  const [showProgress, setShowProgress] = useState(false);
  const [progPct, setProgPct]           = useState(0);
  const [progStatus, setProgStatus]     = useState("");
  const [progLog, setProgLog]           = useState<string[]>([]);
  const [progDone, setProgDone]         = useState(false);

  // Toast
  const [toast, setToast]               = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const addLog = useCallback((msg: string) => {
    setProgLog(prev => [...prev, msg]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }, []);

  // ── Load inventory ──────────────────────────────────────────────────────────
  const loadInventory = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await fetchAllPages(
        `/rest/v1/active_listings?select=id,facebook_id,account_tag,title,price,condition,category,listing_url,images,status,is_active,is_published,synced_at&is_active=eq.true&status=eq.active&order=account_tag.asc,synced_at.desc`
      );
      setAllListings(rows);
      const accs = [...new Set(rows.map(l => l.account_tag).filter(Boolean))].sort();
      const cats = [...new Set(rows.map(l => l.category).filter(Boolean))].sort();
      setAccounts(accs);
      setCategories(cats);
      if (accs.length > 0 && !cfgAccount) setCfgAccount(accs[0]);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [cfgAccount]);

  // ── Load queue counts ───────────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/post_queue?select=status&limit=500`, { headers: sbH });
      const rows: { status: string }[] = await r.json();
      setQueueCounts({
        pending: rows.filter(r => r.status === "pending").length,
        done:    rows.filter(r => r.status === "done").length,
        failed:  rows.filter(r => r.status === "failed").length,
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadInventory(); loadQueue(); }, []);

  // ── Filtering ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(allListings.filter(l => {
      if (q && !l.title?.toLowerCase().includes(q)) return false;
      if (filterAcc && l.account_tag !== filterAcc) return false;
      if (filterCat && l.category !== filterCat)    return false;
      if (filterPub === "true"  && !l.is_published) return false;
      if (filterPub === "false" &&  l.is_published) return false;
      return true;
    }));
  }, [allListings, search, filterAcc, filterCat, filterPub]);

  // ── Selection ───────────────────────────────────────────────────────────────
  const toggleCard = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll   = () => setSelected(new Set(filtered.map(l => l.id)));
  const clearSelect = () => setSelected(new Set());

  // ── AI Rewrite ──────────────────────────────────────────────────────────────
  async function aiRewriteBatch(listings: Listing[], level: string) {
    const lvl: Record<string, string> = {
      light:  "Subtle changes: reorder words, use a synonym or two, vary punctuation. Keep 90% of original.",
      medium: "Clear paraphrase: restructure sentences, use synonyms, change word order. Keep all facts, model numbers, brands. ~50% different.",
      heavy:  "Strong rewrite: completely different structure and words while preserving all product facts. ~80% different."
    };
    const prompt = `Rephrase these Facebook Marketplace product listings. Level: ${lvl[level]}
Rules: Never change model numbers, dimensions, or prices. Always keep brand names. Keep NEW/SEALED indicators (can rephrase as "Factory Sealed", "Never Opened", etc). Titles max 99 chars. Return ONLY valid JSON array, no markdown.

Input: ${JSON.stringify(listings.map(l => ({ id: l.id, title: l.title || "", desc: (l.description || "").slice(0, 500) })))}

Return: [{"id": <number>, "altered_title": "<string>", "altered_desc": "<string>"}]`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 4000, messages: [{ role: "user", content: prompt }] })
    });
    if (!resp.ok) throw new Error("Claude API " + resp.status);
    const data = await resp.json();
    const text = (data.content.find((b: { type: string }) => b.type === "text") as { text: string })?.text || "";
    const parsed: { id: number; altered_title: string; altered_desc: string }[] = JSON.parse(text.replace(/```json|```/g, "").trim());
    return listings.map(l => {
      const f = parsed.find(p => p.id === l.id);
      return { id: l.id, altered_title: f?.altered_title || manualTweak(l.title), altered_desc: f?.altered_desc || manualTweak(l.description || "") };
    });
  }

  // ── Prepare Queue ───────────────────────────────────────────────────────────
  const prepareQueue = async () => {
    if (!selected.size) return;
    const toProcess = allListings.filter(l => selected.has(l.id));
    setShowProgress(true); setProgDone(false); setProgLog([]); setProgPct(0);
    setProgStatus(`Preparing ${toProcess.length} listings...`);
    addLog(`Selected: ${toProcess.length} listings → Target: ${cfgAccount}`);

    const BATCH = 20;
    const allAltered: { id: number; altered_title: string; altered_desc: string }[] = [];

    for (let i = 0; i < toProcess.length; i += BATCH) {
      const batch = toProcess.slice(i, i + BATCH);
      const bNum = Math.floor(i / BATCH) + 1;
      const total = Math.ceil(toProcess.length / BATCH);
      setProgPct(Math.round((i / toProcess.length) * 60));
      setProgStatus(`🤖 AI rewriting batch ${bNum}/${total}...`);
      addLog(`Batch ${bNum}: ${batch.length} listings...`);
      try {
        const altered = await aiRewriteBatch(batch, cfgAlteration);
        allAltered.push(...altered);
        addLog(`✓ Batch ${bNum} done`);
      } catch (e: unknown) {
        addLog(`✗ Batch ${bNum} error: ${(e as Error).message} — using originals`);
        batch.forEach(l => allAltered.push({ id: l.id, altered_title: manualTweak(l.title), altered_desc: manualTweak(l.description || "") }));
      }
    }

    setProgPct(65); setProgStatus(`💾 Adding ${allAltered.length} items to queue...`);
    addLog("Inserting into post_queue...");

    let queued = 0, errors = 0;
    for (let i = 0; i < allAltered.length; i += 50) {
      const batch = allAltered.slice(i, i + 50);
      const rows = batch.map(a => {
        const orig = allListings.find(l => l.id === a.id)!;
        return {
          listing_id: a.id, facebook_id: orig.facebook_id, account_target: cfgAccount,
          original_title: orig.title || "", original_desc: orig.description || "",
          altered_title: a.altered_title.slice(0, 99), altered_desc: a.altered_desc.slice(0, 8000),
          price: orig.price, condition: orig.condition, category: orig.category,
          images: orig.images, alter_seed: Math.random(), status: "pending"
        };
      });
      try {
        await sbPost("/rest/v1/post_queue", rows);
        queued += batch.length;
        setProgPct(65 + Math.round((i / allAltered.length) * 30));
        setProgStatus(`Queued ${queued}/${allAltered.length}...`);
      } catch (e: unknown) { errors += batch.length; addLog(`✗ Insert error: ${(e as Error).message}`); }
    }

    setProgPct(100); setProgStatus(`✅ Done! ${queued} listings queued`);
    addLog(`\n✅ Complete: ${queued} queued, ${errors} errors`);
    addLog(`💡 Go to Facebook (as "${cfgAccount}") → open extension → click ▶ Start Posting Queue`);
    setProgDone(true);
    clearSelect();
    loadQueue();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans pb-32">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#181818] border-b-2 border-orange-600 px-6 py-3 flex items-center justify-between">
        <h1 className="font-black text-xl tracking-widest text-orange-500 uppercase">
          Bulk <span className="text-white">FB Poster</span>
        </h1>
        <div className="flex gap-3 text-xs font-mono">
          <span className="bg-[#222] border border-[#333] rounded-full px-3 py-1">
            Loaded: <b className="text-orange-400">{allListings.length}</b>
          </span>
          <span className="bg-[#222] border border-[#333] rounded-full px-3 py-1">
            Queue: <b className="text-orange-400">{queueCounts.pending} pending</b>
          </span>
        </div>
      </div>

      {/* Queue status bar */}
      {(queueCounts.pending + queueCounts.done + queueCounts.failed) > 0 && (
        <div className="mx-6 mt-4 bg-[#1a1200] border border-orange-700 rounded-xl px-5 py-3 flex items-center gap-4 flex-wrap">
          <span className="font-black text-amber-400 tracking-wider text-sm">📬 POST QUEUE</span>
          <span className="text-xs border border-amber-400 text-amber-400 rounded-full px-3 py-0.5">{queueCounts.pending} pending</span>
          <span className="text-xs border border-green-500 text-green-400 rounded-full px-3 py-0.5">{queueCounts.done} done</span>
          <span className="text-xs border border-red-500 text-red-400 rounded-full px-3 py-0.5">{queueCounts.failed} failed</span>
          <div className="ml-auto flex gap-2">
            <button onClick={async () => { await sbDelete("/rest/v1/post_queue?status=eq.done"); loadQueue(); showToast("🗑 Done items cleared"); }}
              className="text-xs bg-[#333] hover:bg-[#444] text-white px-3 py-1 rounded-lg">Clear Done</button>
            <button onClick={loadQueue} className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded-lg">🔄 Refresh</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-[#181818] border-b border-[#2a2a2a] px-6 py-3 flex gap-3 flex-wrap items-center mt-1">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search listings..."
          className="bg-[#222] border border-[#333] rounded-lg text-sm px-3 py-2 text-white w-52 focus:outline-none focus:border-orange-500" />
        <select value={filterAcc} onChange={e => setFilterAcc(e.target.value)}
          className="bg-[#222] border border-[#333] rounded-lg text-sm px-3 py-2 text-white focus:outline-none focus:border-orange-500">
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-[#222] border border-[#333] rounded-lg text-sm px-3 py-2 text-white focus:outline-none focus:border-orange-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPub} onChange={e => setFilterPub(e.target.value)}
          className="bg-[#222] border border-[#333] rounded-lg text-sm px-3 py-2 text-white focus:outline-none focus:border-orange-500">
          <option value="">Any Visibility</option>
          <option value="true">✅ Public</option>
          <option value="false">🔒 Private</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={selectAll} className="text-xs bg-[#333] hover:bg-[#444] text-white px-3 py-2 rounded-lg border border-[#444]">Select All</button>
          <button onClick={clearSelect} className="text-xs bg-[#333] hover:bg-[#444] text-white px-3 py-2 rounded-lg border border-[#444]">Clear</button>
          <button onClick={() => { loadInventory(); loadQueue(); }} className="text-xs bg-[#333] hover:bg-[#444] text-white px-3 py-2 rounded-lg border border-[#444]">🔄 Refresh</button>
        </div>
      </div>

      {/* Config bar (visible when items selected) */}
      {selected.size > 0 && (
        <div className="mx-6 mt-4 bg-gradient-to-br from-[#1a0a00] to-[#1a1200] border border-orange-600 rounded-xl px-6 py-4">
          <h3 className="font-black text-orange-400 tracking-wider mb-3 text-sm uppercase">⚙️ Posting Configuration</h3>
          <div className="flex gap-4 flex-wrap">
            {[
              { label: "Target FB Account", id: "acc", value: cfgAccount, setter: setCfgAccount, opts: accounts.map(a => ({ v: a, l: a })) },
              { label: "AI Alteration Level", id: "alt", value: cfgAlteration, setter: setCfgAlteration, opts: [{ v: "light", l: "Light (subtle)" }, { v: "medium", l: "Medium (recommended)" }, { v: "heavy", l: "Heavy (strong rewrite)" }] },
              { label: "Image Variation", id: "img", value: cfgImg, setter: setCfgImg, opts: [{ v: "subtle", l: "Subtle (1-3% crop)" }, { v: "moderate", l: "Moderate (2-5%)" }] },
            ].map(f => (
              <div key={f.id} className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">{f.label}</label>
                <select value={f.value} onChange={e => f.setter(e.target.value)}
                  className="bg-[#222] border border-orange-700 text-white text-sm rounded-lg px-3 py-2 min-w-[12rem] focus:outline-none focus:border-orange-500">
                  {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            <div className="flex flex-col gap-1 ml-auto">
              <label className="text-xs text-gray-400">Action</label>
              <button onClick={prepareQueue}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-lg px-5 py-2 shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                📬 Add {selected.size} to Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="px-6 mt-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-gray-400 animate-pulse">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Loading listings...
            </div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-center py-12">{error}</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-400">{filtered.length} listings</div>
              <div className="text-xs text-orange-400 font-bold">{selected.size} selected</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(l => (
                <div key={l.id} onClick={() => toggleCard(l.id)}
                  className={`relative cursor-pointer group rounded-xl overflow-hidden border-2 transition-all ${selected.has(l.id) ? "border-orange-500 ring-1 ring-orange-500/30" : "border-[#333] hover:border-orange-500/50"} bg-[#181818]`}>
                  {l.images && l.images.length > 0 && (
                    <div className="aspect-square bg-[#222] overflow-hidden">
                      <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-2 text-white">{l.title}</h3>
                      <span className="text-orange-400 font-bold text-sm whitespace-nowrap">${l.price ?? 0}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                      <span className="bg-[#222] border border-[#333] rounded px-2 py-0.5">{l.account_tag}</span>
                      <span className="bg-[#222] border border-[#333] rounded px-2 py-0.5">{l.category}</span>
                      <span className="bg-[#222] border border-[#333] rounded px-2 py-0.5">{l.condition}</span>
                    </div>
                    <div className="mt-2 text-xs flex items-center gap-2">
                      {l.is_published ? <span className="text-green-400">● Public</span> : <span className="text-gray-500">● Private</span>}
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500">{new Date(l.synced_at).toLocaleDateString()}</span>
                    </div>
                    {selected.has(l.id) && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-black font-bold text-xs rounded-full w-6 h-6 flex items-center justify-center">✓</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Progress Modal */}
      {showProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#181818] border border-orange-600 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-black text-orange-400 tracking-wider mb-4">Posting Progress</h3>
            <div className="w-full bg-[#222] h-2 rounded-full overflow-hidden mb-4">
              <div className="bg-gradient-to-r from-orange-600 to-amber-400 h-full transition-all duration-300" style={{ width: `${progPct}%` }} />
            </div>
            <div className="text-sm text-gray-300 mb-3">{progStatus}</div>
            <div ref={logRef} className="bg-[#111] border border-[#333] rounded-xl h-48 overflow-y-auto p-3 font-mono text-xs text-gray-400 space-y-1">
              {progLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            {progDone && (
              <div className="mt-4 flex justify-end">
                <button onClick={() => setShowProgress(false)} className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2 rounded-lg">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-orange-600 text-white font-bold px-4 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
