#!/usr/bin/env node
/**
 * 記事のtagsからキーワードを生成し、Unsplash画像を取得してfrontmatterに追記する。
 *
 * Usage: node scripts/attach-image.mjs <markdown-file>
 * Example: node scripts/attach-image.mjs src/content/news/2026-04-07.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const mdFile = process.argv[2];
if (!mdFile) {
  console.error('Usage: node scripts/attach-image.mjs <markdown-file>');
  process.exit(1);
}

const fullPath = path.resolve(ROOT, mdFile);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

const content = fs.readFileSync(fullPath, 'utf-8');

// Check if image is already set
if (/^image:/m.test(content)) {
  console.log('Image already set, skipping.');
  process.exit(0);
}

// Parse frontmatter
const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (!fmMatch) {
  console.error('No frontmatter found.');
  process.exit(1);
}

const frontmatter = fmMatch[1];

// Extract tags
const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]*)\]/);
const tags = tagsMatch
  ? tagsMatch[1].match(/"([^"]*)"/g)?.map((t) => t.replace(/"/g, '')) || []
  : [];

// Build keyword: use first 2 tags + "print on demand"
const keyword = [...tags.slice(0, 2), 'print on demand'].join(' ');

// Derive filename from markdown filename
const baseName = path.basename(fullPath, '.md');
const imageFilename = `${baseName}.jpg`;

console.log(`Fetching image for: "${keyword}" -> ${imageFilename}`);

// Run fetch-image.mjs
const fetchScript = path.join(__dirname, 'fetch-image.mjs');
let result;
try {
  const output = execFileSync('node', [fetchScript, keyword, imageFilename], {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  result = JSON.parse(output.trim());
} catch (e) {
  console.error('Failed to fetch image.');
  process.exit(1);
}

// Insert image fields into frontmatter
const imageFields = [
  `image: "./${path.relative('src/content/news', result.filePath).replace(/\\/g, '/')}"`,
  `photographer: "${result.photographer}"`,
  `photographerUrl: "${result.photographerUrl}"`,
].join('\n');

const updated = content.replace(/^(---\n[\s\S]*?)(---)/,`$1${imageFields}\n$2`);

fs.writeFileSync(fullPath, updated, 'utf-8');
console.log(`Updated: ${mdFile}`);
console.log(`  image: ${result.filePath}`);
console.log(`  photographer: ${result.photographer}`);
