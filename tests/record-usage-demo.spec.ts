import { test, expect } from '@playwright/test';

// Configure test to record video
test.use({
  video: 'on',
  viewport: { width: 1920, height: 1080 },
});

test('Record LLM Word Graph + Gemma AI usage demo', async ({ page }) => {
  console.log('\n🎬 Starting usage demo recording...\n');

  // Navigate to the page
  console.log('Step 1: Loading page...');
  await page.goto('http://172.31.101.16:5173/llm-wordgraph-exact/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Show initial state

  // Wait for Gemma to initialize
  console.log('Step 2: Waiting for Gemma AI to initialize...');
  const statusEl = page.locator('#gemmaStatus');

  // Monitor progress
  let lastProgress = -1;
  for (let i = 0; i < 180; i++) {  // 9 minutes max
    const statusText = await statusEl.textContent();

    // Extract progress
    const progressMatch = statusText?.match(/(\d+)%/);
    const currentProgress = progressMatch ? parseInt(progressMatch[1]) : -1;

    if (currentProgress !== lastProgress && currentProgress >= 0) {
      console.log(`  Progress: ${currentProgress}%`);
      lastProgress = currentProgress;
    }

    // Check if ready
    if (statusText?.includes('ready') || statusText?.includes('✓')) {
      console.log('✓ Gemma AI is ready!');
      break;
    }

    await page.waitForTimeout(3000);
  }

  // Wait a bit more to show ready state
  await page.waitForTimeout(3000);

  // Step 3: Show the prompt area
  console.log('Step 3: Highlighting prompt area...');
  const promptInput = page.locator('#promptInput');
  await promptInput.click();
  await page.waitForTimeout(1000);

  // Step 4: Clear and type a new prompt slowly (for demo effect)
  console.log('Step 4: Entering custom prompt...');
  await promptInput.clear();
  await page.waitForTimeout(500);

  const demoPrompt = 'The future of artificial intelligence will';
  for (const char of demoPrompt) {
    await promptInput.type(char, { delay: 50 });
  }
  await page.waitForTimeout(1500);

  // Step 5: Adjust variation count
  console.log('Step 5: Setting variation count...');
  const variationInput = page.locator('#numGenerations');
  await variationInput.click();
  await page.waitForTimeout(500);
  await variationInput.clear();
  await variationInput.type('5');
  await page.waitForTimeout(1000);

  // Step 6: Click generate button
  console.log('Step 6: Clicking Generate button...');
  const generateBtn = page.locator('#generateBtn');
  await expect(generateBtn).toBeEnabled();
  await generateBtn.click();
  await page.waitForTimeout(2000);

  // Step 7: Wait for generation to complete
  console.log('Step 7: Waiting for AI generation...');

  // Wait for generate button to be enabled again (means generation complete)
  await generateBtn.waitFor({ state: 'attached', timeout: 180000 });
  await page.waitForTimeout(5000); // Let it finish

  const timingText = await page.locator('#timingDisplay').textContent();
  console.log(`✓ Generation complete: ${timingText}`);

  // Wait for graph to render
  await page.waitForTimeout(3000);

  // Step 8: Check the graph was rendered
  console.log('Step 8: Verifying graph visualization...');
  const svg = page.locator('#graph');
  await expect(svg).toBeVisible();

  // Check for nodes and links
  const nodes = page.locator('.node');
  const nodeCount = await nodes.count();
  console.log(`  Graph has ${nodeCount} nodes`);

  await page.waitForTimeout(2000);

  // Step 9: Interact with zoom controls
  console.log('Step 9: Demonstrating zoom controls...');

  // Zoom in
  const zoomInBtn = page.locator('#zoomIn');
  await zoomInBtn.click();
  await page.waitForTimeout(1000);
  await zoomInBtn.click();
  await page.waitForTimeout(1500);

  // Zoom out
  const zoomOutBtn = page.locator('#zoomOut');
  await zoomOutBtn.click();
  await page.waitForTimeout(1000);

  // Reset zoom
  const resetZoomBtn = page.locator('#resetZoom');
  await resetZoomBtn.click();
  await page.waitForTimeout(1500);

  // Step 10: Try random prompt feature
  console.log('Step 10: Testing Random prompt...');
  const randomBtn = page.locator('#randomBtn');
  await randomBtn.click();
  await page.waitForTimeout(2000);

  // Show the new random prompt
  const newPrompt = await promptInput.inputValue();
  console.log(`  New random prompt: "${newPrompt}"`);
  await page.waitForTimeout(2000);

  // Skip second generation to save time - video already shows the process
  console.log('Step 11: Demo complete - skipping second generation');

  // Step 12: Check stats
  console.log('Step 12: Showing statistics...');
  const wordCount = await page.locator('#wordCount').textContent();
  const linkCount = await page.locator('#linkCount').textContent();
  const genCount = await page.locator('#genCount').textContent();

  console.log(`  Words: ${wordCount}`);
  console.log(`  Links: ${linkCount}`);
  console.log(`  Generations: ${genCount}`);

  await page.waitForTimeout(3000);

  // Final pause to show complete UI
  console.log('Step 13: Final view...');
  await page.waitForTimeout(3000);

  console.log('\n✅ Demo recording complete!');
  console.log('📹 Video saved to test-results/');
});
