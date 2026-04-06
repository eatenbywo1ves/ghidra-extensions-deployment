/** Shared request/response types for API routes */

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Works ────────────────────────────────────────────────────────────────────

export interface CreateWorkRequest {
  title: string;
  genre?: string;
  contentType: "BOOK" | "SHORT_STORY" | "ARTICLE" | "SCRIPT" | "POEM" | "OTHER";
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CreateWorkResponse {
  workId: string;
  uploadUrl: string;   // Presigned S3 PUT URL
  storageKey: string;
}

export interface UpdateWorkRequest {
  title?: string;
  genre?: string;
  description?: string;
  status?: "READY" | "FAILED";
  contentHash?: string;
  wordCount?: number;
}

// ── Rights ───────────────────────────────────────────────────────────────────

export interface UpdateRightsRequest {
  licenseType?: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  drmEnabled?: boolean;
  allowPublicPreview?: boolean;
  previewWordLimit?: number;
}

// ── Analysis ─────────────────────────────────────────────────────────────────

export interface AnalyzeWorkResponse {
  jobId: string;
  message: string;
}

// ── Visualizations ───────────────────────────────────────────────────────────

export interface VisualizationStatus {
  id: string;
  type: string;
  status: "PENDING" | "GENERATED" | "FAILED";
  url?: string;       // Presigned download URL when GENERATED
  prompt?: string;
  generatedAt?: string;
}
