import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { logAudit } from "../_shared/usage.ts";
import { syncGmailForUser } from "../_shared/syncers/gmail.ts";
import { shouldSkipSyncNow, recordSyncAttemptStart, recordSyncSkip } from "../_shared/connectorHealth.ts";

validateConfig();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await authorizeRequest(req, config);
    if (!auth.ok) {
      return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = auth.user_id!;
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    const provider = "google";

    const { skip, reason } = await shouldSkipSyncNow(supabase, { userId, provider });
    const runId = await recordSyncAttemptStart(supabase, { userId, provider });

    if (skip) {
      await recordSyncSkip(supabase, { runId, reason: reason || "Unknown skip reason" });
      return new Response(JSON.stringify({ ok: true, skipped: true, reason }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { items_synced, message } = await syncGmailForUser(supabase, { userId, runId });

    await logAudit(supabase, userId, "sync_gmail", { message: "Sync attempt on stub" });
    
    return new Response(JSON.stringify({ ok: true, items_synced, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    })
  }
})
