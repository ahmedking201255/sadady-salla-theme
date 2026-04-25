import { getSession, getSessionSummary, setSession } from "./api-client.js";

const goToCustomerBtn = document.getElementById("goToCustomerBtn");
const loginHint = document.getElementById("loginHint");

const isLocalPreview = window.location.pathname.startsWith("/theme-preview");
const previewPrefix = isLocalPreview ? "/theme-preview" : "";

function getSallaPreviewPrefix() {
  const match = window.location.pathname.match(/^\/dev-[^/]+/);
  return match ? match[0] : previewPrefix;
}

function buildThemePath(path) {
  const prefix = getSallaPreviewPrefix();
  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
}

function syncCustomerButton() {
  const session = getSession();
  const summary = getSessionSummary();

  if (goToCustomerBtn) {
    goToCustomerBtn.textContent = session ? "طلباتي" : "الدخول إلى سلة";
    goToCustomerBtn.dataset.sessionState = session ? "connected" : "disconnected";
  }

  if (loginHint) {
    loginHint.textContent = session
      ? summary.subtitle
      : "الدخول يتم عبر حساب سلة، وبعدها تظهر طلباتك ومستنداتك تلقائيًا.";
  }
}

goToCustomerBtn?.addEventListener("click", () => {
  let session = getSession();
  if (!session && isLocalPreview) {
    setSession({
      customer_id: "preview-salla-customer",
      customer_name: "عميل معاينة سلة",
      name: "عميل معاينة سلة",
      mobile: "0500000000",
      email: "preview@sadady.local",
      session_token: "preview-session-token",
      auth_mode: "local_preview",
      provider: "salla-preview",
    });
    session = getSession();
  }
  window.location.href = session ? buildThemePath("/customer/orders/") : buildThemePath("/customer/login");
});

window.addEventListener("sadady:auth-success", syncCustomerButton);
window.addEventListener("sadady:auth-change", syncCustomerButton);
document.addEventListener("DOMContentLoaded", syncCustomerButton);
syncCustomerButton();
window.__sadadyAuthReady = true;
