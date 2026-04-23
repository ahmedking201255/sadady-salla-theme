import { getSessionSummary, getTracking } from "./api-client.js";

const trackingSearchBtn = document.getElementById("trackingSearchBtn");
const trackingQuery = document.getElementById("trackingQuery");
const trackingResult = document.getElementById("trackingResult");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStatusGuidance(statusCode) {
  const code = String(statusCode || "").trim();
  if (code === "verification_pending") {
    return {
      now: "فريق التحقق يراجع بيانات الطلب الآن.",
      next: "بعد اكتمال التحقق سيتم تحويل الطلب إلى التنفيذ.",
    };
  }
  if (code === "assigned" || code === "executing") {
    return {
      now: "فريق التنفيذ يعمل حاليًا على إتمام الطلب.",
      next: "بعد إنهاء التنفيذ ينتقل الطلب إلى المراجعة.",
    };
  }
  if (code === "review_pending" || code === "approved") {
    return {
      now: "الطلب في مرحلة المراجعة والاعتماد النهائي.",
      next: "الخطوة التالية هي تجهيز وإرسال المستندات للعميل.",
    };
  }
  if (code === "docs_sent" || code === "completed") {
    return {
      now: "تم تجهيز الطلب وإرسال المستندات النهائية.",
      next: "يمكنك الآن مراجعة الملفات أو التواصل مع الدعم إذا احتجت أي تعديل.",
    };
  }
  if (code === "manual_review" || code === "exception_queue") {
    return {
      now: "الطلب يحتاج متابعة خاصة من الفريق.",
      next: "سيتم إشعارك فور انتقاله إلى المسار الطبيعي أو طلب بيانات إضافية.",
    };
  }
  return {
    now: "تم استلام الطلب وهو قيد المعالجة.",
    next: "ستظهر لك هنا الخطوة التالية فور تحديث الفريق لحالة الطلب.",
  };
}

function buildFeedbackLoop(order) {
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const latestEvent = timeline[0] || null;
  const guidance = getStatusGuidance(order.status_code);
  return [
    {
      label: "آخر تحديث من الفريق",
      value: latestEvent?.message || order.status_label || order.status_code || "تم تحديث الطلب",
      note: latestEvent?.at ? new Date(latestEvent.at).toLocaleString("ar-SA") : "بانتظار أول تحديث",
    },
    {
      label: "ماذا يحدث الآن",
      value: guidance.now,
      note: order.status_label || order.status_code || "-",
    },
    {
      label: "الخطوة التالية",
      value: guidance.next,
      note: order.documents?.length ? `المستندات المتاحة: ${order.documents.length}` : "لا توجد مستندات مرئية بعد",
    },
  ];
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

function getOrderAmount(order, keys) {
  const value = getOrderValue(order, keys, 0);
  return `SAR ${Number(value || 0).toFixed(2)}`;
}

function getOrderDate(order, keys) {
  const value = getOrderValue(order, keys, "");
  return value ? new Date(value).toLocaleString("ar-SA") : "-";
}

function renderTrackingMessage(message) {
  if (!trackingResult) return;

  const wrapper = document.createElement("div");
  wrapper.className = "tracking-result-empty";
  wrapper.textContent = message;
  trackingResult.replaceChildren(wrapper);
}

function syncTrackingSession() {
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

window.addEventListener("sadady:auth-success", syncTrackingSession);
window.addEventListener("sadady:auth-change", syncTrackingSession);

function renderTracking(order) {
  const timeline = (order.timeline || []).map((item) => `
    <div class="tracking-timeline-item">
      <strong>${escapeHtml(item.status_code)}</strong>
      <div>${escapeHtml(item.message || "")}</div>
      <time>${new Date(item.at).toLocaleString("ar-SA")}</time>
    </div>
  `).join("");
  const feedbackLoop = buildFeedbackLoop(order)
    .map((item) => `
      <article class="tracking-loop-card">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <p>${escapeHtml(item.note)}</p>
      </article>
    `)
    .join("");

  trackingResult.innerHTML = `
    <div class="detail-grid">
      <div class="detail-box"><span>رقم الطلب</span><strong>${escapeHtml(order.public_order_id)}</strong></div>
      <div class="detail-box"><span>رقم التتبع</span><strong>${escapeHtml(order.tracking_no)}</strong></div>
      <div class="detail-box"><span>رقم طلب سلة</span><strong>${escapeHtml(getOrderValue(order, ["salla_order_number", "sallaOrderNumber"], "-"))}</strong></div>
      <div class="detail-box"><span>شركة التقسيط</span><strong>${escapeHtml(getOrderValue(order, ["bnpl_provider_name", "bnplProviderName", "provider_name"], "-"))}</strong></div>
      <div class="detail-box"><span>الحالة</span><strong>${escapeHtml(order.status_label || order.status_code)}</strong></div>
      <div class="detail-box"><span>آخر تحديث</span><strong>${getOrderDate(order, ["updated_at", "updatedAt", "created_at", "createdAt"])}</strong></div>
      <div class="detail-box"><span>مبلغ الفاتورة</span><strong>${getOrderAmount(order, ["quote_snapshot.invoice_amount", "quote_snapshot.invoiceAmount", "quoteSnapshot.invoiceAmount", "invoice_amount", "invoiceAmount"])}</strong></div>
      <div class="detail-box"><span>الإجمالي</span><strong>${getOrderAmount(order, ["quote_snapshot.total_amount", "quote_snapshot.totalAmount", "quoteSnapshot.totalAmount", "total_amount", "totalAmount"])}</strong></div>
      <div class="detail-box"><span>رقم الموافقة</span><strong>${escapeHtml(getOrderValue(order, ["bnpl_approval_reference", "bnplApprovalReference"], "-"))}</strong></div>
      <div class="detail-box"><span>حالة التحصيل</span><strong>${escapeHtml(getOrderValue(order, ["collection_status", "collectionStatus"], "-"))}</strong></div>
      <div class="detail-box"><span>مزامنة سلة</span><strong>${escapeHtml(getOrderValue(order, ["salla_sync_status", "sallaSyncStatus"], "-"))}</strong></div>
      <div class="detail-box"><span>مزامنة شركة التقسيط</span><strong>${escapeHtml(getOrderValue(order, ["finance_provider_sync_status", "financeProviderSyncStatus"], "-"))}</strong></div>
    </div>
    <div class="tracking-feedback-loop">${feedbackLoop}</div>
    <div class="tracking-timeline">${timeline}</div>
  `;
  syncTrackingSession();
}

async function searchTracking(query) {
  const value = String(query || "").trim();
  if (!value) {
    renderTrackingMessage("أدخل رقم الطلب أو رقم التتبع أولًا.");
    return;
  }

  renderTrackingMessage("جارٍ جلب بيانات الطلب...");
  try {
    const order = await getTracking(value);
    renderTracking(order);
  } catch (error) {
    renderTrackingMessage(error.message || "لم يتم العثور على الطلب.");
  }
}

trackingSearchBtn?.addEventListener("click", () => {
  searchTracking(trackingQuery?.value || "");
});

syncTrackingSession();

const urlQuery = new URLSearchParams(window.location.search).get("tracking_no");
if (urlQuery) {
  if (trackingQuery) trackingQuery.value = urlQuery;
  searchTracking(urlQuery);
}
