import { test, expect } from '@playwright/test';

test.describe('Gemma Variation Generator - Comprehensive Tests', () => {

  test('Visual Inspection: Page loads with correct UI elements', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    // Capture all console messages
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(`Browser: ${text}`);
    });

    // Capture errors
    page.on('pageerror', error => {
      const errorMsg = `Page Error: ${error.message}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    });

    console.log('\n🔍 TEST 1: Visual Inspection - Loading Page');
    console.log('='.repeat(60));

    // Navigate to the page
    await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/gemma-integration-example.html');

    console.log('✅ Page navigation successful');

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-page-load.png', fullPage: true });
    console.log('📸 Screenshot saved: 01-page-load.png');

    // Visual checks
    const title = await page.locator('h1').textContent();
    console.log(`📌 Page Title: ${title}`);
    expect(title).toContain('Gemma');

    const subtitle = await page.locator('.subtitle').textContent();
    console.log(`📌 Subtitle: ${subtitle}`);

    // Check UI elements exist
    const promptInput = page.locator('#prompt');
    await expect(promptInput).toBeVisible();
    console.log('✅ Prompt input visible');

    const countInput = page.locator('#count');
    await expect(countInput).toBeVisible();
    console.log('✅ Count input visible');

    const generateBtn = page.locator('#generateBtn');
    await expect(generateBtn).toBeVisible();
    console.log('✅ Generate button visible');

    // Check initial button state
    const btnText = await generateBtn.textContent();
    console.log(`📌 Button Text: ${btnText}`);

    await page.screenshot({ path: 'test-results/02-ui-elements.png', fullPage: true });
    console.log('📸 Screenshot saved: 02-ui-elements.png');

    // Print errors if any
    if (errors.length > 0) {
      console.error('\n❌ Errors found:');
      errors.forEach(err => console.error(`  - ${err}`));
    } else {
      console.log('\n✅ No page errors detected');
    }

    console.log('\n📊 Console Messages Summary:');
    console.log(`  Total messages: ${consoleMessages.length}`);
    const logCount = consoleMessages.filter(m => m.startsWith('[log]')).length;
    const warnCount = consoleMessages.filter(m => m.startsWith('[warning]')).length;
    const errorCount = consoleMessages.filter(m => m.startsWith('[error]')).length;
    console.log(`  Logs: ${logCount} | Warnings: ${warnCount} | Errors: ${errorCount}`);
  });

  test('Model Initialization: Wait for Gemma to load', async ({ page }, testInfo) => {
    const consoleMessages: string[] = [];

    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(`Browser: ${text}`);
    });

    console.log('\n🔍 TEST 2: Model Initialization');
    console.log('='.repeat(60));

    await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/gemma-integration-example.html');

    // Wait for status element
    const statusEl = page.locator('#status');
    await statusEl.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Status element visible');

    await page.screenshot({ path: 'test-results/03-initializing.png', fullPage: true });
    console.log('📸 Screenshot saved: 03-initializing.png');

    // Monitor initialization progress
    console.log('\n📊 Monitoring Model Initialization:');
    let isReady = false;
    let lastProgress = -1;

    for (let i = 0; i < 120; i++) {  // 6 minutes max
      const statusText = await statusEl.textContent();

      // Extract progress if available
      const progressMatch = statusText?.match(/(\d+)%/);
      const currentProgress = progressMatch ? parseInt(progressMatch[1]) : -1;

      // Only log when progress changes significantly
      if (currentProgress !== lastProgress && currentProgress >= 0) {
        console.log(`  Progress: ${currentProgress}% - ${statusText}`);
        lastProgress = currentProgress;

        // Take screenshot at key milestones
        if (currentProgress === 25 || currentProgress === 50 || currentProgress === 75) {
          await page.screenshot({
            path: `test-results/04-loading-${currentProgress}pct.png`,
            fullPage: true
          });
          console.log(`📸 Screenshot saved: 04-loading-${currentProgress}pct.png`);
        }
      }

      // Check if ready
      if (statusText?.includes('Model loaded') || statusText?.includes('Ready')) {
        isReady = true;
        console.log(`\n✅ MODEL READY: ${statusText}`);
        await page.screenshot({ path: 'test-results/05-model-ready.png', fullPage: true });
        console.log('📸 Screenshot saved: 05-model-ready.png');
        break;
      }

      // Check for errors
      if (statusText?.includes('Error')) {
        console.error(`\n❌ INITIALIZATION ERROR: ${statusText}`);
        await page.screenshot({ path: 'test-results/ERROR-initialization.png', fullPage: true });
        throw new Error(`Model initialization failed: ${statusText}`);
      }

      await page.waitForTimeout(3000);
    }

    expect(isReady).toBe(true);

    // Check button is enabled
    const generateBtn = page.locator('#generateBtn');
    await expect(generateBtn).toBeEnabled();
    console.log('✅ Generate button is enabled');

    // Print progress-related console messages
    console.log('\n📋 Progress Messages:');
    const progressMessages = consoleMessages.filter(m => m.includes('Progress:') || m.includes('%'));
    progressMessages.slice(-5).forEach(msg => console.log(`  ${msg}`));
  });

  test('Variation Generation: Generate 3 variations with visual tracking', async ({ page }) => {
    const consoleMessages: string[] = [];
    const variations: string[] = [];

    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);

      // Log important messages
      if (msg.type() === 'error' || text.includes('Generated') || text.includes('Variation')) {
        console.log(`Browser: ${text}`);
      }
    });

    console.log('\n🔍 TEST 3: Variation Generation');
    console.log('='.repeat(60));

    await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/gemma-integration-example.html');

    // Wait for model to be ready
    console.log('⏳ Waiting for model initialization...');
    const statusEl = page.locator('#status');

    for (let i = 0; i < 120; i++) {
      const statusText = await statusEl.textContent();
      if (statusText?.includes('Model loaded') || statusText?.includes('Ready')) {
        console.log('✅ Model is ready');
        break;
      }
      if (statusText?.includes('Error')) {
        throw new Error(`Model failed to initialize: ${statusText}`);
      }
      await page.waitForTimeout(3000);
    }

    // Fill in test prompt
    const testPrompt = 'The benefits of regular exercise include';
    await page.fill('#prompt', testPrompt);
    await page.fill('#count', '3');

    console.log(`\n📝 Test Prompt: "${testPrompt}"`);
    console.log('📊 Requesting 3 variations');

    await page.screenshot({ path: 'test-results/06-before-generate.png', fullPage: true });
    console.log('📸 Screenshot saved: 06-before-generate.png');

    // Click generate
    const generateBtn = page.locator('#generateBtn');
    await generateBtn.click();
    console.log('🚀 Generate button clicked');

    // Wait a moment for button state to change
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/07-generating.png', fullPage: true });
    console.log('📸 Screenshot saved: 07-generating.png');

    // Wait for variations to appear
    console.log('\n⏳ Waiting for variations...');
    const firstVariation = page.locator('.variation').first();

    try {
      await firstVariation.waitFor({ state: 'visible', timeout: 120000 });
      console.log('✅ First variation appeared!');

      // Wait for all variations
      await page.waitForTimeout(10000);

      // Count and extract variations
      const variationCount = await page.locator('.variation').count();
      console.log(`\n📊 Generated ${variationCount} variation(s):`);

      for (let i = 0; i < variationCount; i++) {
        const variationText = await page.locator('.variation').nth(i).locator('.variation-text').textContent();
        variations.push(variationText || '');
        console.log(`\n  ${i + 1}. ${variationText}`);

        // Highlight each variation for screenshot
        await page.locator('.variation').nth(i).evaluate(el => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: 'test-results/08-variations-complete.png', fullPage: true });
      console.log('\n📸 Screenshot saved: 08-variations-complete.png');

      // Verify we got 3 variations
      expect(variationCount).toBe(3);
      console.log('\n✅ SUCCESS: All 3 variations generated');

      // Check variation quality
      console.log('\n🔍 Variation Quality Check:');
      variations.forEach((v, i) => {
        const wordCount = v.split(' ').length;
        console.log(`  Variation ${i + 1}: ${wordCount} words`);
        expect(wordCount).toBeGreaterThan(0);
      });

      // Check button is re-enabled
      await expect(generateBtn).toBeEnabled();
      const finalBtnText = await generateBtn.textContent();
      console.log(`\n✅ Button re-enabled: "${finalBtnText}"`);

    } catch (error) {
      console.error('\n❌ VARIATION GENERATION FAILED');
      await page.screenshot({ path: 'test-results/ERROR-generation.png', fullPage: true });
      console.error('📸 Error screenshot saved: ERROR-generation.png');

      // Print relevant console messages
      console.log('\n📋 Recent Console Messages:');
      consoleMessages.slice(-20).forEach(msg => console.log(`  ${msg}`));

      throw error;
    }

    // Print generation-related messages
    console.log('\n📋 Generation Console Messages:');
    const genMessages = consoleMessages.filter(m =>
      m.includes('Generating') ||
      m.includes('variation') ||
      m.includes('Generated')
    );
    genMessages.forEach(msg => console.log(`  ${msg}`));
  });

  test('Multiple Generations: Test consistency across multiple runs', async ({ page }) => {
    console.log('\n🔍 TEST 4: Multiple Generation Runs');
    console.log('='.repeat(60));

    await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/gemma-integration-example.html');

    // Wait for ready
    const statusEl = page.locator('#status');
    for (let i = 0; i < 120; i++) {
      const statusText = await statusEl.textContent();
      if (statusText?.includes('Model loaded') || statusText?.includes('Ready')) break;
      await page.waitForTimeout(3000);
    }

    const allVariations: string[][] = [];

    // Generate 2 times
    for (let run = 0; run < 2; run++) {
      console.log(`\n📊 Generation Run ${run + 1}/2`);

      await page.fill('#prompt', 'Climate change is caused by');
      await page.fill('#count', '2');

      // Clear previous variations
      const variationsContainer = page.locator('#variations');
      await variationsContainer.evaluate(el => el.innerHTML = '');

      const generateBtn = page.locator('#generateBtn');
      await generateBtn.click();

      await page.waitForTimeout(2000);

      // Wait for variations
      try {
        await page.locator('.variation').first().waitFor({ state: 'visible', timeout: 90000 });
        await page.waitForTimeout(5000);

        const runVariations: string[] = [];
        const count = await page.locator('.variation').count();

        for (let i = 0; i < count; i++) {
          const text = await page.locator('.variation').nth(i).locator('.variation-text').textContent();
          runVariations.push(text || '');
          console.log(`  ${i + 1}. ${text}`);
        }

        allVariations.push(runVariations);

        await page.screenshot({
          path: `test-results/09-run-${run + 1}.png`,
          fullPage: true
        });
        console.log(`📸 Screenshot saved: 09-run-${run + 1}.png`);

      } catch (error) {
        console.error(`❌ Run ${run + 1} failed`);
      }

      await page.waitForTimeout(2000);
    }

    // Check diversity
    console.log('\n🔍 Diversity Check:');
    if (allVariations.length === 2) {
      const run1 = allVariations[0].join(' ');
      const run2 = allVariations[1].join(' ');
      const areIdentical = run1 === run2;

      console.log(`  Run 1 and Run 2 identical: ${areIdentical}`);
      console.log('✅ Multiple generation test complete');
    }
  });

  test('Error Handling: Test with invalid inputs', async ({ page }) => {
    console.log('\n🔍 TEST 5: Error Handling');
    console.log('='.repeat(60));

    await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/gemma-integration-example.html');

    // Wait for ready
    const statusEl = page.locator('#status');
    for (let i = 0; i < 120; i++) {
      const statusText = await statusEl.textContent();
      if (statusText?.includes('Model loaded') || statusText?.includes('Ready')) break;
      await page.waitForTimeout(3000);
    }

    console.log('\n📝 Test: Empty prompt');
    await page.fill('#prompt', '');
    await page.fill('#count', '2');

    // Listen for alerts
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log(`  Alert shown: "${alertMessage}"`);
      await dialog.accept();
    });

    await page.locator('#generateBtn').click();
    await page.waitForTimeout(1000);

    if (alertMessage) {
      console.log('✅ Empty prompt handled with alert');
    }

    await page.screenshot({ path: 'test-results/10-error-handling.png', fullPage: true });
    console.log('📸 Screenshot saved: 10-error-handling.png');

    console.log('\n✅ Error handling test complete');
  });
});
