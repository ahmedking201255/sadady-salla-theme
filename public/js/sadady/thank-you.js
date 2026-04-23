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
    successSallaOrderNumber.textContent = getOrderValue(order, ["salla.orderNumber", "salla_order_number", "sallaOrderNumber"], "-");
  }
  if (successProviderName) {
    successProviderName.textContent = getOrderValue(
      order,
      ["financing.providerName", "bnpl_provider_name", "bnplProviderName", "provider_name"],
      "-",
    );
  }
  if (successCollectionStatus) {
    successCollectionStatus.textContent = getOrderValue(order, ["collection.status", "collection_status", "collectionStatus"], "-");
  }
  if (successSallaSyncStatus) {
    successSallaSyncStatus.textContent = getOrderValue(order, ["salla.syncStatus", "salla_sync_status", "sallaSyncStatus"], "-");
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
    if (successTrackingLink) successTrackingLink.href = "/customer/orders";
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
    if (successTrackingLink) successTrackingLink.href = `/tracking?tracking_no=${encodeURIComponent(order.tracking_no)}`;
  } catch {
    setResolutionNote("تعذر جلب تفاصيل الطلب الآن. يمكنك إعادة المحاولة من صفحة التتبع أو الرجوع إلى طلباتك داخل سلة.");
  }
}

window.addEventListener("sadady:auth-success", syncSessionStrip);
window.addEventListener("sadady:auth-change", syncSessionStrip);
loadOrderSummary();
