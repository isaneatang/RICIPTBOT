// Reproduce crash with seeded localStorage metadata (what a minted device looks like).
import { chromium } from 'playwright-core';

const BASE = 'https://riciptbot.vercel.app';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.stack || err.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`); });

const meta = {
  deviceType: 'smartphone',
  manufacturer: 'Pixel',
  model: 'Pixel 8 Pro',
  purchaseDate: '2026-05-12',
  retailer: 'Google Store',
  price: '1499.99',
  currency: 'USD',
  warrantyMonths: 24,
};

// Seed before app boots.
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((m) => {
  localStorage.setItem('ricipt:meta:1', JSON.stringify(m));
  localStorage.setItem('ricipt:meta:2', JSON.stringify(m));
  localStorage.setItem('ricipt:recent', JSON.stringify(['2', '1']));
}, meta);

for (const path of ['/passport/1', '/passport/2', '/passes', '/create']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3500);
  const body = await page.evaluate(() => document.body.innerText).catch(() => '<eval failed>');
  const hasContent = body.replace(/\s+/g, ' ').trim().length > 60;
  console.log(`\n=== ${path} ===  content=${hasContent}  len=${body.length}`);
  console.log(body.slice(0, 200).replace(/\n+/g, ' | '));
  await page.screenshot({ path: `/tmp/opencode/seed-${path.replace(/\//g, '_')}.png` });
}

console.log('\n--- errors ---');
errors.forEach((e) => console.log(e.slice(0, 500)));
await browser.close();
console.log('\nDone.');