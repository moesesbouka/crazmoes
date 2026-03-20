import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ──

export type ConversationStatus =
  | 'new'
  | 'active'
  | 'waiting-on-customer'
  | 'waiting-on-me'
  | 'sold'
  | 'follow-up'
  | 'refunded'
  | 'closed';

export const CONVERSATION_STATUSES: { value: ConversationStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'active', label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'waiting-on-customer', label: 'Waiting on Customer', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'waiting-on-me', label: 'Waiting on Me', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'sold', label: 'Sold', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'follow-up', label: 'Follow-up', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'refunded', label: 'Refunded', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'closed', label: 'Closed', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
];

export const CRM_TAGS = [
  { value: 'sold', label: 'Sold', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'follow-up', label: 'Follow-up', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'refunded', label: 'Refunded', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'vip', label: 'VIP', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'no-show', label: 'No-show', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  { value: 'pending-pickup', label: 'Pending Pickup', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { value: 'repeat-buyer', label: 'Repeat Buyer', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'issue', label: 'Issue', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { value: 'hot-lead', label: 'Hot Lead', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
] as const;

export type CRMTag = typeof CRM_TAGS[number]['value'];

export interface ConversationMeta {
  status: ConversationStatus;
  tags: CRMTag[];
  notes: string;
}

export interface CustomerMeta {
  tags: CRMTag[];
  notes: string;
  status: string; // freeform customer-level status
}

export interface SavedFilter {
  id: string;
  name: string;
  filter: Record<string, unknown>;
}

// ── Default presets ──

export const DEFAULT_SAVED_FILTERS: SavedFilter[] = [
  { id: 'preset-hot-leads', name: 'Hot Leads', filter: { tags: ['hot-lead'] } },
  { id: 'preset-waiting-customer', name: 'Waiting on Customer', filter: { statuses: ['waiting-on-customer'] } },
  { id: 'preset-sold', name: 'Sold', filter: { statuses: ['sold'] } },
  { id: 'preset-follow-up', name: 'Follow-up Needed', filter: { statuses: ['follow-up'] } },
  { id: 'preset-vip', name: 'VIP Customers', filter: { tags: ['vip'] } },
  { id: 'preset-with-notes', name: 'With Notes', filter: { hasNotes: true } },
  { id: 'preset-with-tags', name: 'With Tags', filter: { hasTags: true } },
];

// ── Store ──

interface CRMMetadataStore {
  conversationMeta: Record<string, ConversationMeta>;
  customerMeta: Record<string, CustomerMeta>;
  savedFilters: SavedFilter[];

  // Conversation actions
  setConversationStatus: (threadPath: string, status: ConversationStatus) => void;
  toggleConversationTag: (threadPath: string, tag: CRMTag) => void;
  setConversationNotes: (threadPath: string, notes: string) => void;
  getConversationMeta: (threadPath: string) => ConversationMeta;

  // Customer actions
  toggleCustomerTag: (customerName: string, tag: CRMTag) => void;
  setCustomerNotes: (customerName: string, notes: string) => void;
  setCustomerStatus: (customerName: string, status: string) => void;
  getCustomerMeta: (customerName: string) => CustomerMeta;

  // Saved filters
  addSavedFilter: (name: string, filter: Record<string, unknown>) => void;
  removeSavedFilter: (id: string) => void;
  renameSavedFilter: (id: string, name: string) => void;
}

const emptyConvoMeta: ConversationMeta = { status: 'new', tags: [], notes: '' };
const emptyCustomerMeta: CustomerMeta = { tags: [], notes: '', status: '' };

export const useCRMMetadataStore = create<CRMMetadataStore>()(
  persist(
    (set, get) => ({
      conversationMeta: {},
      customerMeta: {},
      savedFilters: [...DEFAULT_SAVED_FILTERS],

      // Conversation
      setConversationStatus: (tp, status) =>
        set((s) => ({
          conversationMeta: {
            ...s.conversationMeta,
            [tp]: { ...(s.conversationMeta[tp] || emptyConvoMeta), status },
          },
        })),

      toggleConversationTag: (tp, tag) =>
        set((s) => {
          const cur = s.conversationMeta[tp] || { ...emptyConvoMeta };
          const tags = cur.tags.includes(tag) ? cur.tags.filter((t) => t !== tag) : [...cur.tags, tag];
          return { conversationMeta: { ...s.conversationMeta, [tp]: { ...cur, tags } } };
        }),

      setConversationNotes: (tp, notes) =>
        set((s) => ({
          conversationMeta: {
            ...s.conversationMeta,
            [tp]: { ...(s.conversationMeta[tp] || emptyConvoMeta), notes },
          },
        })),

      getConversationMeta: (tp) => get().conversationMeta[tp] || { ...emptyConvoMeta },

      // Customer
      toggleCustomerTag: (name, tag) =>
        set((s) => {
          const cur = s.customerMeta[name] || { ...emptyCustomerMeta };
          const tags = cur.tags.includes(tag) ? cur.tags.filter((t) => t !== tag) : [...cur.tags, tag];
          return { customerMeta: { ...s.customerMeta, [name]: { ...cur, tags } } };
        }),

      setCustomerNotes: (name, notes) =>
        set((s) => ({
          customerMeta: {
            ...s.customerMeta,
            [name]: { ...(s.customerMeta[name] || emptyCustomerMeta), notes },
          },
        })),

      setCustomerStatus: (name, status) =>
        set((s) => ({
          customerMeta: {
            ...s.customerMeta,
            [name]: { ...(s.customerMeta[name] || emptyCustomerMeta), status },
          },
        })),

      getCustomerMeta: (name) => get().customerMeta[name] || { ...emptyCustomerMeta },

      // Saved filters
      addSavedFilter: (name, filter) =>
        set((s) => ({
          savedFilters: [...s.savedFilters, { id: crypto.randomUUID(), name, filter }],
        })),

      removeSavedFilter: (id) =>
        set((s) => ({ savedFilters: s.savedFilters.filter((f) => f.id !== id) })),

      renameSavedFilter: (id, name) =>
        set((s) => ({
          savedFilters: s.savedFilters.map((f) => (f.id === id ? { ...f, name } : f)),
        })),
    }),
    { name: 'crm-metadata' }
  )
);

// ── Helpers ──

export function getTagDef(tag: string) {
  return CRM_TAGS.find((t) => t.value === tag) || { value: tag, label: tag, color: 'bg-muted text-muted-foreground border-border' };
}

export function getStatusDef(status: string) {
  return CONVERSATION_STATUSES.find((s) => s.value === status) || CONVERSATION_STATUSES[0];
}
