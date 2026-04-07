#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY || ACCESS_KEY === 'YOUR_ACCESS_KEY_HERE') {
  console.error('Error: UNSPLASH_ACCESS_KEY が設定されていません。.env を確認してください。');
  process.exit(1);
}

const keyword = process.argv[2];
const filename = process.argv[3]; // e.g. 2026-04-07.jpg
const companyDomain = process.argv[4]; // e.g. printify.com (optional)

if (!keyword) {
  console.error('Usage: node scripts/fetch-image.mjs <keyword> [filename] [companyDomain]');
  process.exit(1);
}

const date = filename || `${new Date().toISOString().slice(0, 10)}.jpg`;
const outDir = path.join(ROOT, 'src', 'assets', 'news');
const outPath = path.join(outDir, date.endsWith('.jpg') ? date : `${date}.jpg`);

// Try Clearbit logo first if company domain provided
async function tryClearbitLogo(domain) {
  if (!domain) return null;
  const url = `https://logo.clearbit.com/${domain}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) return null; // too small, likely a 404 page
    fs.mkdirSync(outDir, { recursive: true });
    const logoPath = outPath.replace('.jpg', '-logo.png');
    fs.writeFileSync(logoPath, buffer);
    return {
      filePath: path.relative(ROOT, logoPath).replace(/\\/g, '/'),
      photographer: '',
      photographerUrl: '',
    };
  } catch {
    return null;
  }
}

async function fetchFromUnsplash() {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (!res.ok) {
    console.error(`Unsplash API error: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    console.error(`No images found for keyword: ${keyword}`);
    return null;
  }

  const photo = data.results[0];
  const imageUrl = photo.urls.regular;
  const photographer = photo.user.name;
  const photographerUrl = photo.user.links.html;

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error(`Image download failed: ${imgRes.status}`);
    return null;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  fs.writeFileSync(outPath, buffer);

  return {
    filePath: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    photographer,
    photographerUrl: `${photographerUrl}?utm_source=printonfocus&utm_medium=referral`,
  };
}

function createPlaceholder() {
  // Create a minimal 1x1 gray pixel JPEG as placeholder
  fs.mkdirSync(outDir, { recursive: true });
  // Simple SVG placeholder saved as file
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#ccc"/><text x="400" y="210" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#888">No Image Available</text></svg>`;
  const placeholderPath = outPath.replace('.jpg', '.svg');
  fs.writeFileSync(placeholderPath, svg);
  return {
    filePath: path.relative(ROOT, placeholderPath).replace(/\\/g, '/'),
    photographer: '',
    photographerUrl: '',
  };
}

// 1. Try Clearbit → 2. Try Unsplash → 3. Placeholder
let result = await tryClearbitLogo(companyDomain);
if (!result) result = await fetchFromUnsplash();
if (!result) result = createPlaceholder();

console.log(JSON.stringify(result));
export default result;
