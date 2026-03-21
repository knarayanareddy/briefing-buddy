import type { Database } from "./types";

type ClientError = { message: string } | null;
type Session = { access_token?: string; user?: { id: string } } | null;

type QueryResult<T> = Promise<{ data: T; error: ClientError }> & {
  single: () => Promise<{ data: T extends Array<infer U> ? U | null : T | null; error: ClientError }>;
};

const createQueryResult = <T>(data: T): QueryResult<T> => {
  const query = Promise.resolve({ data, error: null }) as QueryResult<T>;
  query.single = async () => ({
    data: (Array.isArray(data) ? (data[0] ?? null) : data) as T extends Array<infer U> ? U | null : T | null,
    error: null,
  });
  return query;
};

const unavailable = (scope: string): Exclude<ClientError, null> => ({
  message: `${scope} is unavailable in preview until Lovable Cloud is configured.`,
});

const queryBuilder = {
  select: (_columns?: string) => ({
    eq: (_column: string, _value: unknown) => createQueryResult<any[]>([]),
    single: async () => ({ data: null, error: null }),
  }),
};

const previewSafeClient = {
  auth: {
    getSession: async () => ({ data: { session: null as Session }, error: null }),
    onAuthStateChange: (_cb: (event: string, session: Session) => void) => ({
      data: { subscription: { unsubscribe: () => undefined } },
    }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithOtp: async (_input: { email: string }) => ({ data: null, error: unavailable("Email sign-in") }),
    signInWithOAuth: async (_input: { provider: string }) => ({ data: null, error: unavailable("OAuth sign-in") }),
    signOut: async () => ({ error: null }),
  },
  from: (_table: keyof Database["public"]["Tables"] | string) => queryBuilder,
  functions: {
    invoke: async (name: string, _options?: { body?: unknown }) => ({
      data: null,
      error: unavailable(`Function \"${name}\"`),
    }),
  },
};

export const supabase = previewSafeClient as any;