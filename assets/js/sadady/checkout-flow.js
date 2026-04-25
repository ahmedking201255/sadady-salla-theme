import { checkoutOrder, ensureSadadySession, getCurrentJourney, getSession, precreateOrder, clearCurrentJourney } from "./api-client.js";

const toCompleteBtn = document.getElementById("toCompleteBtn");
const summaryNote = document.getElementById("summaryNote");
const summaryLoginLink = document.getElementById("summaryLoginLink");

function setCheckoutMessage(message, type = "error") {
  if (!summaryNote) return;
  summaryNote.hidden = false;
  summaryNote.dataset.kind = type;
  summaryNote.textContent = message;
}

function buildSameThemeSuccessUrl(order) {
  const url = new URL(window.location.href);
  url.searchParams.set("sadady_success", "1");
  url.searchParams.set("tracking_no", order.tracking_no || "");
  url.searchParams.set("public_order_id", order.public_order_id || "");
  return `${url.pathname}${url.search}${url.hash || ""}`;
}

toCompleteBtn?.addEventListener("click", async () => {
  const journey = getCurrentJourney();
  if (!journey?.quote?.quote_id) {
    setCheckoutMessage("لا يوجد ملخص طلب جاهز حاليًا. احسب الرسوم أولًا.");
    return;
  }

  toCompleteBtn.disabled = true;
  toCompleteBtn.dataset.originalText = toCompleteBtn.dataset.originalText || toCompleteBtn.textContent;
  toCompleteBtn.textContent = "جاري تأكيد جلسة سلة...";

  const sessionBeforeExchange = getSession();
  const session = await ensureSadadySession();
  if (!session?.session_token) {
    const message = sessionBeforeExchange
      ? "تعذر تأكيد جلسة سلة. أعد تحميل الصفحة أو سجّل الدخول مرة أخرى."
      : "لإكمال الطلب، يرجى تسجيل الدخول إلى حسابك في سلة.";
    setCheckoutMessage(message);
    if (summaryLoginLink) summaryLoginLink.hidden = false;
    toCompleteBtn.disabled = false;
    toCompleteBtn.textContent = toCompleteBtn.dataset.originalText || "إتمام الطلب";
    return;
  }

  toCompleteBtn.textContent = "جاري إتمام الطلب...";
  try {
    const precreated = await precreateOrder({
      quote_id: journey.quote.quote_id,
      invoice_type: journey.invoice_type,
      service_type: journey.service_type,
      customer_input: journey.customer_input,
      invoice_payload: journey.invoice_payload,
      quote_snapshot: journey.quote.breakdown,
    });
    const checkout = await checkoutOrder(precreated.public_order_id, { channel: "theme_web" });
    const successUrl = buildSameThemeSuccessUrl({
      tracking_no: precreated.tracking_no || checkout.tracking_no || "",
      public_order_id: precreated.public_order_id || checkout.public_order_id || "",
    });
    clearCurrentJourney();
    window.location.href = successUrl;
  } catch (error) {
    setCheckoutMessage(error.message || "تعذر إتمام الطلب.");
  } finally {
    toCompleteBtn.disabled = false;
    toCompleteBtn.textContent = toCompleteBtn.dataset.originalText || "إتمام الطلب";
  }
});

window.__sadadyCheckoutReady = true;
