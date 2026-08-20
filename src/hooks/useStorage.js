import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useToast } from "../context/ToastContext.jsx";

// Same [value, persist, loaded] shape as before — every caller (App.jsx etc.) is
// unchanged. Only the backend underneath swapped from window.storage to a Supabase
// table (app_storage: one row per key, the whole array/value stored as JSON).
//
// A 4th return value, `error`, was added on top of that: a load failure used to be
// silently swallowed (console.error only) and the caller would just see the fallback
// value forever, indistinguishable from "genuinely empty". App.jsx now checks this
// across every key and shows a full-screen "can't reach the database" state instead
// of letting the app quietly pretend there's no data.
export function useStorage(key, fallback) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const notify = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: loadError } = await supabase.from("app_storage").select("value").eq("key", key).maybeSingle();
        if (loadError) throw loadError;
        if (!cancelled) {
          if (data) setValue(data.value);
          setError(null);
        }
      } catch (err) {
        console.error("storage load failed", err);
        if (!cancelled) setError(err);
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
        const { error: saveError } = await supabase
          .from("app_storage")
          .upsert({ key, value: next, updated_at: new Date().toISOString() });
        if (saveError) throw saveError;
      } catch (err) {
        console.error("storage save failed", err);
        notify("Couldn't save your change — check your connection and try again", "danger");
      }
    },
    [key, notify]
  );

  return [value, persist, loaded, error];
}
