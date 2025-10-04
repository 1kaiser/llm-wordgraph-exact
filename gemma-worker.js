/**
 * 🤖 Gemma Web Worker for Text Variation Generation
 * Runs Gemma 270M model in background thread
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure environment
env.allowLocalModels = false;

// Disable browser cache for compatibility (use remote models with CDN)
env.useBrowserCache = false;

// Use remote models from Hugging Face CDN
env.remoteURL = 'https://huggingface.co/';
env.remotePathTemplate = '{model}/resolve/{revision}/';

// Disable multithreading for WASM backend (bug workaround)
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

// Global model instance
let generator = null;
let isInitialized = false;

console.log('🚀 Gemma worker started');

/**
 * Initialize Gemma 270M model
 */
async function initializeModel() {
  if (isInitialized) {
    console.log('⚠️ Model already initialized');
    return;
  }

  try {
    self.postMessage({
      type: 'progress',
      data: { progress: 5, message: 'Loading Transformers.js...' }
    });

    // Auto-detect WebGPU/WASM
    const hasWebGPU = 'gpu' in navigator;
    console.log(hasWebGPU ? '🔧 WebGPU may be available' : '🔧 Using WASM backend');

    const deviceConfig = {
      dtype: 'fp32'
      // Let transformers.js auto-select backend
    };

    // Load Gemma 270M with progress tracking
    generator = await pipeline(
      'text-generation',
      'onnx-community/gemma-3-270m-it-ONNX',
      {
        ...deviceConfig,
        // Don't use cache for compatibility with all browsers
        local_files_only: false,
        use_auth_token: false,
        revision: 'main',
        progress_callback: (progress) => {
          if (progress.status === 'progress') {
            const percent = Math.round(progress.progress || 0);
            const isDownloading = progress.file && progress.file.endsWith('.onnx');
            const message = isDownloading
              ? `Downloading model... ${percent}% (${Math.round(progress.loaded / 1024 / 1024)}MB)`
              : `Loading model... ${percent}%`;

            self.postMessage({
              type: 'progress',
              data: { progress: percent, message }
            });
          } else if (progress.status === 'ready') {
            self.postMessage({
              type: 'progress',
              data: { progress: 100, message: 'Model ready!' }
            });
          } else if (progress.status === 'initiate') {
            const isCached = progress.cache_hit;
            const message = isCached ? 'Loading cached model...' : 'Downloading model (270MB)...';
            self.postMessage({
              type: 'progress',
              data: { progress: 10, message }
            });
          }
        }
      }
    );

    isInitialized = true;
    console.log('✅ Gemma model initialized');

    self.postMessage({
      type: 'ready',
      data: { message: 'Model ready for generation' }
    });

  } catch (error) {
    console.error('❌ Model initialization failed:', error);
    self.postMessage({
      type: 'error',
      data: { error: error.message }
    });
  }
}

/**
 * Generate multiple text variations
 */
async function generateVariations(prompt, count, options) {
  if (!isInitialized || !generator) {
    throw new Error('Model not initialized');
  }

  console.log(`🎯 Generating ${count} variations for: "${prompt.substring(0, 50)}..."`);

  try {
    for (let i = 0; i < count; i++) {
      console.log(`📝 Generating variation ${i + 1}/${count}...`);

      // Generate with high temperature for diversity
      const output = await generator(
        [{ role: 'user', content: prompt }],
        {
          max_new_tokens: options.max_new_tokens || 50,
          temperature: options.temperature || 0.9,
          top_p: options.top_p || 0.95,
          top_k: options.top_k || 50,
          do_sample: true,
          // Different seed per iteration for variety
          seed: Date.now() + i
        }
      );

      // Extract generated text
      let generatedText = '';
      if (output[0].generated_text && Array.isArray(output[0].generated_text)) {
        const newMessages = output[0].generated_text;
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          generatedText = lastMessage.content.trim();
        }
      } else if (typeof output[0].generated_text === 'string') {
        generatedText = output[0].generated_text.trim();
      }

      if (!generatedText) {
        generatedText = `Generated variation ${i + 1}`;
      }

      // Send variation back to main thread
      self.postMessage({
        type: 'variation',
        data: {
          text: generatedText,
          index: i,
          total: count
        }
      });

      console.log(`✅ Variation ${i + 1}/${count}: ${generatedText.substring(0, 50)}...`);
    }

    // Send completion message
    self.postMessage({
      type: 'complete',
      data: { count }
    });

    console.log(`✅ All ${count} variations generated successfully`);

  } catch (error) {
    console.error('❌ Generation error:', error);
    self.postMessage({
      type: 'error',
      data: { error: error.message }
    });
  }
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'initialize':
        await initializeModel();
        break;

      case 'generate':
        await generateVariations(data.prompt, data.count, data.options);
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'error',
      data: { error: error.message }
    });
  }
});

console.log('✅ Gemma worker ready to receive messages');
