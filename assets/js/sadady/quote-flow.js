import { calculateQuote, getSession, getSessionSummary, setCurrentJourney } from "./api-client.js";

const requestFlowModal = document.getElementById("requestFlowModal");
const requestModal = document.getElementById("requestModal");
const backFlowBtn = document.getElementById("backFlowBtn");
const finishFlowBtn = document.getElementById("finishFlowBtn");
const sadadSubmitBtn = document.getElementById("sadadSubmitBtn");
const otherSubmitBtn = document.getElementById("otherSubmitBtn");
const summaryInvoice = document.getElementById("summaryInvoice");
const summaryFee = document.getElementById("summaryFee");
const summaryVat = document.getElementById("summaryVat");
const summaryTotal = document.getElementById("summaryTotal");
const summarySpeed = document.getElementById("summarySpeed");
const summaryNextStep = document.getElementById("summaryNextStep");
const toCompleteBtn = document.getElementById("toCompleteBtn");

function toMoney(value) {
  return `SAR ${Number(value || 0).toFixed(2)}`;
}

function closeRequestModalSurface() {
  if (requestModal) {
    requestModal.hidden = true;
    document.body.classList.remove("request-modal-open");
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`تعذر قراءة الملف: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function getSerializedDocuments(inputId) {
  const files = Array.from(document.getElementById(inputId)?.files || []);
  return Promise.all(files.map(async (file) => {
    const dataUrl = await readFileAsDataUrl(file);
    const [, contentBase64 = ""] = dataUrl.split(",", 2);

    return {
      name: file.name,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: Number(file.size || 0),
      content_base64: contentBase64,
    };
  }));
}

function setFeedback(elementId, type, message) {
  const node = document.getElementById(elementId);
  if (!node) return;
  node.hidden = !message;
  node.className = `form-feedback ${type === "error" ? "is-error" : "is-success"}`;
  node.textContent = message || "";
}

function getServiceLabel(serviceType) {
  return serviceType === "urgent" || serviceType === "FAST" || serviceType === "URGENT" || serviceType === "خلال 15 دقيقة"
    ? "خلال 15 دقيقة"
    : "خلال ساعات العمل";
}

function getSelectedServiceType(flowType) {
  const selector = flowType === "external"
    ? 'input[name="otherSpeedChoice"]:checked'
    : 'input[name="speed"]:checked';
  const value = document.querySelector(selector)?.value || "خلال ساعات العمل";
  return value === "خلال 15 دقيقة" ? "urgent" : "normal";
}

async function buildSadadPayload() {
  const documents = await getSerializedDocuments("sadadInvoiceFile");
  return {
    flow_type: "sadad",
    invoice_type: "sadad_bill",
    service_type: getSelectedServiceType("sadad"),
    invoice_amount: document.getElementById("sadadInvoiceAmount")?.value || "",
    customer_input: {
      mobile: getSession()?.mobile || "",
      identity_number: document.getElementById("sadadIdentity")?.value?.trim() || "",
    },
    invoice_payload: {
      biller_name: document.getElementById("sadadBillerName")?.value?.trim() || "",
      biller_code: document.getElementById("sadadBillerCode")?.value?.trim() || "",
      bill_number: document.getElementById("sadadBillNumber")?.value?.trim() || "",
      note: document.getElementById("sadadNote")?.value?.trim() || "",
      documents,
    },
  };
}

async function buildExternalPayload() {
  const documents = await getSerializedDocuments("otherInvoiceFile");
  return {
    flow_type: "external",
    invoice_type: "external_invoice",
    service_type: getSelectedServiceType("external"),
    invoice_amount: document.getElementById("otherInvoiceAmount")?.value || "",
    customer_input: {
      mobile: getSession()?.mobile || "",
      beneficiary_phone: document.getElementById("otherBeneficiaryPhone")?.value?.trim() || "",
    },
    invoice_payload: {
      beneficiary_name: document.getElementById("otherBeneficiaryName")?.value?.trim() || "",
      iban: document.getElementById("otherIban")?.value?.trim() || "",
      documents,
    },
  };
}

function validatePayload(payload) {
  if (!payload.invoice_amount) return "أدخل مبلغ الفاتورة.";
  if (payload.flow_type === "sadad") {
    if (!payload.invoice_payload.biller_name || !payload.invoice_payload.biller_code || !payload.invoice_payload.bill_number) {
      return "أكمل بيانات فاتورة سداد قبل المتابعة.";
    }
  }
  if (payload.flow_type === "external") {
    if (!payload.invoice_payload.beneficiary_name || !payload.customer_input.beneficiary_phone || !payload.invoice_payload.iban) {
      return "أكمل بيانات المستفيد قبل المتابعة.";
    }
  }
  return "";
}

function buildQuoteRequestPayload(payload) {
  return {
    ...payload,
    invoice_payload: {
      ...(payload.invoice_payload || {}),
      documents: (payload.invoice_payload?.documents || []).map((document) => ({
        name: document.name,
        file_name: document.file_name || document.name,
        mime_type: document.mime_type || "",
        size_bytes: document.size_bytes || 0,
      })),
    },
  };
}

async function startQuote(flowType) {
  const feedbackId = flowType === "sadad" ? "sadadFeedback" : "otherFeedback";
  setFeedback(feedbackId, "success", "");

  try {
    const payload = flowType === "sadad" ? await buildSadadPayload() : await buildExternalPayload();
    const validationError = validatePayload(payload);
    if (validationError) {
      setFeedback(feedbackId, "error", validationError);
      return;
    }

    if (!getSession()) {
      setFeedback(feedbackId, "error", "يرجى تسجيل الدخول من حساب سلة أولًا لإكمال الطلب.");
      return;
    }

    const quote = await calculateQuote(buildQuoteRequestPayload(payload));
    const session = getSession();
    const sessionSummary = getSessionSummary();
    const journey = {
      ...payload,
      quote,
      customer_context: sessionSummary,
      created_at: new Date().toISOString(),
    };
    summarySpeed.textContent = getServiceLabel(payload.service_type);
    summaryInvoice.textContent = toMoney(quote.breakdown.invoice_amount);
    summaryFee.textContent = toMoney(quote.breakdown.service_fee);
    summaryVat.textContent = toMoney(quote.breakdown.vat_amount);
    summaryTotal.textContent = toMoney(quote.breakdown.total_amount);
    if (summaryNextStep) {
      summaryNextStep.textContent = session?.session_token
        ? "تم حفظ ملخصك داخل حساب سلة، والضغط على إتمام الطلب سينتقل بك إلى مسار الإكمال/التحويل النهائي."
        : "احفظ ملخصك عبر تسجيل الدخول من حساب سلة ثم أكمل الإرسال.";
    }
    if (toCompleteBtn) {
      toCompleteBtn.textContent = session?.session_token
        ? "إتمام الطلب والانتقال إلى سلة"
        : "سجّل الدخول من سلة أولًا";
    }
    setCurrentJourney(journey);
    closeRequestModalSurface();
    requestFlowModal.hidden = false;
  } catch (error) {
    setFeedback(feedbackId, "error", error.message || "تعذر حساب العرض.");
  }
}

sadadSubmitBtn?.addEventListener("click", () => { startQuote("sadad"); });
otherSubmitBtn?.addEventListener("click", () => { startQuote("external"); });
backFlowBtn?.addEventListener("click", () => { requestFlowModal.hidden = true; });
finishFlowBtn?.addEventListener("click", () => { requestFlowModal.hidden = true; });
requestFlowModal?.addEventListener("click", (event) => {
  if (event.target === requestFlowModal) requestFlowModal.hidden = true;
});
