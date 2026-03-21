import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Upload, MessageSquare, Users, BarChart3, Search, X, Check,
  Edit3, ChevronDown, Inbox, Bell, Tag, Bookmark,
  CheckCircle2, Clock, Zap, ChevronRight, LayoutGrid,
  ListChecks, AlertTriangle, Calendar, Target, FolderOpen, Eye, EyeOff,
  ChevronLeft
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
const C = {
  bg: '#070b12', card: '#0c1220', card2: '#101826', border: '#1c2a3e',
  borderLight: '#243347', text: '#e8edf5', muted: '#5a7394', mutedLight: '#7a95b0',
  amber: '#f59e0b', amberDim: '#d97706',
  green: '#10b981', blue: '#3b82f6', purple: '#a855f7',
  red: '#ef4444', orange: '#f97316', cyan: '#06b6d4', pink: '#ec4899',
};

const STATUSES = ['new','active','waiting on customer','waiting on me','follow-up','sold','refunded','closed'];
const SC = {
  new: C.blue, active: C.green, 'waiting on customer': C.amber,
  'waiting on me': C.orange, 'follow-up': C.cyan, sold: C.purple,
  refunded: C.red, closed: C.muted,
};
const DONE = ['sold','refunded','closed'];

const DEFAULT_TAGS = ['hot lead','VIP','sold','follow-up','refunded','no-show','pending pickup','repeat buyer','issue'];
const TC = {
  'hot lead': C.pink, VIP: C.purple, sold: C.green, 'follow-up': C.blue,
  refunded: C.red, 'no-show': '#4b5563', 'pending pickup': C.amber,
  'repeat buyer': C.cyan, issue: C.orange,
};

// ═══════════════════════════════════════════
// SYSTEM MESSAGE DETECTION  (FIX #3)
// ═══════════════════════════════════════════
const SYSTEM_PATTERNS = [
  /^you started a chat/i,
  /started this chat/i,
  /waiting for your response/i,
  /you're all caught up/i,
  /say hi to/i,
  /you can now message/i,
  /facebook pay/i,
  /pay with messenger/i,
  /this message is no longer available/i,
  /you sent an attachment/i,
  /you opened a marketplace listing/i,
  /this content isn.t available/i,
  /\btap to pay\b/i,
  /^messenger$/i,
  /^facebook$/i,
  /seller joined/i,
  /buyer joined/i,
  /you are now connected/i,
  /to keep marketplace safe/i,
  /never share your financial/i,
  /this is a reminder to follow/i,
  /be careful with/i,
];
const isSystemMsg = (content) => !content || SYSTEM_PATTERNS.some(p => p.test(content.trim()));

// ═══════════════════════════════════════════
// DATE UTILS
// ═══════════════════════════════════════════
const dateStr = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const todayStr    = () => dateStr(0);
const tomorrowStr = () => dateStr(1);

function fmtNad(nad, status = '') {
  if (!nad) return null;
  const t = todayStr(), tm = tomorrowStr();
  const done = DONE.includes(status);
  if (!done && nad < t)  return { label: 'OVERDUE',   color: C.red,       urgent: true };
  if (nad === t)          return { label: 'Today',     color: C.amber,     urgent: false };
  if (nad === tm)         return { label: 'Tomorrow',  color: C.cyan,      urgent: false };
  const d = new Date(nad + 'T12:00:00');
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: C.mutedLight, urgent: false };
}

// ═══════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════
const PRODUCTS = {
  'TV / Display':   ['tv','television','monitor','samsung','lg oled','sony','vizio','tcl','4k','smart tv','qled'],
  'Phone / Tablet': ['iphone','galaxy','pixel','smartphone','android','tablet','ipad','s22','s23','s24'],
  'Laptop / PC':    ['laptop','macbook','dell','hp laptop','lenovo','asus','chromebook','desktop','imac'],
  'Gaming':         ['xbox','playstation','ps4','ps5','nintendo','switch','gaming','console','controller'],
  'Furniture':      ['sofa','couch','sectional','chair','table','desk','bed frame','dresser','bookshelf'],
  'Appliances':     ['fridge','refrigerator','washer','dryer','dishwasher','microwave','oven','stove'],
  'Tools':          ['dewalt','milwaukee','drill','saw','tool set','wrench','hammer','ladder','compressor'],
  'Auto / Wheels':  ['wheel','rim','tire','bumper','hood','truck part','car part','exhaust'],
  'Camera / Audio': ['camera','canon','nikon','lens','gopro','dslr','speaker','soundbar','headphones'],
  'Clothing':       ['shirt','jacket','shoes','sneakers','size m','size l','size xl','dress','coat'],
};
const detectProduct = text => {
  const low = text.toLowerCase();
  for (const [cat, kws] of Object.entries(PRODUCTS))
    if (kws.some(k => low.includes(k))) return cat;
  return null;
};

// ═══════════════════════════════════════════
// DATA PARSING
// ═══════════════════════════════════════════
function parseThread(t, idx) {
  const parts = (t.participants || []).map(p => (typeof p === 'string' ? p : p.name)).filter(Boolean);
  const msgs = (t.messages || []).map(m => ({
    id: `${t.thread_path || idx}_${m.timestamp_ms}`,
    sender: m.sender_name || 'Unknown',
    content: m.content || '',
    ts: m.timestamp_ms || 0,
    hasPhoto: !!(m.photos?.length),
    hasShare: !!m.share,
    reactions: m.reactions || [],
    isSystem: isSystemMsg(m.content || ''),
  })).sort((a, b) => a.ts - b.ts);
  const allText = msgs.map(m => m.content).join(' ');
  return {
    id: t.thread_path || `t_${idx}_${Date.now()}`,
    title: t.title || parts.join(', ') || 'Conversation',
    participants: parts, messages: msgs,
    lastTs: msgs[msgs.length - 1]?.ts || 0,
    firstTs: msgs[0]?.ts || 0,
    msgCount: msgs.length,
    product: detectProduct(allText),
  };
}

function parseFBExport(raw) {
  const d = Array.isArray(raw) ? raw[0] : raw;
  if (d?.conversations) return d.conversations.map((c, i) => parseThread(c, i));
  if (d?.messages)      return [parseThread(d, 0)];
  if (d?.participants)  return [parseThread(d, 0)];
  return [];
}

function detectMyName(convs) {
  if (!convs.length) return 'Me';
  const c = {};
  convs.forEach(cv => new Set(cv.messages.map(m => m.sender)).forEach(s => { c[s] = (c[s] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Me';
}

// ═══════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════
function genSample() {
  const now = Date.now(), D = 86400000, me = 'Moe';
  const raw = [
    { t:'Sarah Mitchell',  p:'TV / Display',   m:[[me,'65" Samsung still available?',now-7*D],['Sarah Mitchell','Yes! $200 firm',now-7*D+5e4],[me,'Can do $180, pick up today?',now-7*D+1e5],['Sarah Mitchell','Deal, come after 3pm',now-7*D+15e4],[me,'On my way!',now-7*D+18e4]] },
    { t:'James Rodriguez', p:'Phone / Tablet',  m:[['James Rodriguez','iPhone 14 still for sale?',now-3*D],[me,'Yes! $450 like new',now-3*D+3e4],['James Rodriguez','$400?',now-3*D+6e4],[me,'$430 is my lowest',now-3*D+9e4],['James Rodriguez','Deal! Tomorrow 10am?',now-3*D+12e4],[me,'Perfect, see you then',now-2*D]] },
    { t:'Linda Chen',      p:'Laptop / PC',     m:[['Linda Chen','MacBook Pro available?',now-1*D],[me,'$800 M1 2021',now-1*D+2e4],['Linda Chen','Specs?',now-1*D+5e4],[me,'8GB 256GB SSD',now-1*D+8e4],['Linda Chen','$700?',now-1*D+10e4],[me,'$750 is my lowest',now-1*D+12e4],['Linda Chen','Let me think',now-1*D+14e4]] },
    { t:'Marcus Williams', p:'TV / Display',    m:[['Marcus Williams','Gaming monitor?',now-5*D],[me,'27" 144hz LG $150',now-5*D+4e4],['Marcus Williams','HDR?',now-5*D+8e4],[me,'HDR400',now-5*D+10e4],['Marcus Williams','Taking it!',now-5*D+12e4],[me,'Come Saturday noon',now-4*D],['Marcus Williams','See you then!',now-4*D+1e4]] },
    { t:'Ashley Thompson', p:'Gaming',          m:[['Ashley Thompson','PS5 available?',now-2*D],[me,'$400 with 2 controllers',now-2*D+2e4],['Ashley Thompson','Disc?',now-2*D+4e4],[me,'Yes disc version',now-2*D+6e4],['Ashley Thompson','Need to confirm, I\'ll get back to you',now-2*D+8e4],[me,'No problem!',now-2*D+10e4]] },
    { t:'Robert Davis',    p:'Furniture',       m:[['Robert Davis','Dining table available?',now-10*D],[me,'$120 solid wood',now-10*D+3e4],['Robert Davis','Any damage?',now-10*D+6e4],[me,'Minor scratch, otherwise perfect',now-10*D+9e4],['Robert Davis','I\'ll take it, hold till tomorrow?',now-9*D],[me,'Held for you!',now-9*D+1e4],['Robert Davis','Coming at 11am',now-9*D+5e4],[me,'See you at 11!',now-9*D+6e4]] },
    { t:'Emily Foster',    p:'Appliances',      m:[['Emily Foster','Washer/dryer set available?',now-4*D],[me,'$300 for the set',now-4*D+2e4],['Emily Foster','Do they work?',now-4*D+4e4],[me,'100% working, only 3 years old',now-4*D+6e4],['Emily Foster','I\'ll come tomorrow at 2pm',now-3*D],[me,'Perfect!',now-3*D+1e4]] },
    { t:'Kevin Park',      p:'Furniture',       m:[['Kevin Park','Office chair available?',now-6*D],[me,'$80',now-6*D+3e4],['Kevin Park','Fully adjustable?',now-6*D+6e4],[me,'Yes, height and armrests',now-6*D+9e4],['Kevin Park','I\'ll take it, Saturday?',now-5*D],[me,'Saturday works!',now-5*D+1e4]] },
    { t:'Maria Gonzalez',  p:'Phone / Tablet',  m:[['Maria Gonzalez','Galaxy S23 available?',now-26e4],[me,'$350',now-26e4+3e4],['Maria Gonzalez','Any cracks?',now-26e4+6e4],[me,'Perfect, screen protector still on',now-26e4+9e4],['Maria Gonzalez','Sold! Coming today after work',now-26e4+12e4]] },
    { t:'Tom Bradley',     p:'Tools',           m:[['Tom Bradley','Power tools?',now-8*D],[me,'DeWalt drill set $75',now-8*D+3e4],['Tom Bradley','Batteries?',now-8*D+6e4],[me,'2 batteries + charger',now-8*D+9e4],['Tom Bradley','I\'ll take it',now-7*D],[me,'Pickup tomorrow?',now-7*D+1e4],['Tom Bradley','10am!',now-7*D+2e4]] },
    { t:'Jessica Brown',   p:'Furniture',       m:[['Jessica Brown','Couch still available?',now-12*D],[me,'$150',now-12*D+2e4],['Jessica Brown','Deliver?',now-12*D+4e4],[me,'Pickup only, sorry',now-12*D+6e4],['Jessica Brown','Interested if I find a truck',now-12*D+8e4]] },
    { t:'David Kim',       p:'Gaming',          m:[['David Kim','PS4 available?',now-15*D],[me,'$150 with 3 games',now-15*D+3e4],['David Kim','Which games?',now-15*D+6e4],[me,'Madden, GTA V, Spider-Man',now-15*D+9e4],['David Kim','Deal! Cash only?',now-14*D],[me,'Yes cash only',now-14*D+1e4],['David Kim','Come Saturday?',now-13*D],[me,'See you then!',now-13*D+1e4]] },
  ];
  return raw.map((r, i) => {
    const msgs = r.m.map(([sender, content, ts]) => ({ id: `s${i}_${ts}`, sender, content, ts, hasPhoto: false, hasShare: false, reactions: [], isSystem: false }));
    return { id: `s_${i}`, title: r.t, participants: ['Moe', r.t], messages: msgs, lastTs: msgs.at(-1).ts, firstTs: msgs[0].ts, msgCount: msgs.length, product: r.p };
  });
}

function getSampleMeta() {
  const t = todayStr(), tm = tomorrowStr(), yd = dateStr(-1), d2 = dateStr(-2);
  return {
    s_0:  { status:'sold',                tags:['sold'],                notes:'Smooth transaction, paid cash' },
    s_1:  { status:'sold',                tags:['sold','repeat buyer'], notes:'Great buyer, on time' },
    s_2:  { status:'waiting on customer', tags:['hot lead'],            notes:'Wants the MacBook, waiting on decision', nad: yd },
    s_3:  { status:'sold',                tags:['sold'],                notes:'Monitor gone Saturday' },
    s_4:  { status:'waiting on customer', tags:['hot lead'],            notes:'Needs husband approval for PS5', nad: tm },
    s_5:  { status:'sold',                tags:['sold','VIP'],          notes:'Repeat customer, always reliable' },
    s_6:  { status:'active',              tags:['follow-up'],           notes:'Washer/dryer scheduled tomorrow 2pm', nad: t },
    s_7:  { status:'sold',                tags:['sold'],                notes:'Chair gone' },
    s_8:  { status:'active',              tags:['hot lead'],            notes:'Coming today after work!', nad: t },
    s_9:  { status:'sold',                tags:['sold'],                notes:'DeWalt set sold cash' },
    s_10: { status:'waiting on customer', tags:['follow-up','pending pickup'], notes:'Needs a truck. Check back this week', nad: d2 },
    s_11: { status:'sold',                tags:['sold'],                notes:'PS4 sold Saturday' },
  };
}

// ═══════════════════════════════════════════
// LOCALSTORAGE
// ═══════════════════════════════════════════
const lsG = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const lsS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const KEYS = { CUST: 'cm_cust2', FILTERS: 'cm_filters2', MYNAME: 'cm_myname', META: 'cm_conv2' };

// ═══════════════════════════════════════════
// INDEXEDDB PERSISTENCE  (FIX #1)
// ═══════════════════════════════════════════
const IDB_NAME = 'crazymoeCRM', IDB_STORE = 'data', IDB_VER = 1;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}
async function idbGet(key) {
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = e => res(e.target.result);
      req.onerror = rej;
    });
  } catch { return null; }
}
async function idbSet(key, value) {
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => res();
      req.onerror = rej;
    });
  } catch {}
}

// ═══════════════════════════════════════════
// SAVED FILTERS (with noResponse support)
// ═══════════════════════════════════════════
const DEFAULT_SAVED_FILTERS = [
  { id: 'f1', name: '🔥 Hot Leads',            filters: { tags: ['hot lead'] } },
  { id: 'f2', name: '⏳ Waiting on Customer',   filters: { status: 'waiting on customer' } },
  { id: 'f3', name: '✅ Sold',                  filters: { status: 'sold' } },
  { id: 'f4', name: '🔔 Follow-up Needed',      filters: { tags: ['follow-up'] } },
  { id: 'f5', name: '👑 VIP Customers',         filters: { tags: ['VIP'] } },
  { id: 'f6', name: '🚨 Overdue',               filters: { overdue: true } },
  { id: 'f7', name: '📦 Pending Pickup',        filters: { tags: ['pending pickup'] } },
  { id: 'f8', name: '🔕 No Response 3+ Days',   filters: { noResponse: true } },
];

// ═══════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════
const fmt = ts => {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${~~(diff/60000)}m`;
  if (diff < 86400000) return `${~~(diff/3600000)}h`;
  if (diff < 7*86400000) return `${~~(diff/86400000)}d`;
  return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' });
};
const fmtFull = ts => ts ? new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';

function Avatar({ name='?', size=36 }) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const palette = [C.blue, C.green, C.purple, C.amber, C.pink, C.cyan, C.orange, C.red];
  const col = palette[(name.charCodeAt(0)||0) % palette.length];
  return <div style={{ width:size, height:size, borderRadius:'50%', background:`${col}25`, border:`2px solid ${col}60`, display:'flex', alignItems:'center', justifyContent:'center', color:col, fontSize:size*0.32, fontWeight:800, flexShrink:0, letterSpacing:'-0.5px' }}>{initials}</div>;
}

function TagBadge({ tag, onRemove, small }) {
  const col = TC[tag] || C.muted;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:`${col}18`, color:col, border:`1px solid ${col}45`, borderRadius:100, padding:small?'1px 7px':'2px 9px', fontSize:small?9:10, fontWeight:700, letterSpacing:'0.3px', whiteSpace:'nowrap', textTransform:'uppercase' }}>
      {tag}{onRemove && <span onClick={onRemove} style={{ cursor:'pointer', fontSize:12, lineHeight:1, marginLeft:1, opacity:0.8 }}>×</span>}
    </span>
  );
}

function StatusBadge({ status='new', onChange, compact }) {
  const col = SC[status] || C.muted;
  const inner = (
    <span style={{ background:`${col}20`, color:col, border:`1px solid ${col}50`, borderRadius:100, padding:compact?'1px 8px':'3px 11px', fontSize:compact?9:11, fontWeight:700, whiteSpace:'nowrap', textTransform:'capitalize', cursor:onChange?'pointer':'default', display:'inline-flex', alignItems:'center', gap:4 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:col, flexShrink:0 }} />{status}{onChange&&<ChevronDown size={10}/>}
    </span>
  );
  if (!onChange) return inner;
  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <select value={status} onChange={e=>onChange(e.target.value)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%' }}>
        {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      {inner}
    </div>
  );
}

function Dot({ show, color }) {
  if (!show) return null;
  return <span style={{ width:6, height:6, background:color||C.amber, borderRadius:'50%', flexShrink:0, display:'inline-block' }} />;
}

function Btn({ onClick, children, variant='default', style:s, disabled }) {
  const styles = {
    default: { background:C.card2, color:C.text, border:`1px solid ${C.border}` },
    primary: { background:C.amber, color:'#000', border:'none', fontWeight:700 },
    ghost:   { background:'transparent', color:C.mutedLight, border:'none' },
    danger:  { background:`${C.red}18`, color:C.red, border:`1px solid ${C.red}40` },
    green:   { background:`${C.green}18`, color:C.green, border:`1px solid ${C.green}40` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:disabled?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity:disabled?0.5:1, transition:'all 0.15s', ...s }}>
      {children}
    </button>
  );
}

function NADPill({ nad, status, onClick, compact }) {
  const info = fmtNad(nad, status);
  if (!info) {
    if (!onClick) return null;
    return <button onClick={onClick} style={{ background:'transparent', border:`1px dashed ${C.border}`, borderRadius:100, padding:'1px 9px', fontSize:9, color:C.muted, cursor:'pointer', fontWeight:600, display:'inline-flex', alignItems:'center', gap:4 }}><Calendar size={9}/>Set date</button>;
  }
  return (
    <span onClick={onClick} style={{ background:`${info.color}18`, color:info.color, border:`1px solid ${info.color}40`, borderRadius:100, padding:compact?'1px 7px':'2px 9px', fontSize:compact?9:10, fontWeight:700, cursor:onClick?'pointer':'default', display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
      {info.urgent && <AlertTriangle size={9}/>}<Calendar size={9}/>{info.label}
    </span>
  );
}

function NADInput({ nad, onChange, label='Next Action Date' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <Calendar size={11} color={C.muted} />
      <span style={{ fontSize:10, color:C.muted, fontWeight:600, whiteSpace:'nowrap' }}>{label}:</span>
      <input type="date" value={nad||''} onChange={e=>onChange(e.target.value)}
        style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:6, padding:'3px 8px', color:nad?C.text:C.muted, fontSize:11, outline:'none', colorScheme:'dark' }} />
      {nad && <button onClick={()=>onChange('')} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:15, lineHeight:1, padding:2 }}>×</button>}
    </div>
  );
}

// ═══════════════════════════════════════════
// UPLOAD VIEW  (FIX #5: folder upload)
// ═══════════════════════════════════════════
function UploadView({ onLoad, loading, hasData, onContinue }) {
  const [drag, setDrag] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const fileRef = useRef();
  const folderRef = useRef();

  const processFiles = async files => {
    const arr = [...files].filter(f => f.name.endsWith('.json'));
    if (!arr.length) return;
    setParseStatus(`Parsing ${arr.length} file${arr.length>1?'s':''}…`);
    const all = [];
    for (const f of arr) {
      try {
        const t = await f.text();
        const parsed = JSON.parse(t);
        const convs = parseFBExport(parsed);
        all.push(...convs);
      } catch {}
    }
    if (all.length) {
      setParseStatus(`✅ Loaded ${all.length} conversations`);
      onLoad(all, detectMyName(all), {});
    } else {
      setParseStatus('⚠️ No conversations found in those files.');
    }
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:24, overflow:'auto' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:`${C.amber}15`, border:`1px solid ${C.amber}30`, borderRadius:100, padding:'6px 20px', fontSize:12, color:C.amber, fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:20 }}>
          <Zap size={12} fill={C.amber}/> CrazyMoe Intelligence Platform
        </div>
        <div style={{ fontSize:52, fontWeight:900, lineHeight:1, background:`linear-gradient(135deg,${C.amber} 0%,#fcd34d 50%,${C.amber} 100%)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-3, fontFamily:'"Segoe UI",system-ui,sans-serif' }}>
          FB Marketplace CRM
        </div>
        <div style={{ color:C.muted, fontSize:14, marginTop:10 }}>Upload your Facebook messages export · Manage every deal like a pro</div>
      </div>

      {/* Drop zone */}
      <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);processFiles(e.dataTransfer.files);}}
        onClick={()=>fileRef.current?.click()}
        style={{ width:'100%', maxWidth:500, background:drag?`${C.amber}08`:C.card, border:`2px dashed ${drag?C.amber:C.border}`, borderRadius:18, padding:'44px 40px', textAlign:'center', cursor:'pointer', transition:'all 0.2s' }}>
        <input ref={fileRef} type="file" multiple accept=".json" style={{ display:'none' }} onChange={e=>processFiles(e.target.files)} />
        {loading ? <div style={{ color:C.amber, fontSize:15, fontWeight:600 }}>⏳ Parsing…</div> : (
          <><div style={{ fontSize:42, marginBottom:12 }}>📁</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:6 }}>Drop Facebook JSON files here</div>
          <div style={{ fontSize:13, color:C.muted }}>Multiple files supported · Click to browse</div></>
        )}
      </div>

      {/* Folder upload button — FIX #5 */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input ref={folderRef} type="file" multiple accept=".json"
          // @ts-ignore — webkitdirectory is non-standard
          webkitdirectory="" directory=""
          style={{ display:'none' }} onChange={e=>processFiles(e.target.files)} />
        <Btn onClick={()=>folderRef.current?.click()} style={{ fontSize:12, padding:'8px 18px' }}>
          <FolderOpen size={13}/> Select Folder
        </Btn>
        <span style={{ fontSize:11, color:C.muted }}>Point at your Facebook export folder to load all JSON files at once</span>
      </div>

      {parseStatus && <div style={{ fontSize:13, color:parseStatus.startsWith('✅')?C.green:C.amber, fontWeight:600 }}>{parseStatus}</div>}

      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
        <Btn variant="primary" onClick={()=>{ const s=genSample(); onLoad(s,'Moe',getSampleMeta()); }} style={{ padding:'10px 28px', fontSize:13 }}>
          <Zap size={14}/> Launch with Demo Data
        </Btn>
        {hasData && <Btn onClick={onContinue} style={{ padding:'10px 28px', fontSize:13 }}>Continue to CRM →</Btn>}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 24px', maxWidth:500, width:'100%' }}>
        <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:14 }}>How to Export FB Messages</div>
        {['Facebook Settings → Your Facebook Information','Download Your Information → Messages','Format: JSON · Date range: All Time','Download and extract the ZIP','Drag & drop the inbox/ folder OR use "Select Folder" above'].map((s,i)=>(
          <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:13, color:'#8fadc8' }}>
            <span style={{ color:C.amber, fontWeight:800, minWidth:18 }}>{i+1}.</span>{s}
          </div>
        ))}
        <div style={{ marginTop:12, padding:'10px 14px', background:`${C.amber}08`, border:`1px solid ${C.amber}20`, borderRadius:8, fontSize:11, color:C.mutedLight }}>
          💾 Your imported conversations are <strong style={{ color:C.text }}>saved in your browser</strong> and will persist across refreshes.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════
function DashboardView({ convs, customers, onViewChange }) {
  const stats = useMemo(()=>{
    const t=todayStr(), tm=tomorrowStr();
    const sold     = convs.filter(c=>c.status==='sold').length;
    const hotLeads = convs.filter(c=>c.tags?.includes('hot lead')).length;
    const followUp = convs.filter(c=>c.status==='follow-up'||c.tags?.includes('follow-up')).length;
    const overdue  = convs.filter(c=>c.nad&&c.nad<t&&!DONE.includes(c.status)).length;
    const dueToday = convs.filter(c=>c.nad===t&&!DONE.includes(c.status)).length;
    const dueTm    = convs.filter(c=>c.nad===tm&&!DONE.includes(c.status)).length;
    const noNad    = convs.filter(c=>!c.nad&&!DONE.includes(c.status)).length;
    const vipCount = customers.filter(c=>c.meta?.tags?.includes('VIP')).length;
    const soldRate = convs.length ? Math.round((sold/convs.length)*100) : 0;
    const prodMap  = {};
    convs.forEach(c=>{ const p=c.product||'Other'; prodMap[p]=(prodMap[p]||0)+1; });
    const products = Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([name,value])=>({name:name.split(' / ')[0],value}));
    const statusData = STATUSES.filter(s=>convs.some(c=>c.status===s)).map(s=>({name:s,value:convs.filter(c=>c.status===s).length,color:SC[s]}));
    const days=[];
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      const nx=new Date(d); nx.setDate(nx.getDate()+1);
      const msgs=convs.reduce((s,c)=>s+c.messages.filter(m=>m.ts>=d&&m.ts<nx).length,0);
      days.push({ name:['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], msgs, convs:convs.filter(c=>c.lastTs>=d&&c.lastTs<nx).length });
    }
    return { sold, hotLeads, followUp, overdue, dueToday, dueTm, noNad, vipCount, soldRate, products, statusData, days, total:convs.length };
  }, [convs, customers]);

  const topCards = [
    { label:'Conversations', value:stats.total,     sub:'total tracked',      color:C.blue,   icon:MessageSquare },
    { label:'Sold',          value:stats.sold,       sub:`${stats.soldRate}% close rate`, color:C.purple, icon:CheckCircle2 },
    { label:'Hot Leads',     value:stats.hotLeads,   sub:'active prospects',   color:C.pink,   icon:Zap },
    { label:'Follow-ups',    value:stats.followUp,   sub:'need attention',     color:C.cyan,   icon:Bell },
    { label:'Customers',     value:customers.length, sub:`${stats.vipCount} VIP`, color:C.green, icon:Users },
  ];

  const nadCards = [
    { label:'🚨 Overdue',      value:stats.overdue,  color:C.red,    click:()=>onViewChange('queue') },
    { label:'⚡ Due Today',    value:stats.dueToday, color:C.amber,  click:()=>onViewChange('queue') },
    { label:'🔵 Due Tomorrow', value:stats.dueTm,    color:C.cyan,   click:()=>onViewChange('queue') },
    { label:'📋 No Date Set',  value:stats.noNad,    color:C.muted,  click:()=>onViewChange('conversations') },
  ];

  const PIE=[C.blue,C.green,C.purple,C.amber,C.pink,C.cyan,C.orange];
  const TT=({active,payload})=>{
    if(!active||!payload?.length) return null;
    return <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:12, color:C.text }}><div style={{ fontWeight:700 }}>{payload[0].payload.name}</div><div style={{ color:C.amber }}>{payload[0].value} messages</div></div>;
  };

  return (
    <div style={{ flex:1, overflow:'auto', padding:24, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
        {topCards.map(({label,value,sub,color,icon:Icon})=>(
          <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:12, right:14, opacity:0.12 }}><Icon size={44} color={color}/></div>
            <div style={{ fontSize:32, fontWeight:900, color, lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, marginTop:6 }}>{label}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 20px' }}>
        <div style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:14 }}>Follow-up Status</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {nadCards.map(({label,value,color,click})=>(
            <div key={label} onClick={click} style={{ background:C.card2, border:`1px solid ${value>0?color+'30':C.border}`, borderRadius:10, padding:'14px 16px', cursor:'pointer', transition:'all 0.15s', textAlign:'center' }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${color}10`; e.currentTarget.style.borderColor=`${color}60`;}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.card2; e.currentTarget.style.borderColor=value>0?`${color}30`:C.border;}}>
              <div style={{ fontSize:28, fontWeight:900, color:value>0?color:C.muted }}>{value}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 20px 12px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:16 }}>Message Activity (7 Days)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.days} barGap={4}>
              <XAxis dataKey="name" tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false} width={24}/>
              <Tooltip content={<TT/>} cursor={{ fill:`${C.amber}08` }}/>
              <Bar dataKey="msgs" fill={C.amber} radius={[3,3,0,0]}/>
              <Bar dataKey="convs" fill={`${C.blue}80`} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:16 }}>Product Categories</div>
          {stats.products.length>0 ? (
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <PieChart width={90} height={90}>
                <Pie data={stats.products} cx={40} cy={40} innerRadius={24} outerRadius={42} dataKey="value" paddingAngle={3}>
                  {stats.products.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
                </Pie>
              </PieChart>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                {stats.products.map((p,i)=>(
                  <div key={p.name} style={{ display:'flex', alignItems:'center', gap:7, fontSize:11 }}>
                    <span style={{ width:7, height:7, borderRadius:2, background:PIE[i%PIE.length], flexShrink:0 }}/>
                    <span style={{ flex:1, color:'#8fadc8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                    <span style={{ fontWeight:700, color:C.text }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ color:C.muted, fontSize:12 }}>No data</div>}
        </div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:16 }}>Pipeline Status</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {stats.statusData.map(({name,value,color})=>(
            <div key={name} onClick={()=>onViewChange('pipeline')} style={{ background:`${color}12`, border:`1px solid ${color}35`, borderRadius:10, padding:'10px 16px', cursor:'pointer', transition:'all 0.15s', textAlign:'center', minWidth:80 }}
              onMouseEnter={e=>e.currentTarget.style.background=`${color}22`}
              onMouseLeave={e=>e.currentTarget.style.background=`${color}12`}>
              <div style={{ fontSize:22, fontWeight:900, color }}>{value}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2, textTransform:'capitalize' }}>{name}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Recent Conversations</div>
          <Btn variant="ghost" onClick={()=>onViewChange('inbox')} style={{ fontSize:11 }}>View All <ChevronRight size={12}/></Btn>
        </div>
        {convs.slice(0,7).map(c=>{
          const nadInfo = fmtNad(c.nad, c.status);
          return (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
              <Avatar name={c.customer} size={34}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{c.customer}</span>
                  <span style={{ fontSize:11, color:C.muted }}>{c.product||''}</span>
                </div>
                <div style={{ fontSize:12, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.messages.at(-1)?.content||'—'}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                <StatusBadge status={c.status} compact/>
                {nadInfo && <NADPill nad={c.nad} status={c.status} compact/>}
                <div style={{ fontSize:10, color:C.muted }}>{fmt(c.lastTs)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// INBOX VIEW  (FIX #3: system msgs  |  FIX #4: open specific conv)
// ═══════════════════════════════════════════
function InboxView({ convs, myName, convMeta, setConvMeta, onOpenCustomer, globalSearch, initialConvId, onConvOpened }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNad, setShowNad] = useState(false);
  const [hideSystem, setHideSystem] = useState(true);   // FIX #3
  const msgEndRef = useRef();

  // FIX #4: honour initialConvId when provided
  useEffect(() => {
    if (initialConvId) {
      setSelectedId(initialConvId);
      onConvOpened?.();
    } else if (convs.length && !selectedId) {
      setSelectedId(convs[0].id);
    }
  }, [convs, initialConvId]);

  const sel = convs.find(c => c.id === selectedId) || null;
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [selectedId]);
  useEffect(() => {
    if (sel) { setNoteText(convMeta[sel.id]?.notes||''); setEditNote(false); setAddingTag(false); setShowNad(false); }
  }, [selectedId]);

  const filtered = useMemo(() => {
    let list = [...convs];
    const q = (search||globalSearch).toLowerCase();
    if (q) list = list.filter(c => c.customer.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)));
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    return list;
  }, [convs, search, globalSearch, filterStatus]);

  const upd = (id, patch) => setConvMeta(p => ({ ...p, [id]: { ...(p[id]||{}), ...patch } }));
  const toggleTag = (id, tag) => { const cur = convMeta[id]?.tags||[]; upd(id, { tags: cur.includes(tag) ? cur.filter(t=>t!==tag) : [...cur, tag] }); };

  const QUICK = [
    { label:'✅ Sold',      status:'sold',                color:C.purple },
    { label:'🔔 Follow-up', status:'follow-up',           color:C.cyan },
    { label:'⏳ Waiting',   status:'waiting on customer', color:C.amber },
    { label:'↩️ My Turn',   status:'waiting on me',       color:C.orange },
    { label:'🚫 Close',     status:'closed',              color:C.muted },
  ];

  const nadInfo = sel ? fmtNad(sel.nad, sel.status) : null;

  // FIX #3: filter out system messages when toggle is on
  const visibleMsgs = useMemo(() => {
    if (!sel) return [];
    return hideSystem ? sel.messages.filter(m => !m.isSystem) : sel.messages;
  }, [sel, hideSystem]);

  const systemCount = sel ? sel.messages.filter(m => m.isSystem).length : 0;

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      {/* Left list */}
      <div style={{ width:300, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'12px 12px 8px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ position:'relative', marginBottom:8 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px 6px 30px', color:C.text, fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' }}/>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:7, padding:'5px 8px', color:filterStatus?SC[filterStatus]||C.text:C.muted, fontSize:11, width:'100%', outline:'none' }}>
            <option value="">All statuses</option>
            {STATUSES.map(s=><option key={s} value={s} style={{ color:SC[s] }}>{s}</option>)}
          </select>
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          {filtered.map(c => {
            const isSel = c.id === selectedId;
            const ni = fmtNad(c.nad, c.status);
            return (
              <div key={c.id} onClick={() => setSelectedId(c.id)}
                style={{ padding:'11px 14px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', background:isSel?`${C.amber}12`:'transparent', borderLeft:isSel?`3px solid ${C.amber}`:'3px solid transparent', transition:'all 0.1s' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <Avatar name={c.customer} size={34}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:isSel?C.amber:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>{c.customer}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <Dot show={!!convMeta[c.id]?.notes}/>
                        <span style={{ fontSize:10, color:C.muted }}>{fmt(c.lastTs)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4 }}>{c.messages.at(-1)?.content||'—'}</div>
                    <div style={{ display:'flex', gap:3, flexWrap:'wrap', alignItems:'center' }}>
                      <StatusBadge status={c.status} compact/>
                      {ni && <NADPill nad={c.nad} status={c.status} compact/>}
                      {(c.tags||[]).slice(0,1).map(t=><TagBadge key={t} tag={t} small/>)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!filtered.length && <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No conversations found</div>}
        </div>
      </div>

      {/* Thread */}
      {sel ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'10px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <Avatar name={sel.customer} size={36}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:14 }}>{sel.customer}</span>
                  {sel.product&&<span style={{ fontSize:11, color:C.muted, background:C.card2, border:`1px solid ${C.border}`, borderRadius:5, padding:'1px 7px' }}>{sel.product}</span>}
                  {nadInfo&&<NADPill nad={sel.nad} status={sel.status} onClick={()=>setShowNad(!showNad)}/>}
                  {!sel.nad&&<NADPill nad={null} onClick={()=>setShowNad(!showNad)}/>}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sel.msgCount} messages · {fmt(sel.firstTs)}</div>
              </div>
              <StatusBadge status={sel.status} onChange={val=>upd(sel.id,{status:val})}/>
              <Btn variant="ghost" onClick={()=>setAddingTag(!addingTag)} style={{ fontSize:11, padding:'5px 10px' }}><Tag size={12}/>Tags</Btn>
              <Btn variant="ghost" onClick={()=>onOpenCustomer(sel._customer)} style={{ fontSize:11, padding:'5px 10px' }}><Users size={12}/></Btn>
              {/* FIX #3: System message toggle */}
              {systemCount > 0 && (
                <Btn variant="ghost" onClick={()=>setHideSystem(!hideSystem)} style={{ fontSize:10, padding:'5px 10px', color:hideSystem?C.muted:C.cyan }}>
                  {hideSystem ? <Eye size={11}/> : <EyeOff size={11}/>}
                  {hideSystem ? `${systemCount} hidden` : 'Hide system'}
                </Btn>
              )}
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {QUICK.map(q=>(
                <button key={q.status} onClick={()=>upd(sel.id,{status:q.status})}
                  style={{ background:sel.status===q.status?`${q.color}25`:C.card2, color:sel.status===q.status?q.color:C.muted, border:`1px solid ${sel.status===q.status?q.color+'50':C.border}`, borderRadius:6, padding:'3px 10px', fontSize:10, fontWeight:700, cursor:'pointer', transition:'all 0.1s' }}>
                  {q.label}
                </button>
              ))}
              {showNad&&<NADInput nad={sel.nad} onChange={v=>upd(sel.id,{nad:v})} label="Follow-up"/>}
            </div>
          </div>

          {addingTag&&(
            <div style={{ padding:'8px 20px', borderBottom:`1px solid ${C.border}`, background:C.card2, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:11, color:C.muted }}>Tags:</span>
              {(sel.tags||[]).map(t=><TagBadge key={t} tag={t} onRemove={()=>toggleTag(sel.id,t)}/>)}
              {DEFAULT_TAGS.filter(t=>!(sel.tags||[]).includes(t)).map(t=>(
                <button key={t} onClick={()=>toggleTag(sel.id,t)} style={{ background:'transparent', color:C.muted, border:`1px dashed ${C.borderLight}`, borderRadius:100, padding:'1px 9px', fontSize:10, cursor:'pointer', fontWeight:600, textTransform:'uppercase' }}>+{t}</button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex:1, overflow:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:4 }}>
            {visibleMsgs.map((msg,i)=>{
              const isMe = msg.sender === myName;
              const prevMsg = i > 0 ? visibleMsgs[i-1] : null;
              const showAvatar = !isMe && prevMsg?.sender !== msg.sender;
              const showDate = i===0 || new Date(msg.ts).toDateString() !== new Date(visibleMsgs[i-1].ts).toDateString();
              return (
                <div key={msg.id}>
                  {showDate&&<div style={{ textAlign:'center', color:C.muted, fontSize:11, padding:'8px 0', fontWeight:600 }}>{new Date(msg.ts).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>}
                  <div style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', alignItems:'flex-end', gap:6, marginBottom:2 }}>
                    {!isMe&&(showAvatar?<Avatar name={msg.sender} size={24}/>:<div style={{ width:24 }}/>)}
                    <div style={{ maxWidth:'70%' }}>
                      {showAvatar&&!isMe&&<div style={{ fontSize:10, color:C.muted, marginBottom:3, marginLeft:2 }}>{msg.sender}</div>}
                      <div title={fmtFull(msg.ts)} style={{ background:isMe?C.amber:C.card2, color:isMe?'#000':C.text, borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'8px 12px', fontSize:13, lineHeight:1.5, wordBreak:'break-word', border:isMe?'none':`1px solid ${C.border}` }}>
                        {msg.content||(msg.hasPhoto?'📷 Photo':msg.hasShare?'🔗 Shared link':'—')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {visibleMsgs.length === 0 && (
              <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'40px 0' }}>
                {hideSystem && systemCount > 0 ? `All ${systemCount} messages are system messages. Toggle visibility above.` : 'No messages'}
              </div>
            )}
            <div ref={msgEndRef}/>
          </div>

          {/* Notes */}
          <div style={{ borderTop:`1px solid ${C.border}`, padding:'10px 20px', background:C.card2, flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:editNote?8:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.muted, fontWeight:700 }}>
                <Edit3 size={11}/> NOTES <Dot show={!!convMeta[sel.id]?.notes}/>
              </div>
              <Btn variant="ghost" onClick={()=>{ if(editNote){ upd(sel.id,{notes:noteText}); } setEditNote(!editNote); }} style={{ fontSize:11, padding:'3px 8px' }}>
                {editNote?<><Check size={11}/>Save</>:<><Edit3 size={11}/>Edit</>}
              </Btn>
            </div>
            {editNote
              ? <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add notes…" style={{ background:C.card, border:`1px solid ${C.borderLight}`, borderRadius:8, padding:'8px 12px', color:C.text, fontSize:12, width:'100%', minHeight:55, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.5 }}/>
              : <div style={{ fontSize:12, color:convMeta[sel.id]?.notes?'#8fadc8':C.muted, paddingTop:2, cursor:'pointer' }} onClick={()=>setEditNote(true)}>{convMeta[sel.id]?.notes||'Click Edit to add notes…'}</div>
            }
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:14 }}>Select a conversation</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CONVERSATIONS VIEW  (FIX #2: fully wired filters  |  FIX #6: pagination)
// ═══════════════════════════════════════════
const PAGE_SIZE = 75;

function ConversationsView({ convs, myName, convMeta, setConvMeta, onOpenCustomer, globalSearch, savedFilters, setSavedFilters }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterNoResponse, setFilterNoResponse] = useState(false);  // FIX #2
  const [sortBy, setSortBy] = useState('date');
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [expandedTags, setExpandedTags] = useState(null);
  const [page, setPage] = useState(0);  // FIX #6

  const upd = (id, patch) => setConvMeta(p => ({ ...p, [id]: { ...(p[id]||{}), ...patch } }));
  const toggleTag = (id, tag) => { const cur = convMeta[id]?.tags||[]; upd(id, { tags: cur.includes(tag) ? cur.filter(t=>t!==tag) : [...cur, tag] }); };

  const today = todayStr();
  const NR_CUTOFF = Date.now() - 3 * 86400000;
  const products = [...new Set(convs.map(c => c.product).filter(Boolean))];

  const filtered = useMemo(() => {
    let list = [...convs];
    const q = (search||globalSearch).toLowerCase();
    if (q) list = list.filter(c => c.customer.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)) || (c.product||'').toLowerCase().includes(q));
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterTag)    list = list.filter(c => c.tags?.includes(filterTag));
    if (filterProduct) list = list.filter(c => c.product === filterProduct);
    if (filterOverdue) list = list.filter(c => c.nad && c.nad < today && !DONE.includes(c.status));
    // FIX #2: No Response 3+ Days = last msg not from me and was >3 days ago, conv not done
    if (filterNoResponse) list = list.filter(c => {
      if (DONE.includes(c.status)) return false;
      const lastMsg = c.messages[c.messages.length - 1];
      return lastMsg && lastMsg.sender !== myName && lastMsg.ts < NR_CUTOFF;
    });
    if (sortBy === 'date') list.sort((a,b) => b.lastTs - a.lastTs);
    else if (sortBy === 'msgs') list.sort((a,b) => b.msgCount - a.msgCount);
    else if (sortBy === 'name') list.sort((a,b) => a.customer.localeCompare(b.customer));
    else if (sortBy === 'nad') list.sort((a,b) => { if(a.nad&&b.nad) return a.nad.localeCompare(b.nad); if(a.nad) return -1; if(b.nad) return 1; return 0; });
    return list;
  }, [convs, search, globalSearch, filterStatus, filterTag, filterProduct, filterOverdue, filterNoResponse, sortBy, myName]);

  // Reset page when filter changes — FIX #6
  useEffect(() => { setPage(0); }, [filtered.length, search, filterStatus, filterTag, filterProduct, filterOverdue, filterNoResponse]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // FIX #2: fully decode all preset filters
  const applyFilter = f => {
    setFilterStatus(f.filters.status || '');
    setFilterTag((f.filters.tags || [])[0] || '');
    setFilterOverdue(!!f.filters.overdue);
    setFilterNoResponse(!!f.filters.noResponse);
    setPage(0);
  };
  const saveFilter = () => {
    if (!saveName.trim()) return;
    const f = { id:`f_${Date.now()}`, name:saveName, filters:{ status:filterStatus, tags:filterTag?[filterTag]:[], overdue:filterOverdue, noResponse:filterNoResponse } };
    const next = [...savedFilters, f]; setSavedFilters(next); setSaveName(''); setShowSave(false);
  };

  const anyFilter = filterStatus || filterTag || filterProduct || filterOverdue || filterNoResponse;

  return (
    <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      {/* Filter bar */}
      <div style={{ padding:'10px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', flexShrink:0, background:C.card }}>
        <div style={{ position:'relative', flex:1, minWidth:160 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px 7px 30px', color:C.text, fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' }}/>
        </div>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:filterStatus?SC[filterStatus]||C.text:C.muted, fontSize:12, outline:'none' }}>
          <option value="">All Statuses</option>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:filterTag?TC[filterTag]||C.text:C.muted, fontSize:12, outline:'none' }}>
          <option value="">All Tags</option>{DEFAULT_TAGS.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterProduct} onChange={e=>setFilterProduct(e.target.value)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:filterProduct?C.cyan:C.muted, fontSize:12, outline:'none' }}>
          <option value="">All Products</option>{products.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:C.mutedLight, fontSize:12, outline:'none' }}>
          <option value="date">Sort: Date</option>
          <option value="nad">Sort: Next Action</option>
          <option value="msgs">Sort: Messages</option>
          <option value="name">Sort: Name</option>
        </select>
        <button onClick={()=>setFilterOverdue(!filterOverdue)} style={{ background:filterOverdue?`${C.red}20`:'transparent', color:filterOverdue?C.red:C.muted, border:`1px solid ${filterOverdue?C.red+'50':C.border}`, borderRadius:8, padding:'7px 12px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <AlertTriangle size={11}/>Overdue
        </button>
        {/* FIX #2: No Response filter button */}
        <button onClick={()=>setFilterNoResponse(!filterNoResponse)} style={{ background:filterNoResponse?`${C.orange}20`:'transparent', color:filterNoResponse?C.orange:C.muted, border:`1px solid ${filterNoResponse?C.orange+'50':C.border}`, borderRadius:8, padding:'7px 12px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <Clock size={11}/>No Reply 3d+
        </button>
        {anyFilter && <Btn variant="ghost" onClick={()=>{setFilterStatus('');setFilterTag('');setFilterProduct('');setFilterOverdue(false);setFilterNoResponse(false);}} style={{ fontSize:11, color:C.red }}><X size={12}/>Clear</Btn>}
        <Btn onClick={()=>setShowSave(!showSave)} style={{ fontSize:11 }}><Bookmark size={12}/>Save</Btn>
      </div>

      {/* Saved filter chips */}
      <div style={{ padding:'7px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
        {savedFilters.map(f=>(
          <button key={f.id} onClick={()=>applyFilter(f)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:100, padding:'3px 12px', fontSize:11, color:C.mutedLight, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
            {f.name}<span onClick={e=>{ e.stopPropagation(); setSavedFilters(savedFilters.filter(x=>x.id!==f.id)); }} style={{ opacity:0.5, fontSize:13, lineHeight:1 }}>×</span>
          </button>
        ))}
        {showSave&&<div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <input value={saveName} onChange={e=>setSaveName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveFilter()} placeholder="Filter name…" style={{ background:C.card2, border:`1px solid ${C.borderLight}`, borderRadius:7, padding:'4px 10px', color:C.text, fontSize:12, outline:'none', width:140 }}/>
          <Btn variant="green" onClick={saveFilter} style={{ padding:'4px 10px', fontSize:11 }}><Check size={11}/></Btn>
        </div>}
        <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>{filtered.length} of {convs.length}</span>
      </div>

      {/* Table — FIX #6: paginated */}
      <div style={{ flex:1, overflow:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:C.card2, position:'sticky', top:0, zIndex:1 }}>
              {['Customer','Product','Status','Next Action','Tags','Msgs','Last Active','Notes','Actions'].map(h=>(
                <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(c=>{
              const nadInfo = fmtNad(c.nad, c.status);
              return (
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${C.amber}05`}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'9px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Avatar name={c.customer} size={28}/>
                      <button onClick={()=>onOpenCustomer(c._customer)} style={{ background:'none', border:'none', color:C.text, fontWeight:600, fontSize:13, cursor:'pointer', padding:0 }}>{c.customer}</button>
                    </div>
                  </td>
                  <td style={{ padding:'9px 14px' }}>
                    {c.product?<span style={{ fontSize:10, color:C.cyan, background:`${C.cyan}15`, border:`1px solid ${C.cyan}30`, borderRadius:5, padding:'1px 7px', whiteSpace:'nowrap' }}>{c.product}</span>:<span style={{ color:C.muted }}>—</span>}
                  </td>
                  <td style={{ padding:'9px 14px' }}><StatusBadge status={c.status} onChange={val=>upd(c.id,{status:val})} compact/></td>
                  <td style={{ padding:'9px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {nadInfo?<NADPill nad={c.nad} status={c.status} compact/>:<span style={{ color:C.muted, fontSize:11 }}>—</span>}
                      <input type="date" value={c.nad||''} onChange={e=>upd(c.id,{nad:e.target.value})}
                        style={{ background:'transparent', border:'none', width:14, opacity:0.3, cursor:'pointer', colorScheme:'dark', fontSize:11 }} title="Set date"/>
                    </div>
                  </td>
                  <td style={{ padding:'9px 14px' }}>
                    <div style={{ display:'flex', gap:3, flexWrap:'wrap', alignItems:'center' }}>
                      {(c.tags||[]).map(t=><TagBadge key={t} tag={t} small onRemove={()=>toggleTag(c.id,t)}/>)}
                      {expandedTags===c.id
                        ? DEFAULT_TAGS.filter(t=>!(c.tags||[]).includes(t)).map(t=>(
                            <button key={t} onClick={()=>toggleTag(c.id,t)} style={{ background:'transparent', color:C.muted, border:`1px dashed ${C.border}`, borderRadius:100, padding:'1px 7px', fontSize:9, cursor:'pointer', fontWeight:700, textTransform:'uppercase' }}>+{t}</button>
                          ))
                        : <button onClick={()=>setExpandedTags(expandedTags===c.id?null:c.id)} style={{ background:'transparent', color:C.muted, border:`1px dashed ${C.border}`, borderRadius:100, padding:'1px 7px', fontSize:9, cursor:'pointer' }}>+</button>
                      }
                    </div>
                  </td>
                  <td style={{ padding:'9px 14px', color:C.mutedLight, fontSize:12 }}>{c.msgCount}</td>
                  <td style={{ padding:'9px 14px', color:C.muted, fontSize:12, whiteSpace:'nowrap' }}>{fmt(c.lastTs)}</td>
                  <td style={{ padding:'9px 14px', maxWidth:140 }}>
                    <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 }}>
                      <Dot show={!!convMeta[c.id]?.notes}/>{convMeta[c.id]?.notes||<span style={{ fontStyle:'italic', opacity:0.4 }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding:'9px 14px' }}>
                    <div style={{ display:'flex', gap:3 }}>
                      <button onClick={()=>upd(c.id,{status:'sold'})} title="Mark Sold" style={{ background:`${C.purple}15`, color:C.purple, border:`1px solid ${C.purple}30`, borderRadius:6, padding:'3px 7px', fontSize:10, cursor:'pointer' }}>✅</button>
                      <button onClick={()=>upd(c.id,{status:'follow-up'})} title="Follow-up" style={{ background:`${C.cyan}15`, color:C.cyan, border:`1px solid ${C.cyan}30`, borderRadius:6, padding:'3px 7px', fontSize:10, cursor:'pointer' }}>🔔</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!paged.length && <div style={{ textAlign:'center', padding:48, color:C.muted }}>No conversations match</div>}
      </div>

      {/* Pagination — FIX #6 */}
      {totalPages > 1 && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:12, background:C.card, flexShrink:0 }}>
          <Btn onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ padding:'5px 12px', fontSize:11 }}><ChevronLeft size={12}/>Prev</Btn>
          <span style={{ fontSize:12, color:C.muted }}>Page {page+1} of {totalPages} · {filtered.length} total</span>
          <Btn onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} style={{ padding:'5px 12px', fontSize:11 }}>Next<ChevronRight size={12}/></Btn>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CUSTOMERS VIEW
// ═══════════════════════════════════════════
function CustomersView({ customers, custMeta, setCustMeta, onOpenCustomer, globalSearch }) {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const upd = (name, patch) => setCustMeta(p => ({ ...p, [name]: { ...(p[name]||{}), ...patch } }));
  const filtered = useMemo(() => {
    let list = [...customers];
    const q = (search||globalSearch).toLowerCase();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q));
    if (filterTag) list = list.filter(c => (custMeta[c.name]?.tags||[]).includes(filterTag));
    return list;
  }, [customers, search, globalSearch, filterTag, custMeta]);

  return (
    <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'10px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:8, alignItems:'center', flexShrink:0, background:C.card }}>
        <div style={{ position:'relative', flex:1, maxWidth:300 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…" style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px 7px 30px', color:C.text, fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' }}/>
        </div>
        <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:filterTag?TC[filterTag]||C.text:C.muted, fontSize:12, outline:'none' }}>
          <option value="">All Tags</option>{DEFAULT_TAGS.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>{filtered.length} customers</span>
      </div>
      <div style={{ flex:1, overflow:'auto', padding:20, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(255px,1fr))', gap:12, alignContent:'start' }}>
        {filtered.map(c=>{
          const meta = custMeta[c.name]||{};
          const tags = meta.tags||[];
          const toggleTag = tag => upd(c.name, { tags: tags.includes(tag) ? tags.filter(t=>t!==tag) : [...tags, tag] });
          const prods = [...new Set(c.conversations?.map(cv=>cv.product).filter(Boolean))];
          return (
            <div key={c.name} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, cursor:'pointer', transition:'all 0.15s' }}
              onClick={()=>onOpenCustomer(c)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${C.amber}50`;e.currentTarget.style.background=`${C.amber}05`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
                <Avatar name={c.name} size={40}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{c.totalConversations} convs · {c.totalMessages} msgs</div>
                </div>
                <Dot show={!!meta.notes}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                {[{v:c.totalConversations,l:'Convs'},{v:c.totalMessages,l:'Msgs'},{v:fmt(c.lastMessage?.ts),l:'Last'}].map(s=>(
                  <div key={s.l} style={{ background:C.card2, borderRadius:7, padding:'7px 8px', textAlign:'center' }}>
                    <div style={{ fontWeight:700, color:C.text, fontSize:14 }}>{s.v}</div>
                    <div style={{ color:C.muted, fontSize:10, marginTop:1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {prods.length>0&&<div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                {prods.map(p=><span key={p} style={{ fontSize:10, color:C.cyan, background:`${C.cyan}12`, border:`1px solid ${C.cyan}25`, borderRadius:4, padding:'1px 6px' }}>{p}</span>)}
              </div>}
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }} onClick={e=>e.stopPropagation()}>
                {tags.map(t=><TagBadge key={t} tag={t} small onRemove={()=>toggleTag(t)}/>)}
                <select onChange={e=>{ if(e.target.value) toggleTag(e.target.value); e.target.value=''; }} style={{ background:'transparent', border:`1px dashed ${C.border}`, borderRadius:100, padding:'1px 8px', color:C.muted, fontSize:9, cursor:'pointer', outline:'none' }} defaultValue="">
                  <option value="">+ tag</option>{DEFAULT_TAGS.filter(t=>!tags.includes(t)).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        {!filtered.length&&<div style={{ gridColumn:'1/-1', textAlign:'center', padding:48, color:C.muted }}>No customers found</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// CUSTOMER PANEL  (FIX #4: open specific conversation)
// ═══════════════════════════════════════════
function CustomerPanel({ customer, meta, setMeta, onClose, onOpenConv }) {
  const [noteText, setNoteText] = useState(meta.notes||'');
  const [editNote, setEditNote] = useState(false);
  if (!customer) return null;
  const tags = meta.tags||[];
  const toggleTag = tag => setMeta({ ...meta, tags: tags.includes(tag) ? tags.filter(t=>t!==tag) : [...tags, tag] });
  const saveNote = () => { setMeta({ ...meta, notes:noteText }); setEditNote(false); };
  const prods = [...new Set(customer.conversations?.map(c=>c.product).filter(Boolean))];

  return (
    <>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'#00000050', zIndex:40 }}/>
      <div style={{ position:'absolute', top:0, right:0, bottom:0, width:380, background:C.card, borderLeft:`1px solid ${C.border}`, zIndex:50, display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px #00000060' }}>
        <div style={{ padding:'20px 20px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Avatar name={customer.name} size={46}/>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>{customer.name}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{customer.totalConversations} conversations · {customer.totalMessages} messages</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', padding:4 }}><X size={18}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              {l:'First Contact',value:fmt(customer.firstMessage?.ts),color:C.mutedLight},
              {l:'Last Active',  value:fmt(customer.lastMessage?.ts), color:C.text},
              {l:'Total Messages',value:customer.totalMessages,       color:C.amber},
              {l:'Conversations', value:customer.totalConversations,  color:C.blue},
            ].map(s=>(
              <div key={s.l} style={{ background:C.card2, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Next Action</div>
            <NADInput nad={meta.nad||''} onChange={v=>setMeta({...meta,nad:v})} label="Customer follow-up"/>
            {meta.nad&&<div style={{ marginTop:6 }}><NADPill nad={meta.nad} status="active"/></div>}
          </div>
          {prods.length>0&&(
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Products Discussed</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {prods.map(p=><span key={p} style={{ fontSize:11, color:C.cyan, background:`${C.cyan}12`, border:`1px solid ${C.cyan}30`, borderRadius:6, padding:'3px 10px' }}>{p}</span>)}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Tags</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
              {tags.map(t=><TagBadge key={t} tag={t} onRemove={()=>toggleTag(t)}/>)}
              {DEFAULT_TAGS.filter(t=>!tags.includes(t)).map(t=>(
                <button key={t} onClick={()=>toggleTag(t)} style={{ background:'transparent', color:C.muted, border:`1px dashed ${C.border}`, borderRadius:100, padding:'2px 10px', fontSize:10, cursor:'pointer', fontWeight:600, textTransform:'uppercase' }}>+{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1 }}>Notes</div>
              <Btn variant="ghost" onClick={()=>{ if(editNote) saveNote(); else setEditNote(true); }} style={{ fontSize:11, padding:'3px 8px' }}>
                {editNote?<><Check size={11}/>Save</>:<><Edit3 size={11}/>Edit</>}
              </Btn>
            </div>
            {editNote
              ? <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Notes about this customer…" style={{ background:C.card2, border:`1px solid ${C.borderLight}`, borderRadius:8, padding:'10px 12px', color:C.text, fontSize:13, width:'100%', minHeight:80, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.5 }}/>
              : <div style={{ background:C.card2, borderRadius:8, padding:'10px 12px', fontSize:13, color:meta.notes?'#8fadc8':C.muted, lineHeight:1.6, minHeight:50, cursor:'pointer', fontStyle:meta.notes?'normal':'italic' }} onClick={()=>setEditNote(true)}>{meta.notes||'Click to add notes…'}</div>
            }
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Conversations ({customer.totalConversations})</div>
            {customer.conversations?.map(conv=>{
              const ni = fmtNad(conv.nad, conv.status);
              return (
                <div key={conv.id} onClick={()=>onOpenConv(conv)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.card2, borderRadius:8, marginBottom:6, cursor:'pointer', transition:'all 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${C.amber}12`}
                  onMouseLeave={e=>e.currentTarget.style.background=C.card2}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{conv.product||'Conversation'}</span>
                      <StatusBadge status={conv.status} compact/>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {ni&&<NADPill nad={conv.nad} status={conv.status} compact/>}
                      <span style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.messages.at(-1)?.content||'—'}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} color={C.muted}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// PIPELINE VIEW (KANBAN)
// ═══════════════════════════════════════════
function PipelineView({ convs, convMeta, setConvMeta, onOpenCustomer }) {
  const dragId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const [editingNad, setEditingNad] = useState(null);
  const upd = (id, patch) => setConvMeta(p => ({ ...p, [id]: { ...(p[id]||{}), ...patch } }));
  const COLS = [
    { id:'new',                 label:'New' },
    { id:'active',              label:'Active' },
    { id:'waiting on customer', label:'Waiting' },
    { id:'waiting on me',       label:'My Turn' },
    { id:'follow-up',           label:'Follow-up' },
    { id:'sold',                label:'Sold ✅' },
    { id:'refunded',            label:'Refunded' },
    { id:'closed',              label:'Closed' },
  ];
  return (
    <div style={{ flex:1, overflow:'auto', display:'flex', gap:10, padding:'16px 20px', alignItems:'flex-start' }}>
      {COLS.map(col=>{
        const colConvs = convs.filter(c => c.status === col.id);
        const col_color = SC[col.id];
        const isOver = dragOver === col.id;
        return (
          <div key={col.id}
            onDragOver={e=>{e.preventDefault();setDragOver(col.id);}}
            onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);}}
            onDrop={e=>{e.preventDefault();if(dragId.current) upd(dragId.current,{status:col.id});setDragOver(null);dragId.current=null;}}
            style={{ minWidth:210, width:210, flexShrink:0, background:isOver?`${col_color}10`:C.card2, border:`1px solid ${isOver?col_color:C.border}`, borderRadius:12, transition:'all 0.15s', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'11px 14px 9px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:col_color, flexShrink:0 }}/>
                <span style={{ fontWeight:700, fontSize:12, color:C.text }}>{col.label}</span>
              </div>
              <span style={{ background:`${col_color}20`, color:col_color, fontSize:10, fontWeight:800, padding:'1px 8px', borderRadius:100 }}>{colConvs.length}</span>
            </div>
            <div style={{ padding:8, display:'flex', flexDirection:'column', gap:6, flex:1, overflow:'auto', minHeight:120 }}>
              {colConvs.map(conv=>{
                const nadInfo = fmtNad(conv.nad, conv.status);
                return (
                  <div key={conv.id} draggable
                    onDragStart={e=>{ dragId.current=conv.id; e.dataTransfer.effectAllowed='move'; }}
                    onDragEnd={()=>{ dragId.current=null; setDragOver(null); }}
                    style={{ background:C.card, border:`1px solid ${nadInfo?.urgent?C.red+'50':C.border}`, borderRadius:9, padding:'10px 12px', cursor:'grab', userSelect:'none', transition:'border-color 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=`${col_color}60`}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=nadInfo?.urgent?`${C.red}50`:C.border}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <Avatar name={conv.customer} size={22}/>
                      <span style={{ fontWeight:700, fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.customer}</span>
                      <Dot show={!!conv.notes}/>
                    </div>
                    {conv.product&&<div style={{ fontSize:10, color:C.cyan, marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.product}</div>}
                    <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:6 }}>
                      {conv.messages.at(-1)?.content||'—'}
                    </div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', marginBottom:5 }}>
                      {nadInfo
                        ? <span onClick={()=>setEditingNad(editingNad===conv.id?null:conv.id)} style={{ background:`${nadInfo.color}18`, color:nadInfo.color, border:`1px solid ${nadInfo.color}40`, borderRadius:100, padding:'1px 7px', fontSize:9, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:3 }}>
                            {nadInfo.urgent&&<AlertTriangle size={8}/>}<Calendar size={8}/>{nadInfo.label}
                          </span>
                        : <button onClick={()=>setEditingNad(editingNad===conv.id?null:conv.id)} style={{ background:'transparent', border:`1px dashed ${C.border}`, borderRadius:100, padding:'1px 7px', fontSize:9, color:C.muted, cursor:'pointer', fontWeight:600 }}>+date</button>
                      }
                      {(conv.tags||[]).slice(0,2).map(t=><TagBadge key={t} tag={t} small/>)}
                    </div>
                    {editingNad===conv.id&&(
                      <div onClick={e=>e.stopPropagation()} style={{ marginTop:4 }}>
                        <input type="date" value={conv.nad||''} onChange={e=>{ upd(conv.id,{nad:e.target.value}); setEditingNad(null); }}
                          style={{ background:C.card2, border:`1px solid ${C.borderLight}`, borderRadius:6, padding:'3px 8px', color:C.text, fontSize:11, outline:'none', width:'100%', boxSizing:'border-box', colorScheme:'dark' }} autoFocus/>
                      </div>
                    )}
                    <div style={{ fontSize:10, color:C.muted, textAlign:'right', marginTop:4 }}>{fmt(conv.lastTs)}</div>
                  </div>
                );
              })}
              {colConvs.length===0&&(
                <div style={{ textAlign:'center', color:C.muted, fontSize:11, padding:'24px 0', opacity:0.4, borderRadius:6, border:`1px dashed ${C.border}` }}>Drop here</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// QUEUE VIEW
// ═══════════════════════════════════════════
function QueueSection({ title, color, items, upd, onOpenCustomer, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;
  return (
    <div style={{ marginBottom:20 }}>
      <div onClick={()=>setOpen(!open)} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:open?12:0, cursor:'pointer', userSelect:'none' }}>
        <span style={{ background:`${color}20`, color, border:`1px solid ${color}40`, borderRadius:8, padding:'4px 14px', fontSize:12, fontWeight:800 }}>{items.length}</span>
        <span style={{ fontWeight:800, fontSize:14, color:C.text }}>{title}</span>
        <span style={{ color:C.muted, fontSize:18, lineHeight:1, marginLeft:'auto' }}>{open?'−':'+'}</span>
      </div>
      {open&&items.map(c=>{
        const nadInfo = fmtNad(c.nad, c.status);
        return (
          <div key={c.id} style={{ background:C.card, border:`1px solid ${nadInfo?.urgent?C.red+'30':C.border}`, borderRadius:12, padding:'14px 18px', marginBottom:8, display:'flex', gap:14, alignItems:'flex-start' }}>
            <Avatar name={c.customer} size={40}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>{c.customer}</span>
                {c.product&&<span style={{ fontSize:11, color:C.cyan, background:`${C.cyan}12`, border:`1px solid ${C.cyan}25`, borderRadius:5, padding:'1px 7px' }}>{c.product}</span>}
                <StatusBadge status={c.status} onChange={v=>upd(c.id,{status:v})} compact/>
                {nadInfo&&<NADPill nad={c.nad} status={c.status}/>}
              </div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {c.messages.at(-1)?.content||'—'}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <NADInput nad={c.nad||''} onChange={v=>upd(c.id,{nad:v})} label="→"/>
                {(c.tags||[]).map(t=><TagBadge key={t} tag={t} small/>)}
                <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>{fmt(c.lastTs)}</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
              <button onClick={()=>upd(c.id,{status:'sold'})} style={{ background:`${C.purple}15`, color:C.purple, border:`1px solid ${C.purple}30`, borderRadius:7, padding:'4px 10px', fontSize:10, fontWeight:700, cursor:'pointer' }}>✅ Sold</button>
              <button onClick={()=>upd(c.id,{status:'waiting on customer'})} style={{ background:`${C.amber}15`, color:C.amber, border:`1px solid ${C.amber}30`, borderRadius:7, padding:'4px 10px', fontSize:10, fontWeight:700, cursor:'pointer' }}>⏳ Waiting</button>
              <button onClick={()=>onOpenCustomer(c._customer)} style={{ background:C.card2, color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, padding:'4px 10px', fontSize:10, fontWeight:700, cursor:'pointer' }}><Users size={10}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QueueView({ convs, convMeta, setConvMeta, onOpenCustomer }) {
  const t=todayStr(), tm=tomorrowStr();
  const upd=(id,patch)=>setConvMeta(p=>({...p,[id]:{...(p[id]||{}),...patch}}));
  const overdue  = convs.filter(c=>c.nad&&c.nad<t&&!DONE.includes(c.status));
  const dueToday = convs.filter(c=>c.nad===t&&!DONE.includes(c.status));
  const dueTm    = convs.filter(c=>c.nad===tm&&!DONE.includes(c.status));
  const used     = new Set([...overdue,...dueToday,...dueTm].map(c=>c.id));
  const queue    = convs.filter(c=>['follow-up','waiting on me','active'].includes(c.status)&&!used.has(c.id))
    .sort((a,b)=>{ if(a.nad&&b.nad) return a.nad.localeCompare(b.nad); if(a.nad) return -1; if(b.nad) return 1; return b.lastTs-a.lastTs; });
  const total = overdue.length+dueToday.length+dueTm.length+queue.length;
  return (
    <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, marginBottom:4 }}>Follow-up Queue</div>
        <div style={{ fontSize:13, color:C.muted }}>{total} conversations need your attention</div>
        {total===0&&(
          <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Queue Clear!</div>
            <div style={{ fontSize:13, marginTop:6 }}>All caught up. No follow-ups pending.</div>
          </div>
        )}
      </div>
      <QueueSection title="🚨 Overdue" color={C.red} items={overdue} upd={upd} onOpenCustomer={onOpenCustomer} defaultOpen={true}/>
      <QueueSection title="⚡ Due Today" color={C.amber} items={dueToday} upd={upd} onOpenCustomer={onOpenCustomer} defaultOpen={true}/>
      <QueueSection title="🔵 Due Tomorrow" color={C.cyan} items={dueTm} upd={upd} onOpenCustomer={onOpenCustomer} defaultOpen={true}/>
      <QueueSection title="📋 Follow-up Queue" color={C.blue} items={queue} upd={upd} onOpenCustomer={onOpenCustomer} defaultOpen={true}/>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [view, setView] = useState('upload');
  const [convs, setConvs] = useState([]);
  const [myName, setMyName] = useState(lsG(KEYS.MYNAME)||'Me');
  const [convMeta, setConvMetaRaw] = useState(()=>lsG(KEYS.META)||{});
  const [custMeta, setCustMetaRaw] = useState(()=>lsG(KEYS.CUST)||{});
  const [savedFilters, setSavedFiltersRaw] = useState(()=>lsG(KEYS.FILTERS)||DEFAULT_SAVED_FILTERS);
  const [customerPanel, setCustomerPanel] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [idbLoaded, setIdbLoaded] = useState(false);
  // FIX #4: track which conv to open in inbox
  const [inboxTargetId, setInboxTargetId] = useState(null);

  // FIX #1: load convs from IndexedDB on mount
  useEffect(() => {
    idbGet('convs').then(saved => {
      if (saved?.length) {
        setConvs(saved);
        setView('dashboard');
      }
      setIdbLoaded(true);
    });
  }, []);

  const setConvMeta = useCallback(u=>setConvMetaRaw(p=>{ const n=typeof u==='function'?u(p):u; lsS(KEYS.META,n); return n; }),[]);
  const setCustMeta = useCallback(u=>setCustMetaRaw(p=>{ const n=typeof u==='function'?u(p):u; lsS(KEYS.CUST,n); return n; }),[]);
  const setSavedFilters = useCallback(v=>{ setSavedFiltersRaw(v); lsS(KEYS.FILTERS,v); },[]);

  const handleLoad = useCallback((newConvs, name, initialMeta) => {
    setConvs(newConvs);
    if (name) { setMyName(name); lsS(KEYS.MYNAME, name); }
    if (initialMeta && Object.keys(initialMeta).length) setConvMeta(prev => ({ ...initialMeta, ...prev }));
    // FIX #1: persist raw conversations to IndexedDB
    idbSet('convs', newConvs);
    setView('dashboard');
  }, [setConvMeta]);

  const enrichedConvs = useMemo(()=>convs.map(c=>{
    const customer = c.participants.find(p=>p!==myName)||c.title;
    const meta = convMeta[c.id]||{};
    return { ...c, customer, status:meta.status||'new', tags:meta.tags||[], notes:meta.notes||'', nad:meta.nad||'', _customer:null };
  }).sort((a,b)=>b.lastTs-a.lastTs),[convs,myName,convMeta]);

  const customers = useMemo(()=>{
    const map={};
    enrichedConvs.forEach(c=>{
      if(!map[c.customer]) map[c.customer]={name:c.customer,conversations:[],messages:[]};
      map[c.customer].conversations.push(c);
      map[c.customer].messages.push(...c.messages.filter(m=>m.sender===c.customer));
    });
    return Object.values(map).map(c=>({
      ...c, meta:custMeta[c.name]||{},
      totalMessages:c.messages.length, totalConversations:c.conversations.length,
      lastMessage:c.messages.reduce((l,m)=>(!l||m.ts>l.ts)?m:l,null),
      firstMessage:c.messages.reduce((f,m)=>(!f||m.ts<f.ts)?m:f,null),
    })).sort((a,b)=>(b.lastMessage?.ts||0)-(a.lastMessage?.ts||0));
  },[enrichedConvs,custMeta]);

  const finalConvs = useMemo(()=>enrichedConvs.map(c=>({...c,_customer:customers.find(cu=>cu.name===c.customer)})),[enrichedConvs,customers]);

  const overdueCount = useMemo(()=>{
    const t=todayStr();
    return finalConvs.filter(c=>c.nad&&c.nad<t&&!DONE.includes(c.status)).length;
  },[finalConvs]);

  // FIX #4: open specific conversation from customer panel
  const handleOpenConvFromPanel = useCallback((conv) => {
    setInboxTargetId(conv.id);
    setView('inbox');
    setCustomerPanel(null);
  }, []);

  const TABS = [
    { id:'dashboard',     label:'Dashboard',     icon:BarChart3 },
    { id:'queue',         label:'Queue',         icon:ListChecks, badge:overdueCount },
    { id:'inbox',         label:'Inbox',         icon:Inbox },
    { id:'pipeline',      label:'Pipeline',      icon:LayoutGrid },
    { id:'conversations', label:'Conversations', icon:MessageSquare },
    { id:'customers',     label:'Customers',     icon:Users },
  ];

  return (
    <div style={{ background:C.bg, minHeight:'100vh', color:C.text, fontFamily:'"SF Pro Display","Segoe UI",system-ui,-apple-system,sans-serif', display:'flex', flexDirection:'column', fontSize:13 }}>
      {view!=='upload'&&(
        <header style={{ background:`${C.card}e8`, backdropFilter:'blur(12px)', borderBottom:`1px solid ${C.border}`, padding:'0 20px', height:52, display:'flex', alignItems:'center', gap:16, flexShrink:0, position:'sticky', top:0, zIndex:30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ fontSize:18, fontWeight:900, background:`linear-gradient(135deg,${C.amber},#fcd34d)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-1 }}>⚡ CrazyMoe</span>
            <span style={{ background:`${C.amber}20`, color:C.amber, fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:100, border:`1px solid ${C.amber}40`, letterSpacing:1, textTransform:'uppercase' }}>CRM</span>
          </div>
          <nav style={{ display:'flex', gap:2, flex:1 }}>
            {TABS.map(({id,label,icon:Icon,badge})=>(
              <button key={id} onClick={()=>setView(id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:view===id?700:500, transition:'all 0.15s', background:view===id?`${C.amber}18`:'transparent', color:view===id?C.amber:C.muted, position:'relative' }}>
                <Icon size={13}/>{label}
                {badge>0&&(
                  <span style={{ position:'absolute', top:2, right:2, background:C.red, color:'#fff', fontSize:8, fontWeight:800, width:14, height:14, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>{badge>9?'9+':badge}</span>
                )}
              </button>
            ))}
          </nav>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }}/>
              <input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Search…" style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px 6px 30px', color:C.text, fontSize:12, width:180, outline:'none' }}/>
              {globalSearch&&<X size={12} onClick={()=>setGlobalSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:C.muted, cursor:'pointer' }}/>}
            </div>
            <Btn onClick={()=>setView('upload')} style={{ fontSize:11, padding:'5px 12px' }}><Upload size={12}/>Import</Btn>
          </div>
        </header>
      )}

      <div style={{ flex:1, overflow:'hidden', display:'flex', position:'relative' }}>
        {view==='upload'        && <UploadView onLoad={handleLoad} loading={false} hasData={convs.length>0} onContinue={()=>setView('dashboard')}/>}
        {view==='dashboard'     && <DashboardView convs={finalConvs} customers={customers} onViewChange={setView}/>}
        {view==='inbox'         && <InboxView convs={finalConvs} myName={myName} convMeta={convMeta} setConvMeta={setConvMeta} onOpenCustomer={setCustomerPanel} globalSearch={globalSearch} initialConvId={inboxTargetId} onConvOpened={()=>setInboxTargetId(null)}/>}
        {view==='pipeline'      && <PipelineView convs={finalConvs} convMeta={convMeta} setConvMeta={setConvMeta} onOpenCustomer={setCustomerPanel}/>}
        {view==='queue'         && <QueueView convs={finalConvs} convMeta={convMeta} setConvMeta={setConvMeta} onOpenCustomer={setCustomerPanel}/>}
        {view==='conversations' && <ConversationsView convs={finalConvs} myName={myName} convMeta={convMeta} setConvMeta={setConvMeta} onOpenCustomer={setCustomerPanel} globalSearch={globalSearch} savedFilters={savedFilters} setSavedFilters={setSavedFilters}/>}
        {view==='customers'     && <CustomersView customers={customers} custMeta={custMeta} setCustMeta={setCustMeta} onOpenCustomer={setCustomerPanel} globalSearch={globalSearch}/>}

        {customerPanel&&(
          <CustomerPanel
            customer={customerPanel}
            meta={custMeta[customerPanel.name]||{}}
            setMeta={m=>setCustMeta(prev=>({...prev,[customerPanel.name]:m}))}
            onClose={()=>setCustomerPanel(null)}
            onOpenConv={handleOpenConvFromPanel}
          />
        )}
      </div>
    </div>
  );
}
