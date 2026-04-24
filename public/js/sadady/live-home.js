import { getSessionSummary } from "./api-client.js";

const requestModal = document.getElementById("requestModal");
const closeRequestModalBtn = document.getElementById("closeRequestModalBtn");
const requestModalTabs = Array.from(document.querySelectorAll("[data-request-modal-tab]"));
const requestModalPanels = Array.from(document.querySelectorAll("[data-request-panel]"));

function syncSessionWidget(root = document) {
  const summary = getSessionSummary();
  const strip = root.querySelector("[data-sadady-session-strip]");
  const titleNodes = root.querySelectorAll("[data-sadady-session-title]");
  const subtitleNodes = root.querySelectorAll("[data-sadady-session-subtitle]");
  const nameNodes = root.querySelectorAll("[data-sadady-session-name]");
  const phoneNodes = root.querySelectorAll("[data-sadady-session-phone]");
  const idNodes = root.querySelectorAll("[data-sadady-session-id]");
  const loginHint = document.getElementById("loginHint");

  if (strip) {
    strip.dataset.sessionState = summary.isSalla ? "connected" : "disconnected";
  }

  titleNodes.forEach((node) => {
    node.textContent = summary.label;
  });

  subtitleNodes.forEach((node) => {
    node.textContent = summary.subtitle;
  });

  nameNodes.forEach((node) => {
    node.textContent = summary.name || "اسم العميل";
  });

  phoneNodes.forEach((node) => {
    node.textContent = summary.mobile || "الجوال";
  });

  idNodes.forEach((node) => {
    node.textContent = summary.customerId || "هوية سلة";
  });

  if (loginHint) {
    loginHint.textContent = summary.isSalla
      ? summary.subtitle
      : "الدخول يتم عبر حساب سلة، وبعدها تظهر طلباتك ومستنداتك المرتبطة بحسابك تلقائيًا.";
  }
}

function setSelectedSpeed(flow, speed) {
  if (!speed) return;
  const inputName = flow === "external" ? "otherSpeedChoice" : "speed";
  const expectedValue = speed === "urgent" ? "خلال 15 دقيقة" : "خلال ساعات العمل";
  const input = document.querySelector(`input[name="${inputName}"][value="${expectedValue}"]`);
  if (input) {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function setRequestFlow(flow = "sadad") {
  requestModalTabs.forEach((tab) => {
    const isActive = tab.dataset.requestModalTab === flow;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  requestModalPanels.forEach((panel) => {
    const isActive = panel.dataset.requestPanel === flow;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function openRequestModal(flow = "sadad", speed = "") {
  if (!requestModal) return;
  setRequestFlow(flow);
  setSelectedSpeed(flow, speed);
  requestModal.hidden = false;
  document.body.classList.add("request-modal-open");
  window.requestAnimationFrame(() => {
    const firstInput = requestModal.querySelector(`[data-request-panel="${flow}"] input`);
    firstInput?.focus({ preventScroll: true });
  });
}

function closeRequestModal() {
  if (!requestModal) return;
  requestModal.hidden = true;
  document.body.classList.remove("request-modal-open");
}

function bindOpenRequestModal() {
  document.querySelectorAll("[data-open-request-modal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.tagName === "A") {
        event.preventDefault();
      }
      openRequestModal(button.dataset.requestFlow || "sadad", button.dataset.requestSpeed || "");
    });
  });
}

function bindModalControls() {
  closeRequestModalBtn?.addEventListener("click", closeRequestModal);
  requestModal?.querySelectorAll("[data-close-request-modal]").forEach((node) => {
    node.addEventListener("click", closeRequestModal);
  });

  requestModalTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setRequestFlow(tab.dataset.requestModalTab || "sadad");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !requestModal?.hidden) {
      closeRequestModal();
    }
  });
}

function initHome() {
  syncSessionWidget();
  bindOpenRequestModal();
  bindModalControls();
  window.__sadadyHomeReady = true;
}

window.addEventListener("sadady:auth-success", () => syncSessionWidget());
window.addEventListener("sadady:auth-change", () => syncSessionWidget());
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHome, { once: true });
} else {
  initHome();
}
