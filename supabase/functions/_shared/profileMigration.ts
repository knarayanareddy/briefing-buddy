import { MODULE_CATALOG_VERSION, getModule, validateModuleIds, validateModuleSettings, ModuleId } from "./moduleManifest.ts";

export interface RawProfile {
  id?: string;
  name: string;
  persona?: string;
  timezone?: string;
  frequency?: string;
  enabled_modules: any;
  module_settings: any;
  module_catalog_version?: number;
}

/**
 * Migrates a profile to the current MODULE_CATALOG_VERSION.
 * 1. If version is ahead, it might throw or handle gracefully (here we return it but warn).
 * 2. If version is behind, it applies defaults and removes unknown modules.
 */
export function migrateProfileIfNeeded(profile: RawProfile): RawProfile {
  const currentVersion = profile.module_catalog_version || 0;

  if (currentVersion === MODULE_CATALOG_VERSION) {
    return profile;
  }

  if (currentVersion > MODULE_CATALOG_VERSION) {
    // In a real prod app, you might throw 422 "App update required"
    console.warn(`Profile version ${currentVersion} is ahead of manifest ${MODULE_CATALOG_VERSION}`);
    return profile;
  }

  console.log(`Migrating profile from v${currentVersion} to v${MODULE_CATALOG_VERSION}`);

  // 1. Validate and filter module IDs
  const validModules = validateModuleIds(profile.enabled_modules);
  
  // 2. Re-validate each module setting, applying defaults if missing/broken
  const migratedSettings: Record<string, any> = {};
  
  for (const modId of validModules) {
    const rawSettings = (profile.module_settings || {})[modId];
    const validation = validateModuleSettings(modId as ModuleId, rawSettings);
    
    if (validation.ok) {
      migratedSettings[modId] = validation.value;
    } else {
      // If validation fails, use manifest defaults for that module
      const mod = getModule(modId);
      migratedSettings[modId] = mod?.defaults.settings || {};
      console.warn(`Module ${modId} settings invalid, using defaults: ${validation.error}`);
    }
  }

  return {
    ...profile,
    enabled_modules: validModules,
    module_settings: migratedSettings,
    module_catalog_version: MODULE_CATALOG_VERSION,
  };
}
