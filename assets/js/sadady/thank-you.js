import { getCurrentJourney, getSessionSummary, getTracking } from "./api-client.js";

const successOrderNumber = document.getElementById("successOrderNumber");
const successTrackingNumber = document.getElementById("successTrackingNumber");
const successStatus = document.getElementById("successStatus");
const successSallaOrderNumber = document.getElementById("successSallaOrderNumber");
const successProviderName = document.getElementById("successProviderName");
const successCollectionStatus = document.getElementById("successCollectionStatus");
const successSallaSyncStatus = document.getElementById("successSallaSyncStatus");
const successTrackingLink = document.getElementById("successTrackingLink");
const successResolutionNote = document.getElementById("successResolutionNote");
const successPanel = document.getElementById("sadadySuccessPanel");

const STATUS_LABELS = {
  pending: "بانتظار التحصيل",
  pending_payment_capture: "بانتظار الدفع في سلة",
  paid: "تم الدفع",
  collected: "تم التحصيل",
  captured: "تم التحصيل",
  failed: "فشل التحصيل",
  canceled: "ملغي",
  cancelled: "ملغي",
  expired: "منتهي",
  draft: "مسودة",
  synced: "تمت المزامنة",
  sync_pending: "بانتظار المزامنة",
  skipped: "لم تتم المزامنة",
  ignored: "تم التجاهل",
  not_required: "غير مطلوبة",
};

function buildThemeUrl(pathname, params = {}) {
  const url = new URL(pathname, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  return `${url.pathname}${url.search}${url.hash || ""}`;
}

function translateStatus(value, fallback = "-") {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return fallback;
  const key = text.toLowerCase().replace(/\s+/g, "_").replaceAll("-", "_");
  return STATUS_LABELS[key] || text;
}

function translateSyncStatus(value, fallback = "-") {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return fallback;
  const key = text.toLowerCase().replace(/\s+/g, "_").replaceAll("-", "_");
  return {
    pending: "بانتظار المزامنة",
    synced: "تمت المزامنة",
    failed: "فشلت المزامنة",
    skipped: "لم تتم المزامنة",
    ignored: "تم التجاهل",
    not_required: "غير مطلوبة",
    draft: "مسودة",
  }[key] || STATUS_LABELS[key] || text;
}

function getSallaOrderNumber(order) {
  const value = String(getOrderValue(order, ["salla.order_number", "salla.orderNumber", "salla_order_number", "sallaOrderNumber", "salla_order_id"], "")).trim();
  if (!value || /^draft-/i.test(value)) return "-";
  return value;
}

function getOrderValue(order, keys, fallback = "-") {
  for (const key of keys) {
    const value = String(key)
      .split(".")
      .reduce((acc, part) => acc?.[part], order);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function applyOrderSummary(order) {
  if (successOrderNumber) successOrderNumber.textContent = order.public_order_id || order.quote_id || "-";
  if (successTrackingNumber) successTrackingNumber.textContent = order.tracking_no || "-";
  if (successStatus) successStatus.textContent = order.status_label || order.status_code || "تم حفظ الرحلة داخل سلة";
  if (successSallaOrderNumber) {
    successSallaOrderNumber.textContent = getSallaOrderNumber(order);
  }
  if (successProviderName) {
    successProviderName.textContent = getOrderValue(
      order,
      ["financing.provider_name", "financing.providerName", "bnpl_provider_name", "bnplProviderName", "provider_name"],
      "-",
    );
  }
  if (successCollectionStatus) {
    successCollectionStatus.textContent = translateStatus(getOrderValue(order, ["collection.status_label", "collection_status_label", "collection.status", "collection_status", "collectionStatus"], "-"));
  }
  if (successSallaSyncStatus) {
    successSallaSyncStatus.textContent = translateSyncStatus(getOrderValue(order, ["salla.sync_status_label", "salla.syncStatusLabel", "salla.sync_status", "salla.syncStatus", "salla_sync_status_label", "salla_sync_status", "sallaSyncStatus"], "-"));
  }
}

function syncSessionStrip() {
  const summary = getSessionSummary();
  document.querySelectorAll("[data-sadady-session-title]").forEach((node) => {
    node.textContent = summary.label;
  });
  document.querySelectorAll("[data-sadady-session-subtitle]").forEach((node) => {
    node.textContent = summary.subtitle;
  });
  document.querySelectorAll("[data-sadady-session-name]").forEach((node) => {
    node.textContent = summary.name || "اسم العميل";
  });
  document.querySelectorAll("[data-sadady-session-phone]").forEach((node) => {
    node.textContent = summary.mobile || "الجوال";
  });
  document.querySelectorAll("[data-sadady-session-id]").forEach((node) => {
    node.textContent = summary.customerId || "هوية سلة";
  });
  document.querySelectorAll("[data-sadady-session-strip]").forEach((node) => {
    node.dataset.sessionState = summary.isSalla ? "connected" : "disconnected";
  });
}

function setResolutionNote(message) {
  if (successResolutionNote) {
    successResolutionNote.textContent = message;
  }
}

async function loadOrderSummary() {
  const query = new URLSearchParams(window.location.search);
  const shouldRenderInlineSuccess = query.get("sadady_success") === "1";
  if (successPanel && !shouldRenderInlineSuccess) return;
  if (successPanel) {
    successPanel.hidden = false;
    window.setTimeout(() => successPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const trackingNo = query.get("tracking_no");
  const publicOrderId = query.get("public_order_id");
  const lookupValue = trackingNo || publicOrderId;
  const journey = getCurrentJourney();
  syncSessionStrip();

  if (!lookupValue && journey?.quote?.quote_id) {
    applyOrderSummary({
      public_order_id: journey.quote.quote_id,
      tracking_no: journey.tracking_no || "-",
      status_label: "تم حفظ الرحلة داخل سلة",
      salla: {
        orderNumber: journey.salla_order_number || "-",
        syncStatus: journey.salla_sync_status || "بانتظار الإرسال",
      },
      financing: {
        providerName: journey.bnpl_provider_name || "-",
      },
      collection: {
        status: journey.collection_status || "بانتظار التحصيل",
      },
    });
    setResolutionNote("تم حفظ ملخص الرحلة محليًا. ستظهر البيانات النهائية هنا بعد اكتمال الإرجاع من مسار سدادي أو من سلة.");
    if (successTrackingLink) successTrackingLink.href = buildThemeUrl("/tracking", { tracking_no: journey.tracking_no || "" });
    return;
  }

  if (!lookupValue) {
    setResolutionNote("لا يوجد رقم تتبع أو رقم طلب في الرابط حاليًا. يمكنك متابعة الطلب لاحقًا من صفحة التتبع أو من طلباتك داخل سلة.");
    return;
  }

  try {
    const order = await getTracking(lookupValue);
    applyOrderSummary(order);
    setResolutionNote("تم تحميل ملخص الطلب من واجهة سدادي بنجاح، ويمكنك متابعة آخر حالاته من صفحة التتبع.");
    if (successTrackingLink) successTrackingLink.href = buildThemeUrl("/tracking", { tracking_no: order.tracking_no });
  } catch {
    setResolutionNote("تعذر جلب تفاصيل الطلب الآن. يمكنك إعادة المحاولة من صفحة التتبع أو الرجوع إلى طلباتك داخل سلة.");
  }
}

window.addEventListener("sadady:auth-success", syncSessionStrip);
window.addEventListener("sadady:auth-change", syncSessionStrip);
loadOrderSummary();
