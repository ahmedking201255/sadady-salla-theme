const DEFAULT_API_BASE = "https://api.sadady.com";
const META_API_BASE = readMetaContent("sadady-api-base");
const META_SUPPORT_EMAIL = readMetaContent("sadady-support-email");
const API_BASE = normalizeApiBase(window.SADADY_API_BASE || META_API_BASE || "");
const THEME_ENDPOINT = `${API_BASE || DEFAULT_API_BASE}/api/v1/public/theme-config`;
const PAGES_ENDPOINT = `${API_BASE || DEFAULT_API_BASE}/api/v1/public/theme-pages`;

const sectionTypeLabels = {
  ar: {
    benefits: "المزايا",
    journey: "رحلة العميل",
    trust: "الثقة والاعتمادية",
    support: "الدعم",
    metrics: "مؤشرات الثقة",
    contact: "قنوات التواصل",
    services: "الخدمات",
    steps: "خطوات العمل",
    faq: "الأسئلة الشائعة",
    content: "محتوى",
  },
  en: {
    benefits: "Benefits",
    journey: "Customer journey",
    trust: "Trust and compliance",
    support: "Support",
    metrics: "Trust metrics",
    contact: "Contact channels",
    services: "Services",
    steps: "How it works",
    faq: "FAQ",
    content: "Content",
  },
};

const cmsMetaLabels = {
  ar: {
    SLA: "اتفاقية الخدمة",
    Tracking: "تتبع الطلب",
    WhatsApp: "واتساب",
    Email: "البريد الإلكتروني",
    Documents: "المستندات",
  },
  en: {
    SLA: "Service level",
    Tracking: "Order tracking",
    WhatsApp: "WhatsApp",
    Email: "Email",
    Documents: "Documents",
  },
};

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

function normalizeApiBase(value) {
  const apiBase = String(value || "").trim().replace(/\/$/, "");
  if (!apiBase || !window.SADADY_LOCAL_THEME_PREVIEW) return apiBase;

  try {
    const url = new URL(apiBase);
    const isLoopbackApi = ["127.0.0.1", "localhost"].includes(url.hostname);
    const isLoopbackPage = ["127.0.0.1", "localhost"].includes(window.location.hostname);
    if (isLoopbackApi && isLoopbackPage && url.port === window.location.port) {
      return window.location.origin;
    }
  } catch {
    return apiBase;
  }

  return apiBase;
}

function getCurrentLanguage() {
  return localStorage.getItem("sadady.theme.language") === "en" ? "en" : "ar";
}

function getLocalizedValue(source, key, fallback = "") {
  if (!source || typeof source !== "object") return fallback;
  const language = getCurrentLanguage();
  const suffix = language === "en" ? "en" : "ar";
  const pascalSuffix = suffix === "en" ? "En" : "Ar";
  const candidates = [
    source[`${key}_${suffix}`],
    source[`${key}${pascalSuffix}`],
    source?.translations?.[language]?.[key],
    source?.locales?.[language]?.[key],
    source?.i18n?.[language]?.[key],
    source[key],
    fallback,
  ];

  return candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== "") ?? fallback;
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

async function loadThemePages() {
  try {
    const response = await fetch(PAGES_ENDPOINT, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Theme pages unavailable");
    const payload = await response.json();
    return { source: "remote", data: Array.isArray(payload?.data) ? payload.data : [] };
  } catch {
    return { source: "defaults", data: [] };
  }
}

function getLocalizedSectionType(type, fallback) {
  const language = getCurrentLanguage();
  return sectionTypeLabels[language]?.[type] || fallback;
}

function getLocalizedCmsMeta(meta) {
  const language = getCurrentLanguage();
  return cmsMetaLabels[language]?.[meta] || meta;
}

function createCmsSection(section) {
  const article = document.createElement("article");
  article.className = "cms-section-card";

  const header = document.createElement("div");
  header.className = "cms-section-head";

  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.className = "cms-section-kicker";
  const sectionTitle = getLocalizedValue(section, "title", "قسم");
  eyebrow.textContent = getLocalizedSectionType(section.type, sectionTitle);
  const title = document.createElement("h2");
  title.textContent = sectionTitle;
  titleWrap.append(eyebrow, title);

  const subtitle = document.createElement("p");
  subtitle.textContent = getLocalizedValue(section, "subtitle", "");

  header.append(titleWrap, subtitle);
  article.append(header);

  const items = Array.isArray(section.items) ? section.items.filter(Boolean) : [];
  if (items.length) {
    const grid = document.createElement("div");
    grid.className = "cms-section-grid";
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "cms-section-item";
      const itemTitle = document.createElement("strong");
      itemTitle.textContent = getLocalizedValue(item, "title", "عنصر");
      const itemDescription = document.createElement("p");
      itemDescription.textContent = getLocalizedValue(item, "description", "");
      card.append(itemTitle, itemDescription);
      if (item.meta) {
        const meta = document.createElement("span");
        meta.textContent = getLocalizedCmsMeta(item.meta);
        card.append(meta);
      }
      grid.appendChild(card);
    });
    article.appendChild(grid);
  }

  return article;
}

function filterCmsSections(sections) {
  const seen = new Set();
  return (sections || []).filter((section) => {
    const id = String(section?.id || "").toLowerCase();
    const type = String(section?.type || "").toLowerCase();
    if (id === "hero" || id.startsWith("hero-") || type === "hero") return false;

    const title = String(section?.title || "").trim().toLowerCase();
    const key = `${type}:${title || id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderCmsHomeSections(pages) {
  document.querySelectorAll('[data-theme-cms-sections="home"]').forEach((node) => node.remove());
  const home = pages.find((page) => page.slug === "home" || page.path === "/");
  const sections = filterCmsSections(home?.sections);
  if (!sections.length) return;

  const services = document.querySelector(".services");
  const mount = document.createElement("section");
  mount.className = "cms-sections";
  mount.dataset.themeCmsSections = "home";
  sections.forEach((section) => mount.appendChild(createCmsSection(section)));

  if (services?.parentNode) {
    services.insertAdjacentElement("afterend", mount);
    return;
  }
  document.querySelector(".container")?.appendChild(mount);
}

function applyThemeConfig(config) {
  Object.entries(config).forEach(([key, value]) => {
    const localizedValue = getLocalizedValue(config, key, value);
    if (typeof localizedValue === "string") {
      setText(key, localizedValue);
    }
  });
}

const themeState = await loadThemeConfig();
const merged = { ...defaults, ...themeState.data };
applyThemeConfig(merged);
setImage("brand_logo_url", merged.brand_logo_url);
setImage("favicon_url", merged.favicon_url);
setAlt("brand_name", getLocalizedValue(merged, "brand_name", merged.brand_name));
setLink("home_url", merged.home_url);
setCssVar("--primary", merged.primary_color);
setCssVar("--primary-2", merged.primary_color_alt);
setCssVar("--success", merged.success_color);
setCssVar("--surface-start", merged.surface_start);
setCssVar("--surface-mid", merged.surface_mid);
setCssVar("--surface-end", merged.surface_end);
window.SADADY_API_BASE = API_BASE || merged.api_base_url || DEFAULT_API_BASE;
window.SADADY_THEME_STATE = {
  source: themeState.source,
  loaded_at: new Date().toISOString(),
  api_base_url: window.SADADY_API_BASE,
};
document.documentElement.dataset.sadadyThemeSource = themeState.source;
document.documentElement.dataset.sadadyThemeReady = "true";
window.sadadyThemeConfig = merged;

const pagesState = await loadThemePages();
renderCmsHomeSections(pagesState.data);
window.SADADY_THEME_STATE.pages_source = pagesState.source;
window.SADADY_THEME_STATE.pages_count = pagesState.data.length;

window.addEventListener("sadady:language-change", () => {
  applyThemeConfig(merged);
  setAlt("brand_name", getLocalizedValue(merged, "brand_name", merged.brand_name));
  renderCmsHomeSections(pagesState.data);
});
