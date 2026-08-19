// Test remaining production routes.
import { chromium } from 'playwright-core';

const BASE = 'https://riciptbot.vercel.app';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.stack || err.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`); });

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('ricipt:meta:2', JSON.stringify({ deviceType: 'smartphone', manufacturer: 'Pixel', model: '8 Pro', purchaseDate: '2026-05-12', retailer: 'Google', price: '1499.99', currency: 'USD', warranty: '1 Year' }));
});

for (const path of ['/verify?tokenId=2', '/passport/2?transfer=1', '/', '/create']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3500);
  const body = await page.evaluate(() => document.body.innerText).catch(() => '<eval failed>');
  const hasContent = body.replace(/\s+/g, ' ').trim().length > 60;
  console.log(`=== ${path} ===  content=${hasContent}  len=${body.length}`);
  console.log('   ', body.slice(0, 160).replace(/\n+/g, ' | '));
}

console.log('\n--- errors ---');
errors.forEach((e) => console.log(e.slice(0, 500)));
await browser.close();
console.log('Done.');