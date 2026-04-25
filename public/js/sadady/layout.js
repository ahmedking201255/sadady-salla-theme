const LANGUAGE_KEY = "sadady.theme.language";

let navToggle = null;
let header = null;
let mainNav = null;
let languageButton = null;
let mutationObserver = null;

const arToEn = new Map(Object.entries({
  "القائمة": "Menu",
  "من نحن": "About us",
  "كيف تعمل الخدمة": "How it works",
  "سياسة الاستخدام": "Usage policy",
  "ابدأ الطلب": "Start request",
  "تسجيل الدخول": "Login",
  "الدخول إلى سلة": "Login to Salla",
  "طلباتي": "My orders",
  "رحلة الطلب داخل سلة": "Request journey in Salla",
  "منصة سدادي لتشغيل الطلبات والهوية البصرية": "Sadady platform for request operations and visual identity",
  "قابلة للنشر من الأدمن": "Managed from the admin panel",
  "الكهرباء": "Electricity",
  "الاتصالات": "Telecom",
  "المياه": "Water",
  "قسط مدفوعات سداد الآن": "Install SADDAD payments now",
  "تتبع الطلب": "Track request",
  "احسب الرسوم": "Calculate fees",
  "إتمام الطلب": "Complete request",
  "تم استلام طلبك بنجاح": "Your request has been received",
  "رقم الطلب": "Request number",
  "رقم التتبع": "Tracking number",
  "الحالة": "Status",
  "رقم طلب سلة": "Salla order number",
  "شركة التقسيط": "Installment provider",
  "حالة التحصيل": "Collection status",
  "مزامنة سلة": "Salla sync",
  "العودة للرئيسية": "Back home",
  "ابدأ التقسيط الآن": "Start installment now",
  "تقسيط مدفوعات سداد خلال 15 دقيقة": "Install SADDAD payments within 15 minutes",
  "تقسيط مدفوعات سداد خلال ساعات العمل": "Install SADDAD payments during business hours",
  "خدمة فورية": "Fast service",
  "خدمة اقتصادية": "Standard service",
  "طلب تقسيط مدفوعات سداد": "SADDAD installment request",
  "اسم الشركة المفوترة": "Biller name",
  "بيانات السداد": "Payment details",
  "مبلغ فاتورة السداد": "SADDAD invoice amount",
  "اختر طريقة سداد الفاتورة": "Choose payment speed",
  "خلال ساعات العمل": "During business hours",
  "خلال 15 دقيقة": "Within 15 minutes",
  "تنفيذ الطلب خلال ساعات العمل الرسمية.": "The request is processed during official business hours.",
  "خيار سريع للحالات المستعجلة.": "A fast option for urgent cases.",
  "تسجيل الدخول": "Login",
  "تسجيل الدخول عبر سلة": "Login through Salla",
  "الرسوم": "Fees",
  "ضريبة القيمة المضافة": "VAT",
  "الإجمالي": "Total",
  "بانتظار التحصيل": "Pending collection",
  "بانتظار المزامنة": "Pending sync",
  "تمت المزامنة": "Synced",
  "فشلت المزامنة": "Sync failed",
  "تم الدفع": "Paid",
  "تم التحصيل": "Collected",
  "فشل التحصيل": "Collection failed",
}));

const enToAr = new Map(Array.from(arToEn.entries()).map(([ar, en]) => [en, ar]));

function refreshElements() {
  navToggle = document.querySelector("[data-nav-toggle]");
  header = document.querySelector(".header");
  mainNav = document.getElementById("mainNav");
  languageButton = document.querySelector(".lang-btn");
}

function ensureNavToggle() {
  refreshElements();
  if (navToggle || !header || !mainNav) return;

  const button = document.createElement("button");
  button.className = "nav-toggle";
  button.type = "button";
  button.setAttribute("aria-controls", "mainNav");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("data-nav-toggle", "");
  button.innerHTML = "<span></span><span></span><span></span><b>القائمة</b>";
  mainNav.insertAdjacentElement("beforebegin", button);
  refreshElements();
}

function setNavOpen(open) {
  ensureNavToggle();
  refreshElements();
  if (!navToggle || !header) return;
  header.classList.toggle("is-nav-open", open);
  document.body?.classList.toggle("sadady-menu-open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function getCurrentLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "ar";
}

function translateTextValue(value, targetLanguage) {
  const text = String(value || "").trim();
  if (!text) return value;
  const dictionary = targetLanguage === "en" ? arToEn : enToAr;
  return dictionary.get(text) || value;
}

function getStoredArabicText(node) {
  return node.__sadadyArabicText || "";
}

function setStoredArabicText(node, value) {
  if (!node.__sadadyArabicText && value) {
    node.__sadadyArabicText = value;
  }
}

function translateTextNodes(root, targetLanguage) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if (targetLanguage === "en") {
      setStoredArabicText(node, node.nodeValue);
    }
    const translated = targetLanguage === "ar"
      ? getStoredArabicText(node) || translateTextValue(node.nodeValue, targetLanguage)
      : translateTextValue(node.nodeValue, targetLanguage);
    if (translated !== node.nodeValue) {
      node.nodeValue = translated;
    }
  });
}

function applyLanguage(targetLanguage = getCurrentLanguage()) {
  refreshElements();
  document.documentElement.lang = targetLanguage;
  document.documentElement.dir = targetLanguage === "en" ? "ltr" : "rtl";
  document.body?.classList.toggle("is-language-en", targetLanguage === "en");

  if (languageButton) {
    languageButton.innerHTML = `<span class="lang-icon" aria-hidden="true">🌐</span><span class="lang-code">${targetLanguage === "en" ? "AR" : "EN"}</span>`;
    languageButton.setAttribute("aria-label", targetLanguage === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية");
  }

  translateTextNodes(document.body, targetLanguage);
}

function setLanguage(targetLanguage) {
  localStorage.setItem(LANGUAGE_KEY, targetLanguage);
  document.documentElement.lang = targetLanguage;
  document.documentElement.dir = targetLanguage === "en" ? "ltr" : "rtl";
  applyLanguage(targetLanguage);
  window.dispatchEvent(new CustomEvent("sadady:language-change", { detail: { language: targetLanguage } }));
  window.setTimeout(() => {
    window.location.reload();
  }, 80);
}

function bindHeaderControls() {
  ensureNavToggle();
  refreshElements();

  if (navToggle && navToggle.dataset.bound !== "true") {
    navToggle.dataset.bound = "true";
    navToggle.addEventListener("click", () => {
      setNavOpen(!header?.classList.contains("is-nav-open"));
    });
  }

  if (document.body?.dataset.menuOutsideBound !== "true") {
    document.body.dataset.menuOutsideBound = "true";
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!document.body.classList.contains("sadady-menu-open")) return;
      if (target.closest("[data-nav-toggle]") || target.closest(".nav-links")) return;
      setNavOpen(false);
    });
  }

  if (mainNav && mainNav.dataset.bound !== "true") {
    mainNav.dataset.bound = "true";
    mainNav.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLAnchorElement) {
        setNavOpen(false);
      }
    });
  }

  if (languageButton && languageButton.dataset.bound !== "true") {
    languageButton.dataset.bound = "true";
    languageButton.addEventListener("click", () => {
      setLanguage(getCurrentLanguage() === "en" ? "ar" : "en");
    });
  }
}

function observeLanguageMutations() {
  if (!document.body || mutationObserver) return;
  mutationObserver = new MutationObserver(() => {
    if (getCurrentLanguage() === "en") {
      window.requestAnimationFrame(() => applyLanguage("en"));
    }
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function initLayout() {
  bindHeaderControls();
  applyLanguage();
  observeLanguageMutations();
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 860) {
    setNavOpen(false);
  }
});

window.addEventListener("sadady:auth-success", () => window.setTimeout(initLayout, 0));
window.addEventListener("sadady:auth-change", () => window.setTimeout(initLayout, 0));
window.addEventListener("load", initLayout);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLayout, { once: true });
} else {
  initLayout();
}
