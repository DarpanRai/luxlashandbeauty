import { useEffect, useState } from "react";

// navigator.onLine only reflects the device's network adapter, not whether Supabase
// is actually reachable — that distinction is what lets App.jsx show "no internet"
// vs "database error" as two different full-screen states instead of one vague one.
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
