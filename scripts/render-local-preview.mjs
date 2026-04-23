import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themeRoot = path.resolve(__dirname, "..");
const viewsRoot = path.join(themeRoot, "src", "views");
const assetsRoot = path.join(themeRoot, "assets");
const publicRoot = path.join(themeRoot, "public");
const assetPrefix = "/theme-preview";

const translations = {
  "sadady.header.home": "سدادي",
  "sadady.header.about": "عن الخدمة",
  "sadady.header.how_it_works": "طريقة العمل",
  "sadady.header.contact": "تواصل معنا",
  "sadady.header.policy": "الشروط والسياسة",
  "sadady.header.login": "حسابي في سلة",
  "sadady.header.login_hint": "يتم ربط الطلبات بحساب سلة الحالي.",
  "sadady.footer.back_home": "العودة للرئيسية",
  "sadady.session.eyebrow": "جلسة سلة",
  "sadady.session.disconnected": "لم يتم ربط جلسة سلة بعد",
  "sadady.session.subtitle": "المعاينة المحلية تعرض شكل الثيم، أما الربط الحقيقي يتم داخل سلة.",
  "sadady.session.name": "الاسم",
  "sadady.session.mobile": "الجوال",
  "sadady.session.id": "Salla ID",
};

const pages = [
  ["index.twig", "index.html"],
  ["tracking.twig", "tracking.html"],
  ["thank-you.twig", "thank-you.html"],
  ["customer/profile.twig", "customer/profile.html"],
  ["customer/notifications.twig", "customer/notifications.html"],
  ["customer/orders/index.twig", "customer/orders/index.html"],
  ["customer/orders/single.twig", "customer/orders/single.html"],
];

const routeAliases = [
  ["tracking.html", "tracking/index.html"],
  ["thank-you.html", "thank-you/index.html"],
  ["customer/profile.html", "customer/profile/index.html"],
  ["customer/notifications.html", "customer/notifications/index.html"],
  ["customer/orders/single.html", "customer/orders/single/index.html"],
];

function readView(viewPath) {
  const fullPath = path.join(viewsRoot, viewPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing Twig view: ${viewPath}`);
  }
  return BunReadText(fullPath);
}

function BunReadText(fullPath) {
  return globalThis.Bun
    ? Bun.file(fullPath).text()
    : import("node:fs").then(({ readFileSync }) => readFileSync(fullPath, "utf8"));
}

async function loadView(viewPath) {
  return await readView(viewPath);
}

function copyDirectory(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    copyFileSync(sourcePath, targetPath);
  }
}

async function collectBlocks(template, blocks = {}) {
  const extendMatch = template.match(/{%\s*extends\s+"([^"]+)"\s*%}/);
  const blockRegex = /{%\s*block\s+([a-zA-Z0-9_]+)\s*%}([\s\S]*?){%\s*endblock\s*%}/g;
  let match;

  while ((match = blockRegex.exec(template))) {
    blocks[match[1]] ??= match[2];
  }

  if (!extendMatch) {
    return { template, blocks };
  }

  return collectBlocks(await loadView(extendMatch[1]), blocks);
}

function extractOwnBlocks(template) {
  const blocks = {};
  const blockRegex = /{%\s*block\s+([a-zA-Z0-9_]+)\s*%}([\s\S]*?){%\s*endblock\s*%}/g;
  let match;

  while ((match = blockRegex.exec(template))) {
    blocks[match[1]] = match[2];
  }

  return blocks;
}

async function expandIncludes(template) {
  const includeRegex = /{%\s*include\s+"([^"]+)"\s*%}/g;
  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = includeRegex.exec(template))) {
    result += template.slice(lastIndex, match.index);
    result += await expandIncludes(await loadView(match[1]));
    lastIndex = includeRegex.lastIndex;
  }

  result += template.slice(lastIndex);
  return result;
}

function applyBlocks(template, blocks) {
  let output = template;
  let previous = "";

  while (output !== previous) {
    previous = output;
    output = output.replace(/{%\s*block\s+([a-zA-Z0-9_]+)\s*%}([\s\S]*?){%\s*endblock\s*%}/g, (_all, name, fallback) => {
      return blocks[name] ?? fallback;
    });
  }

  return output;
}

function normalizeTwig(template) {
  return template
    .replace(/{%\s*hook\s+[^%]+%}/g, "")
    .replace(/{%\s*set\s+[^%]+%}/g, "")
    .replace(/{{\s*'([^']+)'\s*\|\s*asset\s*}}/g, `${assetPrefix}/$1`)
    .replace(/{{\s*theme\.settings\.get\('api_base_url'\)[^}]*}}/g, "http://127.0.0.1:4010")
    .replace(/{{\s*theme\.settings\.get\('support_email'\)[^}]*}}/g, "support@sadady.com")
    .replace(/{{\s*trans\('([^']+)'\)\s*}}/g, (_all, key) => translations[key] ?? key)
    .replace(/{%\s*if[\s\S]*?%}/g, "")
    .replace(/{%\s*else\s*%}/g, "")
    .replace(/{%\s*endif\s*%}/g, "")
    .replace(/{{\s*[^}]+\s*}}/g, "")
    .replace(/{%\s*[^%]+\s*%}/g, "");
}

async function renderPage(source, target) {
  const pageTemplate = await loadView(`pages/${source}`);
  const pageBlocks = extractOwnBlocks(pageTemplate);
  const usesLandingLayout = /{%\s*extends\s+"layouts\/landing\.twig"\s*%}/.test(pageTemplate);
  const { template, blocks } = usesLandingLayout
    ? {
        template: await loadView("layouts/master.twig"),
        blocks: {
          title: pageBlocks.title,
          styles: pageBlocks.styles,
          scripts: pageBlocks.scripts,
          content: `
  <div class="container">
    {% include "components/sadady/layout/header.twig" %}
    {% include "components/sadady/layout/session-strip.twig" %}
    ${pageBlocks.landing_content ?? ""}
    {% include "components/sadady/layout/footer.twig" %}
  </div>
  {% include "components/sadady/journey/summary-modal.twig" %}
`,
        },
      }
    : await collectBlocks(pageTemplate);
  const withBlocks = applyBlocks(template, blocks);
  const withIncludes = await expandIncludes(withBlocks);
  const html = normalizeTwig(withIncludes).replace(
    "</head>",
    '  <script>window.SADADY_API_BASE="http://127.0.0.1:4010";window.sadadyThemeConfig={api_base_url:"http://127.0.0.1:4010"};window.SADADY_LOCAL_THEME_PREVIEW=true;</script>\n</head>',
  ).replace(
    '<body id="top" class="sadady-theme ">',
    '<body id="top" class="sadady-theme "><div style="position:sticky;top:0;z-index:9999;background:#0f172a;color:#fff;padding:10px 18px;text-align:center;font:600 14px \'Vazirmatn\',\'Segoe UI\',Tahoma,Arial,sans-serif">معاينة محلية للثيم: زر الدخول ينشئ جلسة تجريبية فقط. الدخول الحقيقي يتم داخل Salla Theme Preview.</div>',
  );

  const outputPath = path.join(publicRoot, target);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, "utf8");
}

async function main() {
  mkdirSync(publicRoot, { recursive: true });

  for (const entry of readdirSync(publicRoot)) {
    if (entry === ".gitkeep") continue;
    rmSync(path.join(publicRoot, entry), { recursive: true, force: true });
  }

  for (const dir of ["css", "js", "images"]) {
    const source = path.join(assetsRoot, dir);
    if (existsSync(source) && statSync(source).isDirectory()) {
      copyDirectory(source, path.join(publicRoot, dir));
    }
  }

  for (const [source, target] of pages) {
    await renderPage(source, target);
  }

  for (const [source, target] of routeAliases) {
    const sourcePath = path.join(publicRoot, source);
    const targetPath = path.join(publicRoot, target);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }

  console.log(`Rendered Sadady local theme preview in ${publicRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
