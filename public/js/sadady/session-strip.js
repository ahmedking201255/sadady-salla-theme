import { getSessionSummary } from "./api-client.js";

const sessionStrip = document.querySelector("[data-sadady-session-strip]");
const titleNode = document.querySelector("[data-sadady-session-title]");
const subtitleNode = document.querySelector("[data-sadady-session-subtitle]");
const nameNode = document.querySelector("[data-sadady-session-name]");
const phoneNode = document.querySelector("[data-sadady-session-phone]");
const idNode = document.querySelector("[data-sadady-session-id]");

function updateSessionStrip() {
  if (!sessionStrip) return;
  const summary = getSessionSummary();

  sessionStrip.dataset.sessionState = summary.isSalla ? "connected" : "disconnected";
  if (titleNode) titleNode.textContent = summary.label || "غير مرتبطة بحساب سلة";
  if (subtitleNode) subtitleNode.textContent = summary.subtitle || "";
  if (nameNode) nameNode.textContent = summary.name ? `العميل: ${summary.name}` : "العميل: غير متاح";
  if (phoneNode) phoneNode.textContent = summary.mobile ? `الجوال: ${summary.mobile}` : "الجوال: غير متاح";
  if (idNode) idNode.textContent = summary.customerId ? `هوية سلة: ${summary.customerId}` : "هوية سلة: غير متاحة";
}

window.addEventListener("sadady:auth-success", updateSessionStrip);
window.addEventListener("sadady:auth-change", updateSessionStrip);
document.addEventListener("DOMContentLoaded", updateSessionStrip);
updateSessionStrip();
