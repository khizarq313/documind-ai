// ═══════════════════════════════════════════════════
// DocuMind AI — localStorage Utility Module
// Typed getters/setters for all persisted data
// ═══════════════════════════════════════════════════

import type {
  DocuMindUser,
  DocumentRecord,
  ChatStore,
  ChatSession,
  QueryLogEntry,
  DocumentSummaryResponse,
  SummaryMode,
} from '@/types';

// ── Keys ──────────────────────────────────────────

const KEYS = {
  user: 'documind_user',
  documents: (userId: string) => `documind_documents_${userId}`,
  chats: (userId: string) => `documind_chats_${userId}`,
  favorites: (userId: string) => `documind_favorites_${userId}`,
  queryLog: (userId: string) => `documind_query_log_${userId}`,
  summary: (docId: string, mode: string) => `documind_summary_${docId}_${mode}`,
} as const;

// ── Helpers ───────────────────────────────────────

function getItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[DocuMind Storage] Failed to write:', key, e);
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

// ── User ──────────────────────────────────────────

export function getUser(): DocuMindUser | null {
  return getItem<DocuMindUser>(KEYS.user);
}

export function setUser(user: DocuMindUser): void {
  setItem(KEYS.user, user);
}

export function clearUser(): void {
  removeItem(KEYS.user);
}

// ── Documents ─────────────────────────────────────

export function getDocuments(userId: string): DocumentRecord[] {
  return getItem<DocumentRecord[]>(KEYS.documents(userId)) ?? [];
}

export function setDocuments(userId: string, docs: DocumentRecord[]): void {
  setItem(KEYS.documents(userId), docs);
}

export function addDocument(userId: string, doc: DocumentRecord): void {
  const docs = getDocuments(userId);
  docs.push(doc);
  setDocuments(userId, docs);
}

export function updateDocument(userId: string, docId: string, updates: Partial<DocumentRecord>): void {
  const docs = getDocuments(userId);
  const idx = docs.findIndex((d) => d.id === docId);
  if (idx !== -1) {
    docs[idx] = { ...docs[idx], ...updates };
    setDocuments(userId, docs);
  }
}

export function getDocumentById(userId: string, docId: string): DocumentRecord | null {
  const docs = getDocuments(userId);
  return docs.find((d) => d.id === docId) ?? null;
}

export function removeDocument(userId: string, docId: string): void {
  const docs = getDocuments(userId).filter((d) => d.id !== docId);
  setDocuments(userId, docs);
}

// ── Chat Sessions ─────────────────────────────────

export function getChatStore(userId: string): ChatStore {
  return getItem<ChatStore>(KEYS.chats(userId)) ?? { chats: [], activeChatId: null };
}

export function setChatStore(userId: string, store: ChatStore): void {
  setItem(KEYS.chats(userId), store);
}

export function getChats(userId: string): ChatSession[] {
  return getChatStore(userId).chats;
}

export function getActiveChatId(userId: string): string | null {
  return getChatStore(userId).activeChatId;
}

export function setActiveChatId(userId: string, chatId: string | null): void {
  const store = getChatStore(userId);
  store.activeChatId = chatId;
  setChatStore(userId, store);
}

export function addChat(userId: string, chat: ChatSession): void {
  const store = getChatStore(userId);
  store.chats.unshift(chat);
  store.activeChatId = chat.id;
  setChatStore(userId, store);
}

export function updateChat(userId: string, chatId: string, updates: Partial<ChatSession>): void {
  const store = getChatStore(userId);
  const idx = store.chats.findIndex((c) => c.id === chatId);
  if (idx !== -1) {
    store.chats[idx] = { ...store.chats[idx], ...updates };
    setChatStore(userId, store);
  }
}

export function removeChat(userId: string, chatId: string): void {
  const store = getChatStore(userId);
  store.chats = store.chats.filter((c) => c.id !== chatId);
  if (store.activeChatId === chatId) {
    store.activeChatId = store.chats[0]?.id ?? null;
  }
  setChatStore(userId, store);
}

export function clearAllChats(userId: string): void {
  setChatStore(userId, { chats: [], activeChatId: null });
}

// ── Favorites ─────────────────────────────────────

export function getFavorites(userId: string): string[] {
  return getItem<string[]>(KEYS.favorites(userId)) ?? [];
}

export function setFavorites(userId: string, favorites: string[]): void {
  setItem(KEYS.favorites(userId), favorites);
}

export function toggleFavorite(userId: string, docId: string): boolean {
  const favs = getFavorites(userId);
  const idx = favs.indexOf(docId);
  if (idx !== -1) {
    favs.splice(idx, 1);
    setFavorites(userId, favs);
    return false; // removed
  } else {
    favs.push(docId);
    setFavorites(userId, favs);
    return true; // added
  }
}

export function isFavorite(userId: string, docId: string): boolean {
  return getFavorites(userId).includes(docId);
}

// ── Query Log ─────────────────────────────────────

const MAX_QUERY_LOG = 100;

export function getQueryLog(userId: string): QueryLogEntry[] {
  return getItem<QueryLogEntry[]>(KEYS.queryLog(userId)) ?? [];
}

export function setQueryLog(userId: string, log: QueryLogEntry[]): void {
  setItem(KEYS.queryLog(userId), log);
}

export function addQueryLogEntry(userId: string, entry: QueryLogEntry): void {
  const log = getQueryLog(userId);
  log.unshift(entry);
  if (log.length > MAX_QUERY_LOG) log.length = MAX_QUERY_LOG;
  setQueryLog(userId, log);
}

// ── Summary Cache ─────────────────────────────────

export function getSummary(docId: string, mode: SummaryMode): DocumentSummaryResponse | null {
  return getItem<DocumentSummaryResponse>(KEYS.summary(docId, mode));
}

export function setSummary(docId: string, mode: SummaryMode, summary: DocumentSummaryResponse): void {
  setItem(KEYS.summary(docId, mode), summary);
}

export function removeSummariesForDocument(docId: string): void {
  if (typeof window === 'undefined') return;
  const modes: SummaryMode[] = ['quick', 'normal', 'standard', 'deep', 'executive', 'student'];
  modes.forEach((mode) => removeItem(KEYS.summary(docId, mode)));
}

// ── Atomic Delete Document (cleans up everything) ─

export function deleteDocumentFull(userId: string, docId: string): void {
  // Remove document record
  removeDocument(userId, docId);

  // Remove from favorites
  const favs = getFavorites(userId).filter((id) => id !== docId);
  setFavorites(userId, favs);

  // Remove chats with this document
  const store = getChatStore(userId);
  store.chats = store.chats.filter((c) => c.documentId !== docId);
  if (store.activeChatId && !store.chats.find((c) => c.id === store.activeChatId)) {
    store.activeChatId = store.chats[0]?.id ?? null;
  }
  setChatStore(userId, store);

  // Remove cached summaries
  removeSummariesForDocument(docId);
}

// ── Logout (clear all user data) ──────────────────

export function clearAllUserData(): void {
  if (typeof window === 'undefined') return;
  const user = getUser();
  if (user) {
    removeItem(KEYS.documents(user.id));
    removeItem(KEYS.chats(user.id));
    removeItem(KEYS.favorites(user.id));
    removeItem(KEYS.queryLog(user.id));
    // Clean up all summaries
    const docs = getDocuments(user.id);
    docs.forEach((doc) => removeSummariesForDocument(doc.id));
  }
  clearUser();
}

// ── Storage Quota Check ───────────────────────────

export async function checkStorageQuota(): Promise<{ usedMB: number; totalMB: number; percentUsed: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    const usedMB = (est.usage ?? 0) / (1024 * 1024);
    const totalMB = (est.quota ?? 0) / (1024 * 1024);
    const percentUsed = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;
    return { usedMB: Math.round(usedMB * 100) / 100, totalMB: Math.round(totalMB), percentUsed: Math.round(percentUsed * 10) / 10 };
  } catch {
    return null;
  }
}
