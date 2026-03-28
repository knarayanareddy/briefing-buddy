export interface ExecutorInput {
  action_type: string;
  payload: Record<string, unknown>;
  user_id: string;
  evidence_source_ids: string[];
}

export interface ExecutorResult {
  ok: boolean;
  provider_result: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
}

export type ActionExecutor = (input: ExecutorInput, ctx: ExecutorContext) => Promise<ExecutorResult>;

export interface ExecutorContext {
  supabase: any; // SupabaseClient
  connectorSecretKey: string;
}
