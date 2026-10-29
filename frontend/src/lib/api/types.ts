// These types mirror the FastAPI response schemas in backend/app/schemas.

export type UUID = string;
export type ISODate = string;

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface User {
  id: UUID;
  email: string;
  full_name: string;
  created_at: ISODate;
  terms_version: string | null;
  terms_accepted_at: ISODate | null;
}

export interface AuthConfig {
  password_reset_available: boolean;
  terms_version: string;
}

export interface ProjectRef {
  id: UUID;
  name: string;
}

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export interface Project {
  id: UUID;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: ISODate;
  updated_at: ISODate;
  knowledge_count: number;
  decision_count: number;
}

export interface ProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
}

export interface KnowledgeSummary {
  id: UUID;
  title: string;
  excerpt: string;
  tags: string[];
  project: ProjectRef | null;
  archived_at: ISODate | null;
  attachment_count: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface KnowledgeRef {
  id: UUID;
  title: string;
  archived: boolean;
}

export interface Knowledge extends KnowledgeSummary {
  content: string;
  related: KnowledgeRef[];
  attachments: Attachment[];
}

export type FileKind = "image" | "pdf" | "text";
/** pending = still reading the text; unavailable = OCR isn't installed on the server. */
export type ExtractionStatus = "pending" | "done" | "failed" | "unavailable";

export interface Attachment {
  id: UUID;
  knowledge_item_id: UUID;
  filename: string;
  kind: FileKind;
  content_type: string;
  size_bytes: number;
  extraction_status: ExtractionStatus;
  text_chars: number;
  created_at: ISODate;
}

export interface AttachmentDetail extends Attachment {
  extracted_text: string;
}

export interface StorageUsage {
  used_bytes: number;
  quota_bytes: number;
  max_file_bytes: number;
  ocr_available: boolean;
}

export interface KnowledgeInput {
  title: string;
  content: string;
  tags: string[];
  project_id: UUID | null;
  related_ids: UUID[];
}

export interface TagCount {
  name: string;
  count: number;
}

export type DecisionStatus = "proposed" | "accepted" | "superseded" | "reviewed";

export interface DecisionSummary {
  id: UUID;
  title: string;
  excerpt: string;
  project: ProjectRef | null;
  status: DecisionStatus;
  has_outcome: boolean;
  reviewed_at: ISODate | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface DecisionFields {
  context: string;
  problem: string;
  decision: string;
  reasoning: string;
  alternatives: string;
  expected_outcome: string;
  actual_outcome: string;
}

export interface Decision extends DecisionSummary, DecisionFields {}

export interface DecisionInput extends DecisionFields {
  title: string;
  status: DecisionStatus;
  project_id: UUID | null;
}

export type SearchResultType = "knowledge" | "project" | "decision";

export interface SearchHit {
  type: SearchResultType;
  id: UUID;
  title: string;
  excerpt: string;
  updated_at: ISODate;
  label: string | null;
}

export type SearchFilter = "all" | SearchResultType;

export interface SearchResults {
  query: string;
  type: SearchFilter;
  knowledge: SearchHit[];
  projects: SearchHit[];
  decisions: SearchHit[];
  counts: { knowledge: number; projects: number; decisions: number };
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardStats {
  knowledge_count: number;
  archived_knowledge_count: number;
  project_count: number;
  active_project_count: number;
  decision_count: number;
  tag_count: number;
}

export interface AssistantStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
}

export interface AssistantSource {
  ref: number;
  type: "knowledge" | "decision";
  id: UUID;
  title: string;
  excerpt: string;
  cited: boolean;
}

export interface AssistantAnswer {
  answer: string;
  grounded: boolean;
  sources: AssistantSource[];
  provider: string | null;
  model: string | null;
}
