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
}

export interface AuthConfig {
  password_reset_available: boolean;
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
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Knowledge extends KnowledgeSummary {
  content: string;
}

export interface KnowledgeInput {
  title: string;
  content: string;
  tags: string[];
  project_id: UUID | null;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface DecisionSummary {
  id: UUID;
  title: string;
  excerpt: string;
  project: ProjectRef | null;
  has_outcome: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface DecisionFields {
  context: string;
  decision: string;
  reasoning: string;
  alternatives: string;
  expected_outcome: string;
  actual_outcome: string;
}

export interface Decision extends DecisionSummary, DecisionFields {}

export interface DecisionInput extends DecisionFields {
  title: string;
  project_id: UUID | null;
}

export type SearchResultType = "knowledge" | "project" | "decision";

export interface SearchHit {
  type: SearchResultType;
  id: UUID;
  title: string;
  excerpt: string;
  updated_at: ISODate;
}

export interface SearchResults {
  query: string;
  knowledge: SearchHit[];
  projects: SearchHit[];
  decisions: SearchHit[];
  total: number;
}

export interface DashboardStats {
  knowledge_count: number;
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
