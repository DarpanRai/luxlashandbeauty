import { useEffect, useRef, useState } from "react";
import { WifiOff, ServerCrash } from "lucide-react";
import { DEFAULT_SERVICES } from "./constants/services.js";
import { generateId } from "./utils/id.js";
import { getTodayISO } from "./utils/date.js";
import { useStorage } from "./hooks/useStorage.js";
import { useOnlineStatus } from "./hooks/useOnlineStatus.js";
import { supabase } from "./lib/supabaseClient.js";
import Sidebar from "./components/layout/Sidebar.jsx";
import LoginScreen from "./components/layout/LoginScreen.jsx";
import ConfirmDialog from "./components/common/ConfirmDialog.jsx";
import FullScreenError from "./components/common/FullScreenError.jsx";
import OverviewDashboard from "./components/dashboard/OverviewDashboard.jsx";
import CategoryPage from "./components/customers/CategoryPage.jsx";
import StaffPage from "./components/staff/StaffPage.jsx";
import GeneralExpensesPage from "./components/expenses/GeneralExpensesPage.jsx";
import TeamAccountsPage from "./components/team/TeamAccountsPage.jsx";

const VIEW_PATHS = {
  overview: "dashboard",
  makeup: "makeup",
  luxlash: "luxlash",
  staff: "staff",
  expenses: "expenses",
  team: "team",
};
const PATH_VIEWS = Object.fromEntries(Object.entries(VIEW_PATHS).map(([viewKey, path]) => [path, viewKey]));

// "/" locally, "/luxlashandbeauty/" once built for GitHub Pages (see vite.config.ts) —
// every route read/write below goes through this so the app works unchanged in both.
const BASE_PATH = import.meta.env.BASE_URL;

const viewPath = (view) => `${BASE_PATH}${VIEW_PATHS[view] || "dashboard"}`.replace(/\/{2,}/g, "/");

const getViewFromLocation = () => {
  let path = window.location.pathname;
  if (path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length);
  path = path.replace(/^\/+|\/+$/g, "");
  return PATH_VIEWS[path] || "overview";
};

// sessionStorage (not localStorage): survives a refresh within the tab, but clears
// when the tab/browser closes — avoids leaving the admin panel signed in forever
// on a shared front-desk computer.
const AUTH_KEY = "ct_authenticated";
const ROLE_KEY = "ct_role";
const ACCOUNT_KEY = "ct_account";
const getStoredAuth = () => {
  try {
    return sessionStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return false;
  }
};
const getStoredRole = () => {
  try {
    return sessionStorage.getItem(ROLE_KEY) || "owner";
  } catch {
    return "owner";
  }
};
const getStoredAccount = () => {
  try {
    const raw = sessionStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// The local data cache (see useStorage.js) is sessionStorage too, for the same
// shared-computer reasoning as auth — wipe it alongside the auth keys on logout so
// customer data doesn't linger in the tab after signing out, only auto-clearing
// once the tab/browser is closed.
const clearDataCache = () => {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("cache:"))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // sessionStorage unavailable — nothing to clear
  }
};

// Views a "staff" role account can never land on, even via a bookmarked/typed URL.
const STAFF_BLOCKED_VIEWS = new Set(["overview", "staff", "team"]);
const STAFF_FALLBACK_VIEW = "makeup";

export default function App() {
  const [customers, setCustomers, customersLoaded, customersError] = useStorage("studio_customers", []);
  const [products, setProducts, productsLoaded, productsError] = useStorage("studio_products", []);
  const [sellItems, setSellItems, sellItemsLoaded, sellItemsError] = useStorage("studio_sell_items", []);
  const [services, , servicesLoaded, servicesError] = useStorage("studio_services", DEFAULT_SERVICES);
  const [staff, setStaff, staffLoaded, staffError] = useStorage("studio_staff", []);
  const [studioExpenses, setStudioExpenses, studioExpensesLoaded, studioExpensesError] = useStorage("studio_general_expenses", []);
  const [staffSalaries, setStaffSalaries, staffSalariesLoaded, staffSalariesError] = useStorage("studio_staff_salaries", []);
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const [view, setViewState] = useState(getViewFromLocation);
  const [authenticated, setAuthenticatedState] = useState(getStoredAuth);
  const [role, setRoleState] = useState(getStoredRole);
  const [account, setAccountState] = useState(getStoredAccount);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loginNotice, setLoginNotice] = useState("");

  // account is the { id, role, name, email, token_version } returned by the Supabase
  // login() RPC on login (null on logout).
  const setAuthenticated = (next, nextAccount) => {
    setAuthenticatedState(next);
    setRoleState(next && nextAccount?.role ? nextAccount.role : "owner");
    setAccountState(next ? nextAccount || null : null);
    if (next) setLoginNotice("");
    else clearDataCache();
    try {
      if (next) {
        sessionStorage.setItem(AUTH_KEY, "true");
        sessionStorage.setItem(ROLE_KEY, nextAccount?.role || "owner");
        sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount || null));
      } else {
        sessionStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(ROLE_KEY);
        sessionStorage.removeItem(ACCOUNT_KEY);
      }
    } catch {
      // sessionStorage unavailable (e.g. private browsing) — auth still works for this tab session
    }
  };

  // Called after the owner edits their own row on the Team page — keeps the in-memory
  // identity (and the re-auth email used for further admin_* calls) in sync so the page
  // doesn't have to ask them to unlock again mid-session.
  const updateOwnAccount = (patch) => {
    setAccountState((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
      } catch {
        // sessionStorage unavailable — identity still updates for this tab session
      }
      return next;
    });
    if (patch.role) setRoleState(patch.role);
  };

  const loaded = customersLoaded && productsLoaded && sellItemsLoaded && servicesLoaded && staffLoaded && studioExpensesLoaded && staffSalariesLoaded;
  // Any one of these failing means the app can't show trustworthy data — better to say
  // so plainly than let a section quietly render as "0 customers" when it's really
  // "couldn't load customers". navigator.onLine already ruled out "no internet" by the
  // time this is checked, so this specifically means Supabase itself is unreachable.
  const storageError = customersError || productsError || sellItemsError || servicesError || staffError || studioExpensesError || staffSalariesError;

  // If we were offline and just came back, do a full reload rather than trying to
  // patch up whichever fetches failed mid-outage — simpler and more reliable.
  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) window.location.reload();
  }, [online]);

  // "Once a password is changed, the old login should get thrown out" — there's no
  // real server session here (see supabase-auth-setup.sql), so this is how a tab
  // that's already logged in finds out it's been invalidated: validate_session()
  // just checks whether this account's token_version still matches what we logged
  // in with. Any edit to the account (password, role, email, or deletion) bumps
  // that version server-side, so a stale tab's check starts failing and it gets
  // signed out here — checked on a timer and whenever the tab regains focus, so it
  // doesn't take a full page reload to notice.
  useEffect(() => {
    if (!authenticated || !account?.id) return;
    let cancelled = false;
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.rpc("validate_session", {
          p_id: account.id,
          p_version: account.token_version,
        });
        if (cancelled || error) return; // transient network/db error — don't force a logout over it
        if (data === false) {
          setAuthenticated(false);
          setLoginNotice("Your account details changed elsewhere, so you've been signed out — please log in again.");
        }
      } catch {
        // ignore — same reasoning as above
      }
    };
    checkSession();
    const interval = setInterval(checkSession, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkSession();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, account?.id, account?.token_version]);

  const setView = (nextView) => {
    setViewState(nextView);
    const path = viewPath(nextView);
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
  };

  useEffect(() => {
    const path = viewPath(view);
    if (window.location.pathname !== path) window.history.replaceState({}, "", path);
    const handlePopState = () => setViewState(getViewFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A staff account can't reach the Studio Dashboard or Staff's section — not even via a
  // bookmarked/typed URL. Redirects the real view+URL; renderedView below also covers the
  // one-render gap before this effect runs, so nothing forbidden ever flashes on screen.
  useEffect(() => {
    if (role === "staff" && STAFF_BLOCKED_VIEWS.has(view)) setView(STAFF_FALLBACK_VIEW);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, view]);
  const renderedView = role === "staff" && STAFF_BLOCKED_VIEWS.has(view) ? STAFF_FALLBACK_VIEW : view;

  const handleAddCustomer = (data) =>
    setCustomers([...customers, { id: generateId(), category: view, ...data, bookingDate: getTodayISO() }]);
  const handleEditCustomer = (id, data) => setCustomers(customers.map((c) => (c.id === id ? { ...c, ...data } : c)));
  const handleDeleteCustomer = (id) => setCustomers(customers.filter((c) => c.id !== id));
  const handleSetStatus = (id, status) => setCustomers(customers.map((c) => (c.id === id ? { ...c, status } : c)));
  const handleMarkReminderSent = (id) => setCustomers(customers.map((c) => (c.id === id ? { ...c, reminderSent: true, reminderSentAt: getTodayISO() } : c)));
  const handleMarkFollowSent = (id) => setCustomers(customers.map((c) => (c.id === id ? { ...c, followSent: true, followSentAt: getTodayISO() } : c)));
  const handleMarkInfillSent = (id, weekBucket) =>
    setCustomers(
      customers.map((c) =>
        c.id === id
          ? weekBucket === "week3"
            ? { ...c, infillWeek3SentAt: getTodayISO() }
            : { ...c, infillWeek2SentAt: getTodayISO() }
          : c
      )
    );
  const handleMarkFullsetSent = (id) =>
    setCustomers(
      customers.map((c) =>
        c.id === id ? { ...c, fullsetSentDates: [...(c.fullsetSentDates || []), getTodayISO()] } : c
      )
    );
  const handleProductsChange = (nextForCategory) => {
    const otherCategoryProducts = products.filter((p) => p.category !== view);
    setProducts([...otherCategoryProducts, ...nextForCategory]);
  };
  const handleSellItemsChange = (nextForCategory) => {
    const otherCategoryItems = sellItems.filter((p) => p.category !== view);
    setSellItems([...otherCategoryItems, ...nextForCategory]);
  };
  if (!online) {
    return (
      <div className="app-root">
        <FullScreenError
          icon={WifiOff}
          title="No internet connection"
          message="This device isn't connected right now. Reconnect and this page will pick back up automatically."
        />
      </div>
    );
  }

  if (storageError) {
    return (
      <div className="app-root">
        <FullScreenError
          icon={ServerCrash}
          title="Can't reach the database"
          message="Your studio data couldn't be loaded. This is usually temporary — try again in a moment."
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="app-root">
        <LoginScreen notice={loginNotice} onLogin={(account) => setAuthenticated(true, account)} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        <Sidebar view={renderedView} role={role} onViewChange={setView} onLogout={() => setLogoutConfirmOpen(true)} />

        <main className="main-area">
            {!loaded ? (
              <div className="loading-state">Loading studio data…</div>
            ) : renderedView === "overview" ? (
              <OverviewDashboard customers={customers} services={services} products={products} sellItems={sellItems} studioExpenses={studioExpenses} staffSalaries={staffSalaries} />
            ) : renderedView === "staff" ? (
              <StaffPage staff={staff} setStaff={setStaff} />
            ) : renderedView === "expenses" ? (
              <GeneralExpensesPage role={role} items={studioExpenses} onItemsChange={setStudioExpenses} staff={staff} staffSalaries={staffSalaries} setStaffSalaries={setStaffSalaries} />
            ) : renderedView === "team" ? (
              <TeamAccountsPage account={account} onOwnAccountUpdated={updateOwnAccount} />
            ) : (
              <CategoryPage
                key={renderedView}
                role={role}
                category={renderedView}
                customers={customers.filter((c) => c.category === renderedView)}
                allCustomers={customers}
                staff={staff}
                products={products.filter((p) => p.category === renderedView)}
                sellItems={sellItems.filter((p) => p.category === renderedView)}
                services={services.filter((s) => s.category === renderedView)}
                onAddCustomer={handleAddCustomer}
                onEditCustomer={handleEditCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onSetStatus={handleSetStatus}
                onMarkReminderSent={handleMarkReminderSent}
                onMarkFollowSent={handleMarkFollowSent}
                onMarkInfillSent={handleMarkInfillSent}
                onMarkFullsetSent={handleMarkFullsetSent}
                onProductsChange={handleProductsChange}
                onSellItemsChange={handleSellItemsChange}
              />
            )}
        </main>
      </div>

      {logoutConfirmOpen && (
        <ConfirmDialog
          title="Log out?"
          message="You'll need to log back in to access the admin panel."
          confirmLabel="Log out"
          confirmColor="var(--primary)"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => { setLogoutConfirmOpen(false); setAuthenticated(false); setView("overview"); }}
        />
      )}
    </div>
  );
}
