import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";

export async function syncWeatherForUser(
  supabase: SupabaseClient,
  { userId, runId: existingRunId }: { userId: string; runId?: string }
) {
  const provider = "weather";
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // 1. Get location from connector config
    const { data: configRow } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();

    const locationName = configRow?.config?.location || "New York";

    // 2. Geocode the location
    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.searchParams.set("name", locationName);
    geoUrl.searchParams.set("count", "1");
    
    const geoRes = await fetch(geoUrl.toString());
    if (!geoRes.ok) throw new Error("Failed to geocode location");
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`Location not found: ${locationName}`);
    }
    
    const { latitude, longitude, name, admin1, country } = geoData.results[0];
    const resolvedLocation = `${name}${admin1 ? `, ${admin1}` : ""}, ${country}`;

    // 3. Fetch Forecast (3 days)
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", latitude.toString());
    weatherUrl.searchParams.set("longitude", longitude.toString());
    weatherUrl.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min");
    weatherUrl.searchParams.set("timezone", "auto");
    weatherUrl.searchParams.set("forecast_days", "3");

    const weatherRes = await fetch(weatherUrl.toString());
    if (!weatherRes.ok) throw new Error("Failed to fetch weather forecast");
    const weatherData = await weatherRes.json();

    const daily = weatherData.daily;
    if (!daily || !daily.time) throw new Error("Invalid forecast data received");

    const upserts = [];
    for (let i = 0; i < daily.time.length; i++) {
        const date = daily.time[i];
        upserts.push({
            user_id: userId,
            provider,
            item_type: "weather_forecast",
            source_id: `weather-${latitude}-${longitude}-${date}`,
            occurred_at: new Date(date).toISOString(),
            title: `Weather Forecast: ${resolvedLocation} (${date})`,
            author: "Open-Meteo",
            url: "https://open-meteo.com",
            payload: {
                location: resolvedLocation,
                date: date,
                max_temp: daily.temperature_2m_max[i],
                min_temp: daily.temperature_2m_min[i],
                weather_code: daily.weathercode[i]
            }
        });
    }

    let itemsSynced = 0;
    if (upserts.length > 0) {
      const { error: upsertErr } = await supabase.from("synced_items").upsert(upserts, { onConflict: "user_id, provider, item_type, external_id" }).catch(() => supabase.from("synced_items").upsert(upserts, { onConflict: "source_id" }));
      if (upsertErr) throw upsertErr;
      itemsSynced = upserts.length;
    }

    await recordSyncSuccess(supabase, {
      runId,
      userId,
      provider,
      itemsFound: upserts.length,
      itemsUpserted: itemsSynced,
      meta: { location: resolvedLocation }
    });

    return { ok: true, items_synced: itemsSynced };

  } catch (e: any) {
    console.error("syncWeatherForUser error:", e.message);
    
    await recordSyncFailure(supabase, {
      runId,
      userId,
      provider,
      errorCode: "weather_sync_error",
      errorMessage: e.message
    });

    throw e;
  }
}
