import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useToast } from "../context/ToastContext.jsx";

// sessionStorage, not localStorage — matches the auth session's own threat model
// (see App.jsx's AUTH_KEY comment): this app explicitly avoids leaving customer
// data sitting around after the tab/browser closes on a shared front-desk computer,
// and a localStorage cache would quietly reintroduce that. It still delivers the
// real win (instant render on refresh / switching views, no network round-trip)
// since sessionStorage survives within the same tab across those.
const CACHE_PREFIX = "cache:";
const readCache = (key) => {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    return raw ? { hit: true, value: JSON.parse(raw) } : { hit: false };
  } catch {
    return { hit: false };
  }
};
const writeCache = (key, value) => {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // sessionStorage unavailable/full — cache is a pure speed optimization, safe to skip
  }
};

// Same [value, persist, loaded] shape as before — every caller (App.jsx etc.) is
// unchanged. Only the backend underneath swapped from window.storage to a Supabase
// table (app_storage: one row per key, the whole array/value stored as JSON).
//
// A 4th return value, `error`, was added on top of that: a load failure used to be
// silently swallowed (console.error only) and the caller would just see the fallback
// value forever, indistinguishable from "genuinely empty". App.jsx now checks this
// across every key and shows a full-screen "can't reach the database" state instead
// of letting the app quietly pretend there's no data.
//
// Stale-while-revalidate: if a cached value exists from earlier this session, render
// it immediately (loaded=true right away, no spinner) while a background fetch still
// runs to catch up with anything changed since — on another device, or by someone
// else. The fetch's result always wins once it lands, cache or not.
export function useStorage(key, fallback) {
  const cached = readCache(key);
  const [value, setValue] = useState(cached.hit ? cached.value : fallback);
  const [loaded, setLoaded] = useState(cached.hit);
  const [error, setError] = useState(null);
  const notify = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: loadError } = await supabase.from("app_storage").select("value").eq("key", key).maybeSingle();
        if (loadError) throw loadError;
        if (!cancelled) {
          if (data) {
            setValue(data.value);
            writeCache(key, data.value);
          }
          setError(null);
        }
      } catch (err) {
        console.error("storage load failed", err);
        // A stale cached value beats a hard error screen — only surface `error`
        // (which App.jsx turns into a full-screen block) when there was nothing
        // to fall back on.
        if (!cancelled && !cached.hit) setError(err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persist = useCallback(
    async (next) => {
      setValue(next);
      writeCache(key, next);
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
