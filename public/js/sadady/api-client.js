const DEFAULT_API_BASE = "https://api.sadady.com";
const SESSION_EXCHANGE_PATH = "/api/v1/public/auth/salla/exchange";

const STORAGE_KEYS = {
  session: "sadady.theme.session",
  sallaIdentity: "sadady.theme.sallaIdentity",
  pendingJourney: "sadady.theme.pendingJourney",
  currentJourney: "sadady.theme.currentJourney",
};

const SESSION_SYNC_ATTEMPTS = 20;
const SESSION_SYNC_DELAY_MS = 500;

let exchangePromise = null;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeValue(key) {
  localStorage.removeItem(key);
}

function stringValue(value) {
  return String(value || "").trim();
}

function normalizeMobile(value) {
  return stringValue(value).replace(/\s+/g, "");
}

function generateId(prefix) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}_${Date.now().toString(36).toUpperCase()}${random}`;
}

function getApiBase() {
  return window.SADADY_API_BASE || window.sadadyThemeConfig?.api_base_url || DEFAULT_API_BASE;
}

function getSallaSdk() {
  return typeof window !== "undefined" ? window.salla || null : null;
}

function readSallaConfig(key) {
  const sdk = getSallaSdk();
  try {
    return typeof sdk?.config?.get === "function" ? sdk.config.get(key) : null;
  } catch {
    return null;
  }
}

function readSallaStorage(key) {
  const sdk = getSallaSdk();
  try {
    if (typeof sdk?.storage?.get === "function") return sdk.storage.get(key);
    if (typeof sdk?.store?.get === "function") return sdk.store.get(key);
  } catch {
    return null;
  }
  return null;
}

function extractTokenValue(rawToken) {
  if (!rawToken) return "";
  if (typeof rawToken === "string") return stringValue(rawToken);
  if (typeof rawToken !== "object") return "";
  return stringValue(
    rawToken.access_token ||
    rawToken.accessToken ||
    rawToken.token ||
    rawToken.value,
  );
}

function sanitizeSallaIdentity(value) {
  if (!value || typeof value !== "object") return null;

  const customerId = stringValue(value.customer_id || value.customerId || value.id);
  const rawCustomerName = stringValue(value.customer_name || value.customerName || value.name);
  const mobile = normalizeMobile(value.mobile || value.phone);
  const email = stringValue(value.email);
  const sallaSessionToken = stringValue(
    value.salla_session_token ||
    value.sallaSessionToken ||
    value.session_token ||
    value.sessionToken ||
    value.token,
  );
  const source = stringValue(value.source) || "salla-sdk";
  const createdAt = stringValue(value.created_at || value.createdAt) || new Date().toISOString();

  if (!customerId && !rawCustomerName && !mobile && !email && !sallaSessionToken) {
    return null;
  }

  const customerName = rawCustomerName || "عميل سدادي";
  return {
    customer_id: customerId,
    customer_name: customerName,
    name: customerName,
    mobile,
    email,
    salla_session_token: sallaSessionToken,
    created_at: createdAt,
    source,
  };
}

function sanitizeCustomerSession(value) {
  if (!value || typeof value !== "object") return null;

  const customerId = stringValue(value.customer_id || value.customerId || value.id);
  const rawCustomerName = stringValue(value.customer_name || value.customerName || value.name);
  const mobile = normalizeMobile(value.mobile || value.phone || value.user?.phone);
  const email = stringValue(value.email || value.user?.email);
  const sessionToken = stringValue(
    value.session_token ||
    value.sessionToken ||
    value.accessToken ||
    value.token,
  );
  const refreshToken = stringValue(value.refresh_token || value.refreshToken);
  const source = stringValue(value.source || value.user?.provider || value.user?.authMode) || "sadady";
  const createdAt = stringValue(value.created_at || value.createdAt) || new Date().toISOString();

  if (!sessionToken) return null;

  return {
    customer_id: customerId || stringValue(value.user?.customerId || value.user?.sessionId),
    customer_name: rawCustomerName || stringValue(value.user?.fullName) || "عميل سدادي",
    name: rawCustomerName || stringValue(value.user?.fullName) || "عميل سدادي",
    mobile,
    email,
    session_token: sessionToken,
    refresh_token: refreshToken,
    created_at: createdAt,
    source,
  };
}

function getSallaSdkIdentityCandidate() {
  const user = readSallaConfig("user");
  const rawToken = readSallaStorage("token") || readSallaConfig("token");
  const sallaSessionToken = extractTokenValue(rawToken);

  if (!user && !sallaSessionToken) return null;

  return sanitizeSallaIdentity({
    customer_id: user?.id,
    customer_name: user?.name || `${stringValue(user?.first_name)} ${stringValue(user?.last_name)}`.trim(),
    mobile: user?.mobile || user?.phone,
    email: user?.email,
    salla_session_token: sallaSessionToken,
    source: "salla-sdk",
  });
}

function readStoredCustomerSession() {
  const stored = sanitizeCustomerSession(readJson(STORAGE_KEYS.session, null));
  return stored?.session_token ? stored : null;
}

function readStoredSallaIdentity() {
  const identity = sanitizeSallaIdentity(readJson(STORAGE_KEYS.sallaIdentity, null));
  if (identity) return identity;

  const legacySession = readJson(STORAGE_KEYS.session, null);
  const migratedIdentity = sanitizeSallaIdentity(legacySession);
  if (migratedIdentity?.salla_session_token) {
    writeJson(STORAGE_KEYS.sallaIdentity, migratedIdentity);
    const legacyCustomerSession = sanitizeCustomerSession(legacySession);
    if (!legacyCustomerSession?.refresh_token) {
      removeValue(STORAGE_KEYS.session);
    }
    return migratedIdentity;
  }
  return null;
}

function dispatchSessionEvent(name, session) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail: session || null }));
}

function buildHeaders(extraHeaders = {}, options = {}) {
  const hasJsonBody = options.hasBody && !options.isFormData;
  return {
    Accept: "application/json",
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(extraHeaders || {}),
  };
}

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || "API request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload?.data || payload;
}

async function callPublicApi(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: buildHeaders(options.headers, {
      hasBody: Boolean(options.body),
      isFormData: options.body instanceof FormData,
    }),
  });

  return parseApiResponse(response);
}

function mergeSessionState() {
  const customerSession = readStoredCustomerSession();
  const sallaIdentity = getSallaIdentity();

  if (customerSession) {
    return {
      ...sallaIdentity,
      ...customerSession,
      customer_id: customerSession.customer_id || sallaIdentity?.customer_id || "",
      customer_name: customerSession.customer_name || sallaIdentity?.customer_name || "عميل سدادي",
      name: customerSession.customer_name || sallaIdentity?.customer_name || "عميل سدادي",
      mobile: customerSession.mobile || sallaIdentity?.mobile || "",
      email: customerSession.email || sallaIdentity?.email || "",
    };
  }

  return sallaIdentity;
}

function setSallaIdentity(value) {
  const identity = sanitizeSallaIdentity(value);
  if (!identity) {
    removeValue(STORAGE_KEYS.sallaIdentity);
    return null;
  }
  writeJson(STORAGE_KEYS.sallaIdentity, identity);
  return identity;
}

function getSallaIdentity() {
  const sdkIdentity = getSallaSdkIdentityCandidate();
  if (sdkIdentity?.salla_session_token) {
    const storedIdentity = readStoredSallaIdentity();
    if (
      storedIdentity?.salla_session_token !== sdkIdentity.salla_session_token ||
      storedIdentity?.customer_id !== sdkIdentity.customer_id
    ) {
      writeJson(STORAGE_KEYS.sallaIdentity, sdkIdentity);
    }
    return sdkIdentity;
  }

  return readStoredSallaIdentity();
}

async function exchangeCustomerSession() {
  const identity = getSallaIdentity();
  if (!identity?.customer_id || !identity?.mobile || !identity?.salla_session_token) {
    throw new Error("تعذر التحقق من هوية العميل من جلسة سلة الحالية.");
  }

  if (exchangePromise) {
    return exchangePromise;
  }

  exchangePromise = (async () => {
    const exchanged = await callPublicApi(SESSION_EXCHANGE_PATH, {
      method: "POST",
      body: JSON.stringify({
        customer_id: identity.customer_id,
        customer_name: identity.customer_name,
        mobile: identity.mobile,
        email: identity.email,
        salla_session_token: identity.salla_session_token,
        device_id: "theme-web",
      }),
      headers: {
        "X-Idempotency-Key": generateId("salla-exchange"),
      },
    });

    const session = sanitizeCustomerSession(exchanged?.session || exchanged);
    if (!session?.session_token) {
      throw new Error("تعذر إنشاء جلسة سدادي الداخلية من جلسة سلة.");
    }

    setSession(session);
    return session;
  })();

  try {
    return await exchangePromise;
  } finally {
    exchangePromise = null;
  }
}

async function requireCustomerSession() {
  const session = readStoredCustomerSession();
  if (session?.session_token) {
    return session;
  }
  const identity = getSallaIdentity();
  if (!identity?.salla_session_token) {
    throw new Error("يجب تسجيل الدخول من حساب سلة أولًا.");
  }
  return exchangeCustomerSession();
}

async function callCustomerApi(path, options = {}) {
  let session = await requireCustomerSession();

  const makeRequest = async (currentSession) => {
    const response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        ...buildHeaders(options.headers, {
          hasBody: Boolean(options.body),
          isFormData: options.body instanceof FormData,
        }),
        Authorization: `Bearer ${currentSession.session_token}`,
      },
    });
    return response;
  };

  let response = await makeRequest(session);
  if (response.status === 401 && getSallaIdentity()?.salla_session_token) {
    clearSession();
    session = await exchangeCustomerSession();
    response = await makeRequest(session);
  }

  return parseApiResponse(response);
}

export function isMockMode() {
  return false;
}

export function getDemoOtpCode() {
  return "";
}

export function getSallaCustomerIdentity() {
  return getSallaIdentity();
}

export function getSession() {
  return mergeSessionState();
}

export function hasSallaSession() {
  const identity = getSallaIdentity();
  return Boolean(identity?.customer_id || identity?.mobile || identity?.salla_session_token);
}

export function getSessionSummary() {
  const session = getSession();
  if (!session) {
    return {
      isSalla: false,
      name: "",
      mobile: "",
      email: "",
      customerId: "",
      label: "لم يتم الربط مع سلة بعد",
      subtitle: "سجّل دخولك من سلة حتى تظهر الطلبات والملخصات المرتبطة بحسابك.",
    };
  }

  const name = session.customer_name || session.name || "عميل سدادي";
  const mobile = session.mobile || "";
  const email = session.email || "";
  const customerId = session.customer_id || "";
  const internalSessionReady = Boolean(readStoredCustomerSession()?.session_token);

  return {
    isSalla: hasSallaSession(),
    name,
    mobile,
    email,
    customerId,
    label: `مرتبطة بحساب سلة · ${name}`,
    subtitle: internalSessionReady
      ? `تم ربط حسابك الداخلي تلقائيًا وسيتم استخدام الرقم ${mobile || "-"} للطلبات والإشعارات.`
      : mobile
        ? `تم التعرف على جلسة سلة وسيتم إنشاء جلسة سدادي داخلية عند أول طلب باستخدام الرقم ${mobile}.`
        : "سيتم ربط طلباتك وملخصاتك داخل سلة بحسابك الحالي تلقائيًا.",
  };
}

export function getCustomerApiHeaders(extraHeaders = {}) {
  const session = readStoredCustomerSession();
  return {
    ...buildHeaders(extraHeaders),
    ...(session?.session_token ? { Authorization: `Bearer ${session.session_token}` } : {}),
  };
}

export function setSession(value) {
  const session = sanitizeCustomerSession(value);
  if (!session) {
    clearSession();
    return null;
  }

  writeJson(STORAGE_KEYS.session, session);
  dispatchSessionEvent("sadady:auth-success", mergeSessionState());
  dispatchSessionEvent("sadady:auth-change", mergeSessionState());
  return session;
}

export function clearSession() {
  removeValue(STORAGE_KEYS.session);
  dispatchSessionEvent("sadady:auth-change", mergeSessionState());
}

function syncIdentityFromSallaSdk() {
  const sdkIdentity = getSallaSdkIdentityCandidate();
  if (!sdkIdentity?.salla_session_token) return false;

  const currentIdentity = readStoredSallaIdentity();
  const changed =
    currentIdentity?.salla_session_token !== sdkIdentity.salla_session_token ||
    currentIdentity?.customer_id !== sdkIdentity.customer_id;

  writeJson(STORAGE_KEYS.sallaIdentity, sdkIdentity);
  if (changed) {
    removeValue(STORAGE_KEYS.session);
    dispatchSessionEvent("sadady:auth-success", mergeSessionState());
    dispatchSessionEvent("sadady:auth-change", mergeSessionState());
  }
  return true;
}

function scheduleSallaSessionSync(attempt = 0) {
  if (syncIdentityFromSallaSdk()) return;
  if (attempt >= SESSION_SYNC_ATTEMPTS) return;
  window.setTimeout(() => scheduleSallaSessionSync(attempt + 1), SESSION_SYNC_DELAY_MS);
}

function registerSallaAuthListeners() {
  const sdk = getSallaSdk();
  if (!sdk?.event?.auth) return false;

  try {
    if (typeof sdk.event.auth.onVerified === "function") {
      sdk.event.auth.onVerified(() => {
        window.setTimeout(syncIdentityFromSallaSdk, 0);
      });
    }
    if (typeof sdk.event.auth.onRefreshed === "function") {
      sdk.event.auth.onRefreshed(() => {
        window.setTimeout(syncIdentityFromSallaSdk, 0);
      });
    }
    return true;
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  registerSallaAuthListeners();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      registerSallaAuthListeners();
      scheduleSallaSessionSync();
    }, { once: true });
  } else {
    scheduleSallaSessionSync();
  }
  window.addEventListener("load", () => {
    registerSallaAuthListeners();
    scheduleSallaSessionSync();
  });
}

export function getPendingJourney() {
  return readJson(STORAGE_KEYS.pendingJourney, null);
}

export function setPendingJourney(value) {
  writeJson(STORAGE_KEYS.pendingJourney, value);
}

export function clearPendingJourney() {
  removeValue(STORAGE_KEYS.pendingJourney);
}

export function getCurrentJourney() {
  return readJson(STORAGE_KEYS.currentJourney, null);
}

export function setCurrentJourney(value) {
  writeJson(STORAGE_KEYS.currentJourney, value);
}

export function clearCurrentJourney() {
  removeValue(STORAGE_KEYS.currentJourney);
}

export async function requestOtp() {
  throw new Error("التحقق يتم عبر سلة. يرجى تسجيل الدخول من حساب سلة أولًا.");
}

export async function verifyOtp() {
  throw new Error("التحقق يتم عبر سلة. لا يمكن استخدام OTP يدوي هنا.");
}

export async function calculateQuote(input) {
  return callPublicApi("/api/v1/public/quotes/calculate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function precreateOrder(input) {
  return callPublicApi("/api/v1/public/orders/precreate", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "X-Idempotency-Key": generateId("idem") },
  });
}

export async function checkoutOrder(publicOrderId, input = {}) {
  return callPublicApi(`/api/v1/public/orders/${publicOrderId}/checkout`, {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "X-Idempotency-Key": generateId("idem") },
  });
}

export async function getTracking(trackingNo) {
  return callPublicApi(`/api/v1/public/orders/${encodeURIComponent(trackingNo)}`, {
    method: "GET",
  });
}

export async function getCustomerProfile() {
  const session = await requireCustomerSession();
  if (!session.mobile) {
    throw new Error("تعذر تحديد رقم الجوال المرتبط بالحساب.");
  }

  return callCustomerApi(`/api/customer/${encodeURIComponent(session.mobile)}/profile`, {
    method: "GET",
  });
}

export async function getCustomerOrders() {
  const session = await requireCustomerSession();
  if (!session.mobile) {
    throw new Error("تعذر تحديد رقم الجوال المرتبط بالحساب.");
  }

  return callCustomerApi(`/api/customer/${encodeURIComponent(session.mobile)}/orders`, {
    method: "GET",
  });
}

export async function getCustomerOrderDetails(orderId) {
  return callCustomerApi(`/api/customer/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}

export async function getCustomerOrderDocuments(orderId) {
  return callCustomerApi(`/api/customer/orders/${encodeURIComponent(orderId)}/documents`, {
    method: "GET",
  });
}

export async function getCustomerNotifications() {
  const session = await requireCustomerSession();
  if (!session.mobile) {
    throw new Error("تعذر تحديد رقم الجوال المرتبط بالحساب.");
  }

  return callCustomerApi(`/api/customer/${encodeURIComponent(session.mobile)}/notifications`, {
    method: "GET",
  });
}

export async function exchangeCustomerSessionFromSalla() {
  return exchangeCustomerSession();
}
