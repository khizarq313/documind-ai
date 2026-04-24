// ═══════════════════════════════════════════════════
// DocuMind AI — Complete Type Definitions
// ═══════════════════════════════════════════════════

// ── User ──────────────────────────────────────────
export interface DocuMindUser {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
}

// ── Document & Chunks ─────────────────────────────
export interface ChunkRecord {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

export type DocumentStatus = 'uploading' | 'processing' | 'indexed' | 'failed';

export interface DocumentRecord {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  pageCount: number;
  chunkCount: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  isServerBacked: boolean;
  chunks: ChunkRecord[];
}

// ── Chat & Messages ───────────────────────────────
export interface MessageAttachment {
  name: string;
  sizeBytes: number;
}

export interface Citation {
  documentName: string;
  pageNumber: number;
  chunkIndex?: number;
  relevanceScore?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  latencyMs?: number;
  model?: string;
  isStreaming?: boolean;
  timestamp: string;
  attachment?: MessageAttachment;
}

export type ChatStatus = 'ready' | 'uploading' | 'indexing' | 'processing' | 'indexed' | 'failed';

export interface ChatSession {
  id: string;
  title: string;
  documentId: string | null;
  status: ChatStatus;
  messages: Message[];
  createdAt: string;
  lastActivityAt: string;
  isCustomTitle: boolean;
}

export interface ChatStore {
  chats: ChatSession[];
  activeChatId: string | null;
}

// ── Query Log ─────────────────────────────────────
export interface QueryLogEntry {
  id: string;
  question: string;
  documentId: string;
  documentName: string;
  latencyMs: number;
  model: string;
  citationCount: number;
  timestamp: string;
}

// ── Summary ───────────────────────────────────────
export type SummaryMode = 'quick' | 'normal' | 'standard' | 'deep' | 'executive' | 'student';

export interface KeyInsight {
  title: string;
  detail: string;
  icon: string;
}

export interface MetricItem {
  label: string;
  value: string;
}

export interface DocumentSummaryResponse {
  overview: string;
  whyItMatters: string;
  keyInsights: KeyInsight[];
  metrics: MetricItem[];
  finalTakeaway: string;
  documentType: string;
  contactInfo: string[];
  confidence: number;
}

// ── Context Chunk (for RAG) ───────────────────────
export interface ContextChunk {
  content: string;
  pageNumber: number;
  documentName: string;
  relevanceScore: number;
  chunkIndex: number;
}

// ── API Request/Response Types ────────────────────
export interface UploadResponse {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  pageCount: number;
  chunkCount: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  chunks: ChunkRecord[];
}

export interface QueryRequest {
  question: string;
  contextChunks: ContextChunk[];
  documentName: string;
}

export interface SummarizeRequest {
  fullText: string;
  mode: SummaryMode;
  filename: string;
}

// ── SSE Event Types ───────────────────────────────
export type SSEEventType = 'token' | 'citation' | 'done' | 'error';

export interface SSETokenEvent {
  token: string;
}

export interface SSECitationEvent {
  documentName: string;
  pageNumber: number;
}

export interface SSEDoneEvent {
  latencyMs: number;
  model: string;
  chunkCount: number;
}

export interface SSEErrorEvent {
  message: string;
}

// ── Toast ─────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

// ── Analytics ─────────────────────────────────────
export interface AnalyticsStats {
  totalDocuments: number;
  totalQueries: number;
  avgLatencyMs: number;
  totalChunks: number;
}

export interface DailyQueryCount {
  date: string;
  count: number;
}
