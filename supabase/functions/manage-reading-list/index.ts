import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  const userId = auth.user_id!;

  try {
    const method = req.method;

    if (method === "GET") {
      // List items for user
      const { data, error } = await supabase
        .from("reading_list")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action, item } = body;

      if (action === "add") {
        if (!item?.source_id || !item?.title || !item?.url) throw new Error("Missing item fields");
        
        const { data, error } = await supabase
          .from("reading_list")
          .upsert({
            user_id: userId,
            source_id: item.source_id,
            title: item.title,
            url: item.url,
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id, source_id' })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "delete") {
        if (!item?.source_id) throw new Error("Missing source_id for delete");
        
        const { error } = await supabase
          .from("reading_list")
          .delete()
          .eq("user_id", userId)
          .eq("source_id", item.source_id);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      throw new Error(`Unsupported action: ${action}`);
    }

    throw new Error(`Unsupported method: ${method}`);

  } catch (e: any) {
    console.error("manage-reading-list error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
