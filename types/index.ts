// All shared TypeScript types — import from here, never redefine locally

export interface EmptyStateAction {
  label: string
  variant: 'primary' | 'secondary' | 'ai'
  onClick: () => void
  disabled?: boolean
}

export type UserRole = 'viewer' | 'suggester' | 'editor' | 'admin';

export type SuggestionType = 'edit' | 'create' | 'delete';

export type HistoryAction =
  | 'created'
  | 'edited'
  | 'deleted'
  | 'suggested_edit'
  | 'suggested_create'
  | 'suggested_delete'
  | 'suggestion_approved'
  | 'suggestion_rejected'
  | 'bulk_import';

export type Project = {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
};

export type ApiEntry = {
  id: string;
  project_id: string;
  name: string;
  endpoint: string;
  method: string;
  version?: string;
  status?: string;
  group?: string;
  tags?: string[];
  tool_description?: string;
  mcp_config?: unknown;
  request_schema?: unknown;
  response_schema?: unknown;
  code_snippet?: string;
  special_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  created_at: string;
};

export type Suggestion = {
  id: string;
  type: SuggestionType;
  project_id: string;
  project_name: string;
  api_id: string | null;
  api_name: string;
  user_id: string;
  user_name: string;
  payload: unknown;
  original?: unknown;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_note?: string;
};

export type HistoryEntry = {
  id: string;
  action: HistoryAction;
  project_id: string;
  project_name: string;
  api_id?: string;
  api_name?: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  detail?: string;
  created_at: string;
};
