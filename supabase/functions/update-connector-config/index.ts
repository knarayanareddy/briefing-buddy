import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { config, validateConfig } from "../_shared/config.ts"
import { authorizeRequest } from "../_shared/auth.ts"

validateConfig()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const auth = await authorizeRequest(req, config)
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const userId = auth.user_id!
  const supabaseClient = createClient(
    config.SUPABASE_URL!,
    config.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { type, config: connectorConfig } = await req.json()
    if (!type || !connectorConfig) throw new Error('Missing type or config')

    // Upsert to connector_configs
    const { data, error } = await supabaseClient
      .from('connector_configs')
      .upsert({
        user_id: userId,
        provider: type,
        config: connectorConfig,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' })
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
