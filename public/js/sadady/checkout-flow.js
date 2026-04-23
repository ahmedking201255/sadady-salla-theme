import { checkoutOrder, getCurrentJourney, precreateOrder, clearCurrentJourney } from "./api-client.js";

const toCompleteBtn = document.getElementById("toCompleteBtn");

toCompleteBtn?.addEventListener("click", async () => {
  const journey = getCurrentJourney();
  if (!journey?.quote?.quote_id) {
    window.alert("لا يوجد ملخص طلب جاهز حاليًا.");
    return;
  }

  toCompleteBtn.disabled = true;
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
    const fallbackTrackingUrl = `/thank-you?tracking_no=${encodeURIComponent(precreated.tracking_no || checkout.tracking_no || "")}&public_order_id=${encodeURIComponent(precreated.public_order_id || checkout.public_order_id || "")}`;
    clearCurrentJourney();
    window.location.href = checkout.checkout_url || fallbackTrackingUrl;
  } catch (error) {
    window.alert(error.message || "تعذر إتمام الطلب.");
  } finally {
    toCompleteBtn.disabled = false;
  }
});
