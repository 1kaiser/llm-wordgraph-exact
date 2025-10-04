/**
 * 🤖 Gemma Variation Generator
 * Plug-and-play script for generating multiple LLM text variations
 *
 * Usage:
 *   <script type="module" src="./gemma-variation-generator.js"></script>
 *
 *   const generator = new GemmaVariationGenerator();
 *   await generator.initialize();
 *   const variations = await generator.generateVariations("Your prompt", 5);
 */

import { pipeline, env } from '@huggingface/transformers';

export class GemmaVariationGenerator {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.isLoading = false;
    this.progress = 0;
    this.status = 'Not initialized';
    this.callbacks = {
      onProgress: null,
      onReady: null,
      onError: null,
      onVariation: null
    };

    console.log('🤖 Gemma Variation Generator initialized');
  }

  /**
   * Set callback functions
   * @param {Object} callbacks - { onProgress, onReady, onError, onVariation }
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Initialize the Web Worker with Gemma model
   */
  async initialize() {
    if (this.isReady || this.isLoading) {
      console.log('⚠️ Generator already initialized or loading');
      return;
    }

    this.isLoading = true;
    this.status = 'Initializing worker...';

    try {
      // Create Web Worker
      this.worker = new Worker(
        new URL('./gemma-worker.js', import.meta.url),
        { type: 'module' }
      );

      // Set up message handling
      this.worker.onmessage = (event) => this.handleWorkerMessage(event);
      this.worker.onerror = (error) => this.handleWorkerError(error);

      // Send initialization message
      this.worker.postMessage({ type: 'initialize' });

      console.log('🚀 Worker created, waiting for model to load...');
    } catch (error) {
      console.error('❌ Failed to create worker:', error);
      this.isLoading = false;
      this.status = 'Error during initialization';
      if (this.callbacks.onError) {
        this.callbacks.onError(error.message);
      }
      throw error;
    }
  }

  /**
   * Handle messages from worker
   */
  handleWorkerMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'progress':
        this.progress = data.progress;
        this.status = data.message;
        console.log(`📊 Progress: ${data.progress}% - ${data.message}`);
        if (this.callbacks.onProgress) {
          this.callbacks.onProgress(data.progress, data.message);
        }
        break;

      case 'ready':
        this.isReady = true;
        this.isLoading = false;
        this.progress = 100;
        this.status = 'Ready';
        console.log('✅ Gemma model loaded and ready!');
        if (this.callbacks.onReady) {
          this.callbacks.onReady();
        }
        break;

      case 'variation':
        console.log(`📝 Variation ${data.index + 1}: ${data.text.substring(0, 50)}...`);
        if (this.callbacks.onVariation) {
          this.callbacks.onVariation(data.text, data.index, data.total);
        }
        break;

      case 'complete':
        console.log('✅ All variations generated');
        break;

      case 'error':
        console.error('❌ Worker error:', data.error);
        this.status = 'Error: ' + data.error;
        if (this.callbacks.onError) {
          this.callbacks.onError(data.error);
        }
        break;
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(error) {
    console.error('❌ Worker error:', error);
    this.isLoading = false;
    this.status = 'Worker error';
    if (this.callbacks.onError) {
      this.callbacks.onError(error.message);
    }
  }

  /**
   * Generate multiple text variations
   * @param {string} prompt - The input prompt
   * @param {number} count - Number of variations (default: 5)
   * @param {Object} options - Generation options
   * @returns {Promise<string[]>} Array of generated text variations
   */
  async generateVariations(prompt, count = 5, options = {}) {
    if (!this.isReady) {
      throw new Error('Generator not ready. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const variations = [];
      let completed = 0;

      // Set up temporary callback for this generation
      const originalCallback = this.callbacks.onVariation;
      this.callbacks.onVariation = (text, index, total) => {
        variations[index] = text;
        completed++;

        // Call original callback if exists
        if (originalCallback) {
          originalCallback(text, index, total);
        }

        // Resolve when all variations are complete
        if (completed === count) {
          this.callbacks.onVariation = originalCallback;
          resolve(variations);
        }
      };

      // Set up error handling
      const originalErrorCallback = this.callbacks.onError;
      this.callbacks.onError = (error) => {
        this.callbacks.onVariation = originalCallback;
        this.callbacks.onError = originalErrorCallback;
        reject(new Error(error));
      };

      // Send generation request to worker
      this.worker.postMessage({
        type: 'generate',
        data: {
          prompt,
          count,
          options: {
            max_new_tokens: options.maxTokens || 50,
            temperature: options.temperature || 0.9,
            top_p: options.topP || 0.95,
            top_k: options.topK || 50,
            do_sample: true
          }
        }
      });
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      progress: this.progress,
      status: this.status
    };
  }

  /**
   * Terminate the worker
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      console.log('🛑 Gemma worker terminated');
    }
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.GemmaVariationGenerator = GemmaVariationGenerator;
  console.log('✅ GemmaVariationGenerator available globally');
}

export default GemmaVariationGenerator;
