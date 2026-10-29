import { api } from "./client";
import type {
  AssistantAnswer,
  AssistantStatus,
  AuthConfig,
  DashboardStats,
  Decision,
  DecisionInput,
  DecisionStatus,
  DecisionSummary,
  Knowledge,
  KnowledgeInput,
  KnowledgeSummary,
  Page,
  Project,
  ProjectInput,
  ProjectStatus,
  SearchFilter,
  SearchResults,
  TagCount,
  User,
  UUID,
} from "./types";

type SortOrder = "asc" | "desc";

export const authApi = {
  config: () => api.get<AuthConfig>("/auth/config", { noRefresh: true }),
  me: () => api.get<User>("/auth/me"),
  register: (body: { email: string; password: string; full_name: string; accept_terms: boolean; terms_version: string }) =>
    api.post<User>("/auth/register", body, { noRefresh: true }),
  login: (body: { email: string; password: string }) => api.post<User>("/auth/login", body, { noRefresh: true }),
  logout: () => api.post<void>("/auth/logout", undefined, { noRefresh: true }),
  logoutEverywhere: () => api.post<void>("/auth/logout-all"),
  deleteAccount: (password: string) => api.post<void>("/auth/delete-account", { password }),
  updateProfile: (body: { full_name: string }) => api.patch<User>("/auth/me", body),
  changePassword: (body: { current_password: string; new_password: string }) =>
    api.post<void>("/auth/change-password", body),
  requestPasswordReset: (email: string) =>
    api.post<{ detail: string }>("/auth/password-reset/request", { email }, { noRefresh: true }),
  confirmPasswordReset: (token: string, new_password: string) =>
    api.post<void>("/auth/password-reset/confirm", { token, new_password }, { noRefresh: true }),
};

export interface KnowledgeQuery {
  q?: string;
  tag?: string;
  project_id?: UUID;
  archived?: boolean;
  sort?: "updated_at" | "created_at" | "title";
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export const knowledgeApi = {
  list: (query: KnowledgeQuery = {}, signal?: AbortSignal) =>
    api.get<Page<KnowledgeSummary>>("/knowledge", { query: { ...query }, signal }),
  get: (id: UUID) => api.get<Knowledge>(`/knowledge/${id}`),
  create: (body: KnowledgeInput) => api.post<Knowledge>("/knowledge", body),
  update: (id: UUID, body: Partial<KnowledgeInput> & { archived?: boolean }) =>
    api.patch<Knowledge>(`/knowledge/${id}`, body),
  remove: (id: UUID) => api.delete(`/knowledge/${id}`),
  tags: () => api.get<TagCount[]>("/tags"),
};

export interface ProjectQuery {
  q?: string;
  status?: ProjectStatus;
  sort?: "updated_at" | "created_at" | "name";
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export const projectsApi = {
  list: (query: ProjectQuery = {}, signal?: AbortSignal) =>
    api.get<Page<Project>>("/projects", { query: { ...query }, signal }),
  get: (id: UUID) => api.get<Project>(`/projects/${id}`),
  create: (body: ProjectInput) => api.post<Project>("/projects", body),
  update: (id: UUID, body: Partial<ProjectInput>) => api.patch<Project>(`/projects/${id}`, body),
  remove: (id: UUID) => api.delete(`/projects/${id}`),
};

export interface DecisionQuery {
  q?: string;
  project_id?: UUID;
  status?: DecisionStatus;
  sort?: "updated_at" | "created_at" | "title";
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export const decisionsApi = {
  list: (query: DecisionQuery = {}, signal?: AbortSignal) =>
    api.get<Page<DecisionSummary>>("/decisions", { query: { ...query }, signal }),
  get: (id: UUID) => api.get<Decision>(`/decisions/${id}`),
  create: (body: DecisionInput) => api.post<Decision>("/decisions", body),
  update: (id: UUID, body: Partial<DecisionInput>) => api.patch<Decision>(`/decisions/${id}`, body),
  remove: (id: UUID) => api.delete(`/decisions/${id}`),
};

export const searchApi = {
  search: (q: string, type: SearchFilter = "all", offset = 0, signal?: AbortSignal) =>
    api.get<SearchResults>("/search", { query: { q, type, limit: type === "all" ? 5 : 20, offset }, signal }),
  stats: () => api.get<DashboardStats>("/dashboard/stats"),
};

export const assistantApi = {
  status: () => api.get<AssistantStatus>("/assistant/status"),
  ask: (question: string, project_id: UUID | null) =>
    api.post<AssistantAnswer>("/assistant/ask", { question, project_id }),
};
