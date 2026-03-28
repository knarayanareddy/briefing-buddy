import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TTS_TIMEOUT_MS = 15_000;
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { text, voice_id, scene_id } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voiceId = voice_id || DEFAULT_VOICE_ID;
    const trimmedText = text.slice(0, 5000);
    const textHash = await hashText(trimmedText);
    const format = "mp3";

    // Check cache first
    const { data: cached } = await supabase
      .from("tts_audio_cache")
      .select("storage_path, duration_seconds")
      .eq("user_id", userId)
      .eq("voice_id", voiceId)
      .eq("text_hash", textHash)
      .eq("format", format)
      .maybeSingle();

    if (cached?.storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from("tts-audio")
        .createSignedUrl(cached.storage_path, 3600);

      if (signedUrl?.signedUrl) {
        return new Response(JSON.stringify({
          audio_url: signedUrl.signedUrl,
          cached: true,
          duration_seconds: cached.duration_seconds,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If signed URL fails (bucket missing), fall through to generate
    }

    // Generate TTS via ElevenLabs with timeout
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    let ttsResponse: Response;
    try {
      ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: trimmedText,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.8,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
          signal: controller.signal,
        }
      );
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        return new Response(JSON.stringify({ error: "TTS timed out" }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!ttsResponse.ok) {
      console.error("ElevenLabs error:", ttsResponse.status);
      return new Response(JSON.stringify({ error: `TTS failed (${ttsResponse.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const durationSeconds = Math.round((audioBuffer.byteLength * 8) / 128000);

    // Try to upload to storage for caching
    const storagePath = `${userId}/${textHash}.${format}`;
    const { error: uploadErr } = await supabase.storage
      .from("tts-audio")
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (!uploadErr) {
      await supabase.from("tts_audio_cache").upsert({
        user_id: userId,
        voice_id: voiceId,
        text_hash: textHash,
        format,
        storage_path: storagePath,
        duration_seconds: durationSeconds,
      }, { onConflict: "user_id,voice_id,text_hash,format" }).catch(() => {});

      const { data: signedUrl } = await supabase.storage
        .from("tts-audio")
        .createSignedUrl(storagePath, 3600);

      if (signedUrl?.signedUrl) {
        return new Response(JSON.stringify({
          audio_url: signedUrl.signedUrl,
          cached: false,
          duration_seconds: durationSeconds,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("Storage upload failed (bucket may not exist), returning inline audio");
    }

    // Fallback: return base64 audio inline (works even without storage bucket)
    const audioBase64 = base64Encode(new Uint8Array(audioBuffer));
    return new Response(JSON.stringify({
      audio_content: audioBase64,
      cached: false,
      duration_seconds: durationSeconds,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("tts-scene error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
