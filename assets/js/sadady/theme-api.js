const DEFAULT_API_BASE = "https://api.sadady.com";
const META_API_BASE = readMetaContent("sadady-api-base");
const META_SUPPORT_EMAIL = readMetaContent("sadady-support-email");
const API_BASE = window.SADADY_API_BASE || META_API_BASE || "";
const THEME_ENDPOINT = `${API_BASE || DEFAULT_API_BASE}/api/v1/public/theme-config`;

const defaults = {
  brand_name: "Sadady",
  brand_subtitle: "منصة سداد وتقسيط الفواتير",
  hero_title: "سدادي تسدد عنك فواتير سداد فورًا<br>وأنت قسّطها على راحتك",
  hero_subtitle: "أدخل رقم فاتورة سداد… ونحن نسددها فورًا وأنت قسّطها براحتك.",
  brand_logo_url: "",
  favicon_url: "",
  api_base_url: API_BASE || "https://api.sadady.com",
  home_url: "/",
  support_phone: "966500000000",
  support_email: META_SUPPORT_EMAIL || "care@sadady.com",
  primary_color: "#f97316",
  primary_color_alt: "#fb923c",
  success_color: "#10b981",
  surface_start: "#fff7ed",
  surface_mid: "#ffffff",
  surface_end: "#fffaf5",
};

function readMetaContent(name) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() || "";
}

function setText(key, value) {
  document.querySelectorAll(`[data-theme-text="${key}"]`).forEach((node) => {
    if (key === "hero_title") {
      setMultilineText(node, value);
      return;
    }
    node.textContent = value;
  });
}

function setMultilineText(node, value) {
  const parts = String(value || "").split(/<br\s*\/?>/i);
  const fragment = document.createDocumentFragment();

  parts.forEach((part, index) => {
    if (index > 0) {
      fragment.appendChild(document.createElement("br"));
    }
    fragment.appendChild(document.createTextNode(part));
  });

  node.replaceChildren(fragment);
}

function setImage(key, value) {
  document.querySelectorAll(`[data-theme-src="${key}"]`).forEach((node) => {
    if (!value) return;
    node.setAttribute("src", value);
    if ("hidden" in node) node.hidden = false;
  });
}

function setAlt(key, value) {
  document.querySelectorAll(`[data-theme-alt="${key}"]`).forEach((node) => {
    if (value) node.setAttribute("alt", value);
  });
}

function setLink(key, value) {
  document.querySelectorAll(`[data-theme-href="${key}"]`).forEach((node) => {
    if (!value) return;
    if (key === "support_email") {
      node.setAttribute("href", `mailto:${value}`);
      return;
    }
    if (key === "support_phone") {
      node.setAttribute("href", `tel:${value}`);
      return;
    }
    node.setAttribute("href", value);
  });
}

function setCssVar(name, value) {
  if (!value) return;
  document.documentElement.style.setProperty(name, value);
}

async function loadThemeConfig() {
  try {
    const response = await fetch(THEME_ENDPOINT, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Theme config unavailable");
    const payload = await response.json();
    return { source: "remote", data: payload?.data || payload || {} };
  } catch {
    return { source: "defaults", data: defaults };
  }
}

const themeState = await loadThemeConfig();
const merged = { ...defaults, ...themeState.data };
Object.entries(merged).forEach(([key, value]) => {
  if (typeof value === "string") setText(key, value);
});
setImage("brand_logo_url", merged.brand_logo_url);
setImage("favicon_url", merged.favicon_url);
setAlt("brand_name", merged.brand_name);
setLink("home_url", merged.home_url);
setCssVar("--primary", merged.primary_color);
setCssVar("--primary-2", merged.primary_color_alt);
setCssVar("--success", merged.success_color);
setCssVar("--surface-start", merged.surface_start);
setCssVar("--surface-mid", merged.surface_mid);
setCssVar("--surface-end", merged.surface_end);
window.SADADY_API_BASE = window.SADADY_API_BASE || merged.api_base_url || DEFAULT_API_BASE;
window.SADADY_THEME_STATE = {
  source: themeState.source,
  loaded_at: new Date().toISOString(),
  api_base_url: window.SADADY_API_BASE,
};
document.documentElement.dataset.sadadyThemeSource = themeState.source;
document.documentElement.dataset.sadadyThemeReady = "true";
window.sadadyThemeConfig = merged;
