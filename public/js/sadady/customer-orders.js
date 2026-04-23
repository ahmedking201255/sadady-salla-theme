import {
  getCustomerNotifications,
  getCustomerOrderDetails,
  getCustomerOrderDocuments,
  getCustomerOrders,
  getCustomerProfile,
  getSession,
  getSessionSummary,
} from "./api-client.js";

const statusClassMap = {
  pending: "",
  review: "status-chip-in_progress",
  active: "status-chip-in_progress",
  warning: "status-chip-needs_attention",
  completed: "status-chip-completed",
};

const statusLabelMap = {
  pending: "قيد الانتظار",
  review: "قيد المراجعة",
  active: "قيد التنفيذ",
  warning: "بحاجة متابعة",
  completed: "مكتمل",
};

function getCustomerStatusGuidance(status) {
  if (status === "pending") {
    return {
      now: "طلبك تحت المتابعة الأولية من فريق سدادي.",
      next: "الخطوة التالية ستكون بدء التنفيذ أو طلب معلومات إضافية عند الحاجة.",
    };
  }
  if (status === "review" || status === "active") {
    return {
      now: "طلبك يتحرك الآن داخل مراحل التنفيذ والمراجعة.",
      next: "بعد انتهاء الفريق من الاعتماد النهائي ستظهر المستندات هنا مباشرة.",
    };
  }
  if (status === "completed") {
    return {
      now: "الطلب اكتمل وتم تجهيز نتيجته النهائية.",
      next: "يمكنك تحميل المستندات أو الرجوع للدعم إذا احتجت متابعة إضافية.",
    };
  }
  return {
    now: "طلبك مسجل في النظام.",
    next: "ستتحدث هذه الصفحة تلقائيًا مع كل تغيير من فريق التنفيذ.",
  };
}

function formatMoney(value) {
  return `SAR ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-SA");
}

function showFeedback(id, message, type = "error") {
  const node = document.getElementById(id);
  if (!node) return;
  node.hidden = !message;
  node.className = `customer-feedback ${type === "success" ? "is-success" : "is-error"}`;
  node.textContent = message || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireSession(feedbackId) {
  const session = getSession();
  if (session) return session;
  showFeedback(feedbackId, "يجب تسجيل الدخول أولًا لعرض هذه الصفحة.");
  return null;
}

function renderStatusChip(node, status, label) {
  if (!node) return;
  const chipClass = statusClassMap[status] || "";
  node.className = `status-chip ${chipClass}`.trim();
  node.textContent = label || statusLabelMap[status] || status || "-";
}

function renderSessionStrip() {
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

function getOrderDate(order, keys) {
  const value = getOrderValue(order, keys, "");
  return value ? formatDate(value) : "-";
}

function getOrderMoney(order, keys) {
  const value = getOrderValue(order, keys, 0);
  return formatMoney(value);
}

function getPrimaryFinancingRecord(order) {
  return Array.isArray(order?.financingApplications) ? order.financingApplications[0] || null : null;
}

function getPrimarySettlementRecord(order) {
  return Array.isArray(order?.providerSettlements) ? order.providerSettlements[0] || null : null;
}

async function loadOrdersPage() {
  const session = requireSession("customerOrdersFeedback");
  const list = document.getElementById("customerOrdersList");
  const summary = document.getElementById("customerOrdersSummary");
  const template = document.getElementById("customerOrderCardTemplate");
  if (!session || !list || !template) return;

  try {
    const orders = await getCustomerOrders();
    if (!orders.length) {
      list.innerHTML = '<div class="customer-empty-state">لا توجد طلبات حتى الآن.</div>';
      if (summary) summary.hidden = true;
      return;
    }

    if (summary) {
      summary.hidden = false;
      summary.innerHTML = [
        `<div class="customer-summary-item"><span>إجمالي الطلبات</span><strong>${orders.length}</strong></div>`,
        `<div class="customer-summary-item"><span>الطلبات النشطة</span><strong>${orders.filter((item) => item.status !== "completed").length}</strong></div>`,
        `<div class="customer-summary-item"><span>آخر طلب</span><strong>${escapeHtml(orders[0].orderNumber)}</strong></div>`,
      ].join("");
    }

    list.innerHTML = "";
    orders.forEach((order) => {
      const fragment = template.content.cloneNode(true);
      const speedLabel = order.serviceSpeed === "URGENT" ? "خدمة مستعجلة" : "خلال ساعات العمل";
      const serviceLabel =
        order.invoiceTypeLabel ||
        order.invoiceTypeCode ||
        order.serviceTypeLabel ||
        "فاتورة سداد";

      fragment.querySelector("[data-order-number]").textContent = order.orderNumber;
      fragment.querySelector("[data-order-meta]").textContent = `${order.billerName || "سداد"} • ${speedLabel}`;
      const secondaryMeta = fragment.querySelector("[data-order-meta-secondary]");
      if (secondaryMeta) {
        secondaryMeta.textContent = serviceLabel;
      }
      const sallaNumber = fragment.querySelector("[data-order-salla-number]");
      if (sallaNumber) {
        sallaNumber.textContent = getOrderValue(order, ["sallaOrderNumber", "salla_order_number", "orderNumber"], "-");
      }
      fragment.querySelector("[data-order-submeta]").textContent = getOrderDate(order, ["updatedAt", "updated_at", "createdAt", "created_at"]);
      fragment.querySelector("[data-order-total]").textContent = getOrderMoney(order, ["totalAmount", "total_amount"]);
      fragment.querySelector("[data-order-link]").href = `/customer/orders/single?order_id=${encodeURIComponent(order.id)}`;
      renderStatusChip(fragment.querySelector("[data-order-status]"), order.status, statusLabelMap[order.status]);
      list.appendChild(fragment);
    });
  } catch (error) {
    list.innerHTML = '<div class="customer-empty-state">تعذر تحميل الطلبات.</div>';
    showFeedback("customerOrdersFeedback", error.message || "تعذر تحميل الطلبات.");
  }
}

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("order_id") || "";
}

async function loadOrderDetailsPage() {
  const session = requireSession("customerOrderFeedback");
  const orderId = getOrderIdFromUrl();
  if (!session) return;
  if (!orderId) {
    showFeedback("customerOrderFeedback", "لم يتم تحديد الطلب المطلوب.");
    return;
  }

  try {
    const [order, documents] = await Promise.all([
      getCustomerOrderDetails(orderId),
      getCustomerOrderDocuments(orderId),
    ]);

    document.getElementById("customerOrderDetailHeader")?.removeAttribute("hidden");
    document.getElementById("customerOrderTrackingNumber").textContent = order.orderNumber || "-";
    renderStatusChip(document.getElementById("customerOrderStatusChip"), order.status, statusLabelMap[order.status]);
    document.getElementById("customerOrderPublicId").textContent = order.legacyInvoiceId || "-";
    document.getElementById("customerOrderSallaOrderNumber").textContent = getOrderValue(order, ["sallaOrderNumber", "salla_order_number"], "-");
    document.getElementById("customerOrderInvoiceType").textContent = order.invoiceTypeLabel || order.invoiceTypeCode || "-";
    document.getElementById("customerOrderServiceType").textContent = order.serviceTypeLabel || (order.serviceSpeed === "URGENT" ? "مستعجل" : "عادي");
    document.getElementById("customerOrderStatusLabel").textContent = statusLabelMap[order.status] || order.status || "-";
    const financingRecord = getPrimaryFinancingRecord(order);
    const settlementRecord = getPrimarySettlementRecord(order);
    document.getElementById("customerOrderProviderName").textContent = financingRecord?.providerName || getOrderValue(order, ["bnplProviderName", "providerName", "bnplProviderCode"], "-");
    document.getElementById("customerOrderBillerName").textContent = order.billerName || "-";
    document.getElementById("customerOrderBillNumber").textContent = order.billNumber || "-";
    document.getElementById("customerOrderApprovalReference").textContent = financingRecord?.approvalReference || getOrderValue(order, ["bnplApprovalReference", "approvalReference"], "-");
    document.getElementById("customerOrderInvoiceAmount").textContent = getOrderMoney(order, ["principalAmount", "principal_amount", "invoiceAmount", "invoice_amount"]);
    document.getElementById("customerOrderTotalAmount").textContent = getOrderMoney(order, ["totalAmount", "total_amount"]);
    document.getElementById("customerOrderCollectionStatus").textContent = settlementRecord?.status || getOrderValue(order, ["collectionStatus", "paymentStatus"], "-");
    document.getElementById("customerOrderSallaSyncStatus").textContent = getOrderValue(order, ["salla.syncStatus", "sallaSyncStatus", "salla_sync_status"], "-");
    document.getElementById("customerOrderProviderSyncStatus").textContent = getOrderValue(order, ["financeProviderSync.status", "financeProviderSyncStatus", "providerSyncStatus"], "-");

    const loopNode = document.getElementById("customerOpsLoop");
    if (loopNode) {
      const events = order.events || [];
      const latestEvent = events[0] || null;
      const guidance = getCustomerStatusGuidance(order.status);
      loopNode.innerHTML = [
        {
          label: "آخر تحديث من فريق التنفيذ",
          value: latestEvent?.message || statusLabelMap[order.status] || order.status || "-",
          note: formatDate(latestEvent?.createdAt),
        },
        {
          label: "ماذا يحدث الآن",
          value: guidance.now,
          note: statusLabelMap[order.status] || order.status || "-",
        },
        {
          label: "الخطوة التالية",
          value: guidance.next,
          note: documents.length ? `المستندات المتاحة الآن: ${documents.length}` : "لا توجد مستندات متاحة للعميل بعد",
        },
      ]
        .map((item) => `
          <article class="customer-loop-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.note)}</p>
          </article>
        `)
        .join("");
    }

    const timeline = document.getElementById("customerOrderTimeline");
    if (timeline) {
      const events = order.events || [];
      timeline.innerHTML = events.length
        ? events.map((event) => `
            <div class="customer-timeline-item">
              <strong>${escapeHtml(event.message || event.eventType)}</strong>
              <span>${escapeHtml(event.source || "system")}</span>
              <time>${formatDate(event.createdAt)}</time>
            </div>
          `).join("")
        : '<div class="customer-empty-state">لا توجد أحداث مسجلة على الطلب حتى الآن.</div>';
    }

    const docsList = document.getElementById("customerDocumentsList");
    if (docsList) {
      docsList.innerHTML = documents.length
        ? documents.map((item) => `
            <article class="customer-document-card">
              <div>
                <strong>${escapeHtml(item.filename)}</strong>
                <div class="document-meta">${escapeHtml(item.documentType)} • ${formatDate(item.createdAt)}</div>
              </div>
              <a class="btn btn-orange" href="${escapeHtml(item.downloadUrl)}" target="_blank" rel="noreferrer">تحميل</a>
            </article>
          `).join("")
        : '<div class="customer-empty-state">لا توجد مستندات متاحة للعميل حتى الآن.</div>';
    }
  } catch (error) {
    showFeedback("customerOrderFeedback", error.message || "تعذر تحميل تفاصيل الطلب.");
  }
}

async function loadNotificationsPage() {
  const session = requireSession("customerNotificationsFeedback");
  const list = document.getElementById("customerNotificationsList");
  if (!session || !list) return;

  try {
    const notifications = await getCustomerNotifications();
    list.innerHTML = notifications.length
      ? notifications.map((item) => `
          <article class="customer-notification-card">
            <strong>${escapeHtml(item.template || "إشعار طلب")}</strong>
            <div class="notification-meta">${escapeHtml(item.channel)} • ${formatDate(item.createdAt)}</div>
            <p>${escapeHtml(item.payload?.message || item.status || "تم تحديث الطلب.")}</p>
          </article>
        `).join("")
      : '<div class="customer-empty-state">لا توجد إشعارات حتى الآن.</div>';
  } catch (error) {
    list.innerHTML = '<div class="customer-empty-state">تعذر تحميل الإشعارات.</div>';
    showFeedback("customerNotificationsFeedback", error.message || "تعذر تحميل الإشعارات.");
  }
}

async function loadProfilePage() {
  const session = requireSession("customerProfileFeedback");
  if (!session) return;

  try {
    const profile = await getCustomerProfile();
    document.getElementById("customerProfileName").textContent = profile.name || "عميل سدادي";
    document.getElementById("customerProfilePhone").textContent = profile.phone || session.mobile || "-";
    document.getElementById("customerProfileEmail").textContent = session.email || "غير متوفر";
    document.getElementById("customerProfileStatus").textContent = profile.isActive ? "مرتبط" : "غير نشط";
    document.getElementById("customerProfileSallaId").textContent = getSessionSummary().customerId || session.customer_id || "-";
  } catch (error) {
    showFeedback("customerProfileFeedback", error.message || "تعذر تحميل الملف الشخصي.");
  }
}

renderSessionStrip();
window.addEventListener("sadady:auth-success", renderSessionStrip);
window.addEventListener("sadady:auth-change", renderSessionStrip);

if (document.getElementById("customerOrdersList")) {
  loadOrdersPage();
}

if (document.getElementById("customerOrderDetailGrid")) {
  loadOrderDetailsPage();
}

if (document.getElementById("customerNotificationsList")) {
  loadNotificationsPage();
}

if (document.getElementById("customerProfileName")) {
  loadProfilePage();
}
