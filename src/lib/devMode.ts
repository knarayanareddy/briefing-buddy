import { useState, useEffect } from "react";

const DEV_MODE_KEY = "morning_briefing_dev_mode";

export const isDevModeEnabled = (): boolean => {
  return localStorage.getItem(DEV_MODE_KEY) === "true";
};

export const setDevModeEnabled = (enabled: boolean) => {
  localStorage.setItem(DEV_MODE_KEY, String(enabled));
  // Dispatch custom event for immediate same-tab sync
  window.dispatchEvent(new Event("storage_dev_mode"));
  // Also dispatch standard storage event for cross-tab (though not strictly needed same-tab)
  window.dispatchEvent(new StorageEvent("storage", {
    key: DEV_MODE_KEY,
    newValue: String(enabled)
  }));
};

export const useDevMode = () => {
  const [enabled, setEnabled] = useState(isDevModeEnabled());

  useEffect(() => {
    const handleSync = () => {
      setEnabled(isDevModeEnabled());
    };

    window.addEventListener("storage_dev_mode", handleSync);
    window.addEventListener("storage", handleSync);
    
    return () => {
      window.removeEventListener("storage_dev_mode", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  return { 
    isDevMode: enabled, 
    toggleDevMode: () => setDevModeEnabled(!enabled) 
  };
};
