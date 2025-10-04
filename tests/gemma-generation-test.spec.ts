import { test, expect } from '@playwright/test';

test('Full Gemma Generation Test with Visual Verification', async ({ page }) => {
  const consoleMessages: string[] = [];
  const variations: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);

    // Log important messages
    if (
      msg.type() === 'error' ||
      text.includes('Progress:') ||
      text.includes('Variation') ||
      text.includes('Generated') ||
      text.includes('Ready') ||
      text.includes('Model loaded')
    ) {
      console.log(`Browser: ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(`Page Error: ${error.message}`);
  });

  console.log('\n🔍 FULL GEMMA GENERATION TEST');
  console.log('='.repeat(70));

  // Navigate to page
  console.log('\n📍 Step 1: Navigate to page');
  await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/gemma-integration-example.html', {
    waitUntil: 'domcontentloaded'
  });
  await page.screenshot({ path: 'test-results/gen-01-loaded.png', fullPage: true });
  console.log('✅ Page loaded - screenshot saved');

  // Wait for model initialization
  console.log('\n📍 Step 2: Wait for model initialization');
  const statusEl = page.locator('#status');
  await statusEl.waitFor({ state: 'visible', timeout: 10000 });

  let isReady = false;
  let lastProgress = -1;
  const startTime = Date.now();

  for (let i = 0; i < 180; i++) {  // 9 minutes max
    const statusText = await statusEl.textContent();

    // Extract progress
    const progressMatch = statusText?.match(/(\d+)%/);
    const currentProgress = progressMatch ? parseInt(progressMatch[1]) : -1;

    // Log progress changes
    if (currentProgress !== lastProgress && currentProgress >= 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  [${elapsed}s] Progress: ${currentProgress}%`);
      lastProgress = currentProgress;

      // Screenshot at key milestones
      if (currentProgress === 50 || currentProgress === 100) {
        await page.screenshot({
          path: `test-results/gen-02-loading-${currentProgress}.png`,
          fullPage: true
        });
        console.log(`  📸 Screenshot at ${currentProgress}%`);
      }
    }

    // Check if ready
    if (statusText?.includes('Model loaded') || statusText?.includes('Ready')) {
      isReady = true;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ MODEL READY in ${elapsed}s`);
      await page.screenshot({ path: 'test-results/gen-03-ready.png', fullPage: true });
      console.log('📸 Screenshot saved: gen-03-ready.png');
      break;
    }

    // Check for errors
    if (statusText?.includes('Error') || errors.length > 0) {
      console.error(`\n❌ ERROR: ${statusText}`);
      await page.screenshot({ path: 'test-results/gen-ERROR.png', fullPage: true });
      throw new Error(`Initialization failed: ${statusText}`);
    }

    await page.waitForTimeout(3000);
  }

  expect(isReady).toBe(true);

  // Fill in generation request
  console.log('\n📍 Step 3: Set up generation request');
  const testPrompt = 'The benefits of regular exercise include';

  // Clear and fill inputs
  await page.locator('#prompt').clear();
  await page.locator('#prompt').fill(testPrompt);

  await page.locator('#count').clear();
  await page.locator('#count').fill('3');

  // Verify inputs
  const actualPrompt = await page.locator('#prompt').inputValue();
  const actualCount = await page.locator('#count').inputValue();

  console.log(`  Prompt set to: "${actualPrompt}"`);
  console.log(`  Count set to: ${actualCount}`);

  await page.screenshot({ path: 'test-results/gen-04-before-generate.png', fullPage: true });
  console.log('  📸 Screenshot before generation');

  // Click generate button
  console.log('\n📍 Step 4: Generate variations');
  const generateBtn = page.locator('#generateBtn');
  await generateBtn.click();
  console.log('  🚀 Generate button clicked');

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/gen-05-generating.png', fullPage: true });
  console.log('  📸 Screenshot during generation');

  // Wait for variations
  console.log('\n📍 Step 5: Wait for variations');
  const firstVariation = page.locator('.variation').first();

  try {
    await firstVariation.waitFor({ state: 'visible', timeout: 180000 });
    console.log('  ✅ First variation appeared!');

    // Wait for all variations to complete
    console.log('  ⏳ Waiting for all variations...');
    await page.waitForTimeout(15000);

    // Count and extract variations
    const variationCount = await page.locator('.variation').count();
    console.log(`\n📊 Generated ${variationCount} variation(s):`);
    console.log('='.repeat(70));

    for (let i = 0; i < variationCount; i++) {
      const varNumber = await page.locator('.variation').nth(i).locator('.variation-number').textContent();
      const varText = await page.locator('.variation').nth(i).locator('.variation-text').textContent();
      variations.push(varText || '');

      console.log(`\n${varNumber}`);
      console.log(`Text: ${varText}`);
      console.log(`Words: ${varText?.split(' ').length || 0}`);

      // Scroll to and highlight this variation
      await page.locator('.variation').nth(i).evaluate(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `test-results/gen-06-variation-${i + 1}.png`,
        fullPage: true
      });
      console.log(`📸 Screenshot saved: gen-06-variation-${i + 1}.png`);
    }

    console.log('\n' + '='.repeat(70));

    // Final screenshot with all variations
    await page.screenshot({ path: 'test-results/gen-07-all-variations.png', fullPage: true });
    console.log('\n📸 Final screenshot saved: gen-07-all-variations.png');

    // Verify count
    expect(variationCount).toBeGreaterThanOrEqual(2);
    expect(variationCount).toBeLessThanOrEqual(10);
    console.log(`\n✅ SUCCESS: ${variationCount} variations generated correctly`);

    // Quality checks
    console.log('\n📊 Quality Checks:');
    variations.forEach((v, i) => {
      const words = v.split(' ').length;
      const chars = v.length;
      console.log(`  Variation ${i + 1}: ${words} words, ${chars} chars`);
      expect(words).toBeGreaterThan(0);
      expect(chars).toBeGreaterThan(0);
    });

    // Check diversity
    console.log('\n🔍 Diversity Check:');
    const uniqueVariations = new Set(variations);
    console.log(`  Unique variations: ${uniqueVariations.size}/${variationCount}`);
    if (uniqueVariations.size === variationCount) {
      console.log('  ✅ All variations are unique');
    } else {
      console.log('  ⚠️  Some variations are duplicates');
    }

    // Verify diversity (at least 80% unique)
    const diversityRatio = uniqueVariations.size / variationCount;
    expect(diversityRatio).toBeGreaterThanOrEqual(0.8);

    // Check button state
    const btnText = await generateBtn.textContent();
    await expect(generateBtn).toBeEnabled();
    console.log(`\n✅ Button re-enabled: "${btnText?.trim()}"`);

    // Check final status
    const finalStatus = await statusEl.textContent();
    console.log(`✅ Final status: "${finalStatus}"`);

  } catch (error) {
    console.error('\n❌ GENERATION FAILED');
    await page.screenshot({ path: 'test-results/gen-ERROR-failed.png', fullPage: true });
    console.error('📸 Error screenshot saved');

    // Print recent console messages
    console.log('\n📋 Recent Console Messages (last 30):');
    consoleMessages.slice(-30).forEach(msg => console.log(`  ${msg}`));

    throw error;
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('🎉 TEST COMPLETED SUCCESSFULLY');
  console.log('='.repeat(70));
  console.log(`Total variations generated: ${variations.length}`);
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Total errors: ${errors.length}`);
  console.log(`Screenshots saved: 7+`);
  console.log('='.repeat(70));
});
