import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themeRoot = path.resolve(__dirname, '..');
const assetsRoot = path.join(themeRoot, 'assets');
const publicRoot = path.join(themeRoot, 'public');

const assetDirs = ['css', 'js', 'images'];

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

mkdirSync(publicRoot, { recursive: true });

for (const entry of readdirSync(publicRoot)) {
  if (entry === '.gitkeep') {
    continue;
  }

  rmSync(path.join(publicRoot, entry), { recursive: true, force: true });
}

for (const dir of assetDirs) {
  const source = path.join(assetsRoot, dir);
  const target = path.join(publicRoot, dir);

  if (!existsSync(source) || !statSync(source).isDirectory()) {
    continue;
  }

  copyDirectory(source, target);
}

writeFileSync(
  path.join(publicRoot, 'index.html'),
  [
    '<!doctype html>',
    '<html lang="ar" dir="rtl">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>Sadady Preview Assets</title>',
    '  <style>body{font-family:"Vazirmatn","Segoe UI",Tahoma,Arial,sans-serif;padding:24px}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>',
    '</head>',
    '<body>',
    '  <h1>Sadady Preview Assets Ready</h1>',
    '  <p>هذا المسار مخصص لخدمة أصول المعاينة المحلية الخاصة بثيم سدادي.</p>',
    '  <p>جرّب المسارات مثل <code>/css/sadady-home.css</code> و <code>/js/sadady/theme-api.js</code>.</p>',
    '</body>',
    '</html>',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Prepared Sadady preview assets in ${publicRoot}`);
