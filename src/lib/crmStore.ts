import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CRMMessage {
  conversation_title: string;
  listing_title: string;
  thread_path: string;
  conversation_slug: string;
  customer_name: string;
  sender: string;
  message_text: string;
  message_date: string;
  message_time: string;
  timestamp_iso: string;
  timestamp_ms: number;
  month_bucket: string;
  product: string;
  system_message: number;
  owner_message: number;
  attachments_count: number;
  reactions_count: number;
  is_unsent: number;
  source_file: string;
  source_folder: string;
  message_index_in_file: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: CRMFilters;
}

export interface CRMFilters {
  search: string;
  product: string;
  customer_name: string;
  sender: string;
  hideSystem: boolean;
  ownerOnly: boolean;
  customerOnly: boolean;
  withAttachments: boolean;
  unsentOnly: boolean;
  dateFrom: string;
  dateTo: string;
}

export const defaultFilters: CRMFilters = {
  search: '',
  product: '',
  customer_name: '',
  sender: '',
  hideSystem: true,
  ownerOnly: false,
  customerOnly: false,
  withAttachments: false,
  unsentOnly: false,
  dateFrom: '',
  dateTo: '',
};

interface CRMStore {
  messages: CRMMessage[];
  fileName: string | null;
  uploadTime: string | null;
  ownerName: string;
  filters: CRMFilters;
  filterPresets: FilterPreset[];
  setMessages: (msgs: CRMMessage[], fileName: string) => void;
  clearData: () => void;
  setOwnerName: (name: string) => void;
  setFilters: (filters: Partial<CRMFilters>) => void;
  resetFilters: () => void;
  saveFilterPreset: (name: string) => void;
  loadFilterPreset: (id: string) => void;
  deleteFilterPreset: (id: string) => void;
}

export const useCRMStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      messages: [],
      fileName: null,
      uploadTime: null,
      ownerName: 'Boukadida C Mohamed',
      filters: { ...defaultFilters },
      filterPresets: [],
      setMessages: (msgs, fileName) => set({ messages: msgs, fileName, uploadTime: new Date().toISOString() }),
      clearData: () => set({ messages: [], fileName: null, uploadTime: null }),
      setOwnerName: (name) => set({ ownerName: name }),
      setFilters: (partial) => set((s) => ({ filters: { ...s.filters, ...partial } })),
      resetFilters: () => set({ filters: { ...defaultFilters } }),
      saveFilterPreset: (name) => {
        const id = crypto.randomUUID();
        set((s) => ({ filterPresets: [...s.filterPresets, { id, name, filters: { ...s.filters } }] }));
      },
      loadFilterPreset: (id) => {
        const preset = get().filterPresets.find((p) => p.id === id);
        if (preset) set({ filters: { ...preset.filters } });
      },
      deleteFilterPreset: (id) => set((s) => ({ filterPresets: s.filterPresets.filter((p) => p.id !== id) })),
    }),
    { name: 'crm-store' }
  )
);

// CSV parsing
export function parseCSV(text: string): CRMMessage[] {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const messages: CRMMessage[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length !== headers.length) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h.trim()] = values[idx]; });
    
    messages.push({
      conversation_title: row.conversation_title || '',
      listing_title: row.listing_title || '',
      thread_path: row.thread_path || '',
      conversation_slug: row.conversation_slug || '',
      customer_name: row.customer_name || '',
      sender: row.sender || '',
      message_text: row.message_text || '',
      message_date: row.message_date || '',
      message_time: row.message_time || '',
      timestamp_iso: row.timestamp_iso || '',
      timestamp_ms: Number(row.timestamp_ms) || 0,
      month_bucket: row.month_bucket || '',
      product: row.product || 'Unclassified',
      system_message: Number(row.system_message) || 0,
      owner_message: Number(row.owner_message) || 0,
      attachments_count: Number(row.attachments_count) || 0,
      reactions_count: Number(row.reactions_count) || 0,
      is_unsent: Number(row.is_unsent) || 0,
      source_file: row.source_file || '',
      source_folder: row.source_folder || '',
      message_index_in_file: Number(row.message_index_in_file) || 0,
    });
  }
  return messages;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

// Filter logic
export function filterMessages(messages: CRMMessage[], filters: CRMFilters): CRMMessage[] {
  return messages.filter((m) => {
    if (filters.hideSystem && m.system_message === 1) return false;
    if (filters.ownerOnly && m.owner_message !== 1) return false;
    if (filters.customerOnly && m.owner_message === 1) return false;
    if (filters.withAttachments && m.attachments_count === 0) return false;
    if (filters.unsentOnly && m.is_unsent !== 1) return false;
    if (filters.product && m.product !== filters.product) return false;
    if (filters.customer_name && m.customer_name !== filters.customer_name) return false;
    if (filters.sender && m.sender !== filters.sender) return false;
    if (filters.dateFrom && m.message_date < filters.dateFrom) return false;
    if (filters.dateTo && m.message_date > filters.dateTo) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchable = [m.conversation_title, m.listing_title, m.customer_name, m.sender, m.message_text, m.thread_path].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });
}

// Demo data
export function getDemoMessages(): CRMMessage[] {
  const now = Date.now();
  const day = 86400000;
  const names = ['Sarah Johnson', 'Mike Chen', 'Emily Davis', 'James Wilson', 'Lisa Brown'];
  const products = ['Samsung 65" TV', 'Leather Sofa Set', 'KitchenAid Mixer', 'Gaming PC Setup', 'Vintage Desk'];
  const msgs: CRMMessage[] = [];
  
  for (let i = 0; i < 80; i++) {
    const custIdx = i % names.length;
    const prodIdx = i % products.length;
    const isOwner = i % 3 === 0;
    const isSystem = i % 12 === 0;
    const ts = now - (i * day * 0.3);
    const d = new Date(ts);
    
    msgs.push({
      conversation_title: `${names[custIdx]} - ${products[prodIdx]}`,
      listing_title: products[prodIdx],
      thread_path: `inbox/${names[custIdx].toLowerCase().replace(' ', '_')}_${prodIdx}`,
      conversation_slug: `conv_${custIdx}_${prodIdx}`,
      customer_name: names[custIdx],
      sender: isOwner ? 'Boukadida C Mohamed' : names[custIdx],
      message_text: isSystem ? 'You sent an attachment.' : isOwner
        ? ['Yes still available!', 'Can do $' + (50 + prodIdx * 30), 'When can you pick up?', 'Great, see you then!'][i % 4]
        : ['Is this still available?', 'What\'s the lowest you\'ll go?', 'Can I come see it today?', 'I\'ll take it!'][i % 4],
      message_date: d.toISOString().split('T')[0],
      message_time: d.toTimeString().slice(0, 8),
      timestamp_iso: d.toISOString(),
      timestamp_ms: ts,
      month_bucket: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      product: products[prodIdx],
      system_message: isSystem ? 1 : 0,
      owner_message: isOwner ? 1 : 0,
      attachments_count: i % 8 === 0 ? 1 : 0,
      reactions_count: i % 10 === 0 ? 1 : 0,
      is_unsent: i % 20 === 0 ? 1 : 0,
      source_file: `message_${Math.floor(i / 10)}.json`,
      source_folder: 'inbox',
      message_index_in_file: i % 10,
    });
  }
  return msgs;
}

// Export filtered to CSV
export function exportToCSV(messages: CRMMessage[]): string {
  const headers = Object.keys(messages[0] || {});
  const rows = messages.map((m) => headers.map((h) => {
    const val = String((m as any)[h] ?? '');
    return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(','));
  return [headers.join(','), ...rows].join('\n');
}
