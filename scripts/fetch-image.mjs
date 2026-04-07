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

if (!keyword) {
  console.error('Usage: node scripts/fetch-image.mjs <keyword> [filename]');
  process.exit(1);
}

const date = filename || `${new Date().toISOString().slice(0, 10)}.jpg`;
const outDir = path.join(ROOT, 'src', 'assets', 'news');
const outPath = path.join(outDir, date.endsWith('.jpg') ? date : `${date}.jpg`);

async function fetchImage() {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (!res.ok) {
    console.error(`Unsplash API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    console.error(`No images found for keyword: ${keyword}`);
    process.exit(1);
  }

  const photo = data.results[0];
  const imageUrl = photo.urls.regular;
  const photographer = photo.user.name;
  const photographerUrl = photo.user.links.html;

  // Download image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error(`Image download failed: ${imgRes.status}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  fs.writeFileSync(outPath, buffer);

  const result = {
    filePath: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    photographer,
    photographerUrl: `${photographerUrl}?utm_source=printonfocus&utm_medium=referral`,
  };

  console.log(JSON.stringify(result));
  return result;
}

const result = await fetchImage();
export default result;
