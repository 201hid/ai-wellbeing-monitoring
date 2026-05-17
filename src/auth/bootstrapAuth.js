import { PublicClientApplication } from "@azure/msal-browser";

const SCOPES = ["openid", "profile", "email"];
const GUEST_SESSION_KEY = "ai-pomodoro-guest";

function buildMsalConfig() {
  const clientId = import.meta.env.VITE_MSAL_CLIENT_ID;
  const authority = import.meta.env.VITE_MSAL_AUTHORITY;
  if (!clientId || !authority) return null;

  /** @type {import("@azure/msal-browser").Configuration} */
  const config = {
    auth: {
      clientId,
      authority,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false
    }
  };

  try {
    const host = new URL(authority).hostname;
    if (
      host.endsWith(".b2clogin.com") ||
      host.endsWith(".ciamlogin.com")
    ) {
      config.auth.knownAuthorities = [host];
    }
  } catch {
    /* ignore invalid authority at runtime */
  }

  return config;
}

function isGuestSession() {
  return sessionStorage.getItem(GUEST_SESSION_KEY) === "1";
}

function setGuestSession(active) {
  if (active) sessionStorage.setItem(GUEST_SESSION_KEY, "1");
  else sessionStorage.removeItem(GUEST_SESSION_KEY);
}

function displayName(account) {
  if (!account) return "User";
  const claims = account.idTokenClaims;
  const email =
    claims?.preferred_username ||
    claims?.email ||
    claims?.emails?.[0];
  return account.name || email || account.username || "User";
}

/**
 * Login overlay: Microsoft sign-in or guest (no account). Then runs onSignedIn once.
 */
export async function bootstrapAuth(onSignedIn) {
  const overlay = document.getElementById("login-overlay");
  const main = document.getElementById("main-app");
  const greeting = document.getElementById("user-greeting");
  const signOutBtn = document.getElementById("sign-out-btn");

  const signupAuthority = import.meta.env.VITE_MSAL_AUTHORITY_SIGNUP || "";

  const cfg = buildMsalConfig();
  if (!cfg || !overlay || !main) {
    overlay?.classList.add("hidden");
    overlay?.setAttribute("aria-hidden", "true");
    main?.classList.remove("hidden-until-auth");
    main?.removeAttribute("aria-hidden");
    if (greeting)
      greeting.textContent =
        cfg ? "" : "Configure VITE_MSAL_CLIENT_ID and VITE_MSAL_AUTHORITY for secure login.";
    onSignedIn();
    return;
  }

  const pca = new PublicClientApplication(cfg);
  await pca.initialize();

  let appStarted = false;

  function revealApp({ account = null, guest = false } = {}) {
    if (guest) setGuestSession(true);
    else setGuestSession(false);

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    main.classList.remove("hidden-until-auth");
    main.removeAttribute("aria-hidden");

    if (greeting) {
      greeting.textContent = guest
        ? "Browsing as guest"
        : `Hi, ${displayName(account)}`;
    }
    if (signOutBtn) {
      signOutBtn.textContent = guest ? "Leave" : "Sign out";
      signOutBtn.classList.remove("hidden");
    }

    if (!appStarted) {
      appStarted = true;
      onSignedIn();
    }
  }

  function showLogin() {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    main.classList.add("hidden-until-auth");
    main.setAttribute("aria-hidden", "true");
  }

  signOutBtn?.addEventListener("click", () => {
    if (isGuestSession()) {
      setGuestSession(false);
      if (signOutBtn) signOutBtn.textContent = "Sign out";
      showLogin();
      return;
    }
    const active = pca.getActiveAccount();
    pca.logoutRedirect({
      account: active || undefined,
      postLogoutRedirectUri: window.location.origin
    });
  });

  if (isGuestSession()) {
    revealApp({ guest: true });
    return;
  }

  const redirectResult = await pca.handleRedirectPromise().catch(() => null);
  let account =
    redirectResult?.account ||
    pca.getActiveAccount() ||
    pca.getAllAccounts()[0];
  if (account) pca.setActiveAccount(account);

  if (account) {
    revealApp({ account });
    return;
  }

  showLogin();

  document.getElementById("btn-guest")?.addEventListener("click", () => {
    revealApp({ guest: true });
  });

  document.getElementById("btn-sign-in")?.addEventListener("click", () => {
    pca.loginRedirect({
      scopes: SCOPES,
      authority: cfg.auth.authority,
      prompt: "login"
    });
  });

  document.getElementById("btn-sign-up")?.addEventListener("click", () => {
    const authority = signupAuthority || cfg.auth.authority;
    const req = {
      scopes: SCOPES,
      authority,
      extraQueryParameters: {}
    };
    if (!signupAuthority) {
      req.extraQueryParameters.prompt = "create";
    }
    pca.loginRedirect(req);
  });
}
