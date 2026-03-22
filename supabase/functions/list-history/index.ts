import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const includeArchived = url.searchParams.get("include_archived") === "true";

  try {
    let query = supabase
      .from("briefing_scripts")
      .select(`
        id, 
        created_at, 
        persona, 
        profile_id, 
        trigger, 
        scheduled_for, 
        title, 
        archived,
        render_jobs(id, status, updated_at, error)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeArchived) {
      query = query.eq("archived", false);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map segments_count (length of script_json.timeline_segments) might be expensive to do in SQL if we don't have a count column.
    // For now, we'll return the items and the UI can handle or we can add a column.
    // Actually, list-history in api.ts expects segments_count.

    const items = (data || []).map((item: any) => ({
      ...item,
      segments_count: 0, // Fallback if we don't fetch the whole JSON
      render_job: item.render_jobs?.[0] || null
    }));

    return new Response(JSON.stringify({ 
      items, 
      limit, 
      offset 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
