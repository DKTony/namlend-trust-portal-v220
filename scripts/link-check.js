#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : p;
  });
}

function generateReport() {
  const files = walk(docsDir).filter((f) => f.endsWith('.md'));
  // Match both image and normal links, capture the URL part
  const linkRe = /!\[[^\]]*\]\(([^)]+)\)|\[[^\]]*\]\(([^)]+)\)/g;
  const results = [];

  for (const file of files) {
    const dir = path.dirname(file);
    const content = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = linkRe.exec(content))) {
      let link = m[1] || m[2];
      link = (link || '').trim();
      if (
        !link ||
        link.startsWith('http://') ||
        link.startsWith('https://') ||
        link.startsWith('mailto:') ||
        link.startsWith('tel:') ||
        link.startsWith('#')
      )
        continue;

      const hashIndex = link.indexOf('#');
      if (hashIndex !== -1) link = link.slice(0, hashIndex);
      if (!link) continue;

      try {
        link = decodeURI(link);
      } catch {}

      let target;
      if (link.startsWith('/')) target = path.join(root, link.replace(/^\/+/, ''));
      else target = path.resolve(dir, link);

      if (!fs.existsSync(target)) {
        results.push({
          file: file.replace(root + '/', ''),
          link,
          resolved: target.replace(root + '/', ''),
        });
      }
    }
  }

  const lines = [];
  const now = new Date().toISOString();
  lines.push('# Link Integrity Report');
  lines.push('');
  lines.push(`Generated: ${now}`);
  lines.push(`Scanned files: ${files.length}`);
  lines.push(`Broken links found: ${results.length}`);
  lines.push('');
  if (results.length) {
    lines.push('## Broken Links');
    for (const r of results) {
      lines.push(`- File: ${r.file} → Link: ${r.link} (resolved: ${r.resolved})`);
    }
  } else {
    lines.push('No broken internal links found.');
  }

  const outPath = path.join(docsDir, 'qa', 'link-check-report.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}

try {
  const out = generateReport();
  console.log(`Wrote ${out}`);
  process.exit(0);
} catch (err) {
  console.error('Link check failed:', err);
  process.exit(1);
}
