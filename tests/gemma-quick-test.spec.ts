import { test, expect } from '@playwright/test';

test('Quick Gemma Test: Check if cache issue is fixed', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(`Browser: ${text}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(`Page Error: ${error.message}`);
  });

  console.log('\n🔍 Quick Test: Browser Cache Fix Check');
  console.log('='.repeat(60));

  await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/gemma-integration-example.html');

  console.log('✅ Page loaded');

  // Wait for status element
  const statusEl = page.locator('#status');
  await statusEl.waitFor({ state: 'visible', timeout: 10000 });

  // Monitor for 30 seconds
  console.log('\n📊 Monitoring for 30 seconds...');
  for (let i = 0; i < 10; i++) {
    const statusText = await statusEl.textContent();
    console.log(`  ${i + 1}. Status: ${statusText}`);

    // Check for cache error
    const hasCacheError = errors.some(e => e.includes('Browser cache'));
    const hasCacheErrorInConsole = consoleMessages.some(m => m.includes('Browser cache'));

    if (hasCacheError || hasCacheErrorInConsole) {
      console.error('\n❌ CACHE ERROR STILL EXISTS!');
      console.log('\nErrors:', errors);
      throw new Error('Browser cache error detected');
    }

    if (statusText?.includes('Model loaded') || statusText?.includes('Ready')) {
      console.log('\n✅ MODEL LOADED SUCCESSFULLY - Cache fix worked!');
      break;
    }

    await page.waitForTimeout(3000);
  }

  console.log('\n📋 All Console Messages:');
  consoleMessages.forEach(msg => console.log(`  ${msg}`));

  console.log('\n📋 All Errors:');
  if (errors.length === 0) {
    console.log('  No errors detected! ✅');
  } else {
    errors.forEach(err => console.log(`  ${err}`));
  }
});
