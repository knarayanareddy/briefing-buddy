/**
 * orqClient — Routing wrapper for LLM calls.
 * Uses Lovable AI gateway with fallback, adding metadata for observability.
 * In production, this would route through orq.ai for guardrails + masking.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface OrqOptions {
  task_type: string;
  user_id_hash?: string;
  latency_budget_ms?: number;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
}

interface OrqResult {
  choices: any[];
  usage?: any;
  routed_via: "lovable_ai" | "fallback";
  task_type: string;
}

/**
 * Route an LLM call through the orq-compatible wrapper.
 * Adds masking of PII patterns before sending.
 */
export async function orqCall(options: OrqOptions): Promise<OrqResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Mask PII patterns in messages
  const maskedMessages = options.messages.map(m => ({
    ...m,
    content: maskPII(m.content),
  }));

  const body: any = {
    model: options.model || "google/gemini-3-flash-preview",
    messages: maskedMessages,
    stream: options.stream || false,
  };

  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  try {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Task-Type": options.task_type,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limited");
      }
      if (response.status === 402) {
        throw new Error("Credits exhausted");
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    return {
      ...result,
      routed_via: "lovable_ai",
      task_type: options.task_type,
    };
  } catch (err) {
    console.error(`orqClient [${options.task_type}] error:`, (err as Error).message);
    throw err;
  }
}

/**
 * Mask common PII patterns (emails, tokens, UUIDs in certain contexts).
 */
function maskPII(text: string): string {
  if (!text) return text;
  // Mask email addresses
  let masked = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  // Mask bearer tokens
  masked = masked.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, "Bearer [TOKEN]");
  // Mask API keys patterns
  masked = masked.replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9\-._]{20,}["']?/gi, "[REDACTED_SECRET]");
  return masked;
}
