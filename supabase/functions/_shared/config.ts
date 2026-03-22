export const config = {
  INTERNAL_API_KEY: Deno.env.get("INTERNAL_API_KEY"),
  OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY"),
  RUNWARE_API_KEY: Deno.env.get("RUNWARE_API_KEY"),
  FAL_KEY: Deno.env.get("FAL_KEY"),
  VEED_API_KEY: Deno.env.get("VEED_API_KEY"),
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  AVATAR_PROVIDER: Deno.env.get("AVATAR_PROVIDER") || "fal",
  ENABLE_RUNWARE: Deno.env.get("ENABLE_RUNWARE") !== "false",
  MAX_BROLL_SEGMENTS: parseInt(Deno.env.get("MAX_BROLL_SEGMENTS") || "5"),
  DEFAULT_AVATAR_IMAGE_URL: Deno.env.get("DEFAULT_AVATAR_IMAGE_URL") || "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800",
  CONNECTOR_SECRET_KEY: Deno.env.get("CONNECTOR_SECRET_KEY"),
  SHARE_LINK_SECRET: Deno.env.get("SHARE_LINK_SECRET"),
};

export type Config = typeof config;

export function validateConfig(throwOnError = false) {
  const required = [
    "INTERNAL_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  
  if (!config.CONNECTOR_SECRET_KEY) {
    console.warn("CONNECTOR_SECRET_KEY is missing. Saving secure PATs or tokens will fail.");
  }

  // Conditionally required
  if (config.AVATAR_PROVIDER === "fal") required.push("FAL_KEY");
  if (config.AVATAR_PROVIDER === "veed") required.push("VEED_API_KEY");

  const missing = required.filter((key) => !config[key as keyof typeof config]);
  if (missing.length > 0) {
    const msg = `AI Provider keys missing: ${missing.join(", ")}. Fallbacks will be used.`;
    if (throwOnError) {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }
}
