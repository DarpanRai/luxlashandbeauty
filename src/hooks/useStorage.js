import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Same [value, persist, loaded] shape as before — every caller (App.jsx etc.) is
// unchanged. Only the backend underneath swapped from window.storage to a Supabase
// table (app_storage: one row per key, the whole array/value stored as JSON).
export function useStorage(key, fallback) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("app_storage").select("value").eq("key", key).maybeSingle();
        if (error) throw error;
        if (!cancelled && data) setValue(data.value);
      } catch (error) {
        console.error("storage load failed", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const persist = useCallback(
    async (next) => {
      setValue(next);
      try {
        const { error } = await supabase
          .from("app_storage")
          .upsert({ key, value: next, updated_at: new Date().toISOString() });
        if (error) throw error;
      } catch (error) {
        console.error("storage save failed", error);
      }
    },
    [key]
  );

  return [value, persist, loaded];
}
