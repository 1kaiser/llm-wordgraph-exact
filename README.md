# LLM Word Graph + Gemma AI

**Real AI-powered text generation with interactive word graph visualization**

![LLM Word Graph Demo](llm-wordgraph-demo.gif)

*Live demonstration: Model loading → Prompt entry → AI generation → Interactive graph exploration*

This project combines the exact word graph visualization algorithm from Anthropic's [llm-consistency-vis](https://github.com/anthropics/llm-consistency-vis) with Google's **Gemma 270M AI model** running directly in your browser.

## 🎯 Features

- ✅ **Real AI Text Generation** - Gemma 270M ONNX model (270MB)
- ✅ **Browser-Based** - No API keys, no servers, completely local
- ✅ **Interactive Word Graph** - Visual analysis of language patterns
- ✅ **Real-Time Progress** - See model loading progress (0-100%)
- ✅ **Clean 2D UI** - Flat design, no shadows or 3D effects
- ✅ **Offline Capable** - Works offline after first model download

## 🚀 Quick Start

### Prerequisites
- Modern browser with WebGPU support (Chrome 113+, Edge 113+)
- OR fallback to WASM (Firefox 120+, Safari 17+)
- 4GB+ RAM recommended
- ~500MB free disk space for model cache

### Installation

```bash
# Clone the repository
git clone https://github.com/1kaiser/llm-wordgraph-exact.git
cd llm-wordgraph-exact

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at:
- **Local:** http://localhost:5173/llm-wordgraph-exact/
- **Network:** http://[your-ip]:5173/llm-wordgraph-exact/

## 📖 Step-by-Step Usage

### Step 1: Model Initialization (First Time: 30-120s)

When you first open the app, Gemma 270M will automatically start loading:

```
┌─────────────────────────────────────────┐
│ Gemma Status & Progress                 │
├─────────────────────────────────────────┤
│ Initializing Gemma 270M...              │
│ ██████████████████░░░░░░░░░░░░░  45%   │
└─────────────────────────────────────────┘
```

**What's happening:**
1. Downloading model files (270MB - one time only)
2. Loading tokenizer and weights
3. Initializing WebGPU/WASM backend

**Once ready, you'll see:**
```
✓ Gemma 270M ready!
```

### Step 2: Enter Your Prompt

Type or paste your prompt:

```
The future of artificial intelligence will
```

**Tips:**
- Use natural language prompts
- End with incomplete sentences for continuations
- Try the **Random** button for inspiration

### Step 3: Set Number of Variations (2-10)

Choose how many variations to generate (default: 5)

**More variations = Better graph:**
- 2-3: Simple comparison
- 5-7: Good balance (recommended)
- 8-10: Maximum diversity

### Step 4: Generate AI Text

Click the **Generate** button and wait for Gemma AI to create variations.

**What happens:**
1. Gemma AI generates each variation (~2-10s per variation)
2. Word graph builds automatically
3. Statistics update in real-time

### Step 5: Explore the Word Graph

The graph shows:
- **Nodes** = Words that appear across variations
- **Links** = Sequential word connections
- **Node size** = Frequency of word usage
- **Colors** = Different word paths

**Interactions:**
- **Zoom In/Out** - Use zoom controls (right side: + / −)
- **Pan** - Click and drag the graph
- **Reset** - Click home button (⌂) to reset view

## 🎨 UI Overview

```
┌─────────────────────────────────────────────────────────────┐
│ LLM Word Graph + Gemma AI                                  │
│ Real AI text generation & visualization                     │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Gemma Status ──────────────────────────────────────────┐│
│ │ ✓ Gemma 270M ready!                                     ││
│ │ ████████████████████████████████████████████ 100%      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Prompt:                                                     │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ The future of artificial intelligence will          │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ Variations: [5▼]  [Generate]  [Random]                     │
│                                                             │
│ ┌─── Statistics ───┐                                       │
│ │ Words │ Links │   │                                      │
│ │   42  │  89   │ 5 │                                      │
│ └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Technical Details

### Architecture

```
┌──────────────────┐      ┌──────────────────┐      ┌────────────┐
│  User Interface  │─────>│  Gemma Worker    │─────>│   WebGPU   │
│  (index.html)    │      │  (Web Worker)    │      │   / WASM   │
└──────────────────┘      └──────────────────┘      └────────────┘
         │                         │
         │                         │
         v                         v
┌──────────────────┐      ┌──────────────────┐
│  D3.js Graph     │      │  Gemma 270M      │
│  Visualization   │      │  ONNX Model      │
└──────────────────┘      └──────────────────┘
```

### Model Details

- **Model:** Gemma 270M Instruct (ONNX format)
- **Size:** 270MB
- **Backend:** WebGPU (with WASM fallback)
- **Temperature:** 0.9 (configurable)
- **Max Tokens:** 50 per variation

### Performance

| Metric | Value |
|--------|-------|
| **First Load** | 30-120s (one-time) |
| **Cached Load** | 5-15s |
| **Generation Speed** | ~2-10s per variation |
| **Memory Usage** | 400-800MB during inference |
| **Model Size** | 270MB (cached after first load) |

## 🛠️ Development

### Project Structure

```
llm-wordgraph-exact/
├── index.html                         # Main UI with Gemma integration
├── src/
│   └── main.ts                        # Word graph logic + Gemma integration
├── gemma-variation-generator.js       # Gemma API wrapper
├── gemma-worker.js                    # Web Worker for model
├── tests/
│   ├── gemma-generation-test.spec.ts  # Full integration tests
│   └── record-usage-demo.spec.ts      # Video recording test
└── test-results/                      # Screenshots & videos
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
npx playwright test tests/gemma-generation-test.spec.ts

# Run with visual browser
npx playwright test --headed
```

### Building for Production

```bash
npm run build
```

## 📊 How It Works

### 1. Text Generation

Gemma generates multiple variations of your prompt with controlled randomness:

```javascript
// Example: Generate 5 variations
const variations = await gemmaGenerator.generateVariations(
  "The future of AI will",
  5,
  { temperature: 0.9, maxTokens: 50 }
);

// Output (example):
// [
//   "The future of AI will transform healthcare...",
//   "The future of AI will revolutionize education...",
//   "The future of AI will enhance creativity...",
//   ...
// ]
```

### 2. Word Graph Construction

The exact algorithm from Anthropic's llm-consistency-vis:

```
Input Variations:
1. "AI will transform healthcare systems"
2. "AI will revolutionize healthcare delivery"
3. "AI will enhance healthcare outcomes"

Graph (simplified):
        transform ──> systems
       /
AI ─> will ──> revolutionize ──> delivery
       \        healthcare
        enhance ──> outcomes
```

### 3. Visualization

- D3.js force-directed graph layout
- Nodes sized by word frequency
- Links colored by sentence paths
- Interactive zoom and pan

## 🔧 Configuration

### Adjust Generation Parameters

Edit `src/main.ts`:

```typescript
const completions = await gemmaGenerator.generateVariations(prompt, numGenerations, {
    maxTokens: 50,      // Change output length (10-200)
    temperature: 0.9    // Change creativity (0.1-2.0)
});
```

### Customize UI Theme

Edit `index.html` CSS section - all colors use flat 2D design:

```css
/* Example: Change panel color */
.control-panel {
    background: #ffffff;  /* White background */
    border: 2px solid #333333;  /* Black border */
}

/* Example: Change button color */
button {
    background: #333333;  /* Black button */
    color: #ffffff;  /* White text */
}
```

## 🚨 Troubleshooting

### Model Won't Load

**Problem:** Stuck at "Initializing..."

**Solutions:**
1. Check browser compatibility (Chrome 113+ recommended)
2. Clear browser cache and reload
3. Check RAM availability (4GB+ needed)
4. Try incognito mode
5. Check console for errors (F12)

### Generation Fails

**Problem:** "Gemma AI is not ready"

**Solutions:**
1. Wait for initialization to complete (check progress bar)
2. Refresh the page
3. Check console for errors (F12)

### Slow Performance

**Problem:** Generation takes too long

**Solutions:**
1. Reduce number of variations (try 3-5)
2. Use shorter prompts
3. Check if WebGPU is enabled: chrome://gpu
4. Close other browser tabs

## 📝 Browser Compatibility

| Browser | WebGPU | WASM | Status |
|---------|--------|------|--------|
| Chrome 113+ | ✅ | ✅ | ⭐ Recommended |
| Edge 113+ | ✅ | ✅ | ⭐ Recommended |
| Firefox 120+ | ❌ | ✅ | Supported (slower) |
| Safari 17+ | ❌ | ✅ | Supported (slower) |

**Note:** WebGPU provides ~5-10x faster performance than WASM

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project uses:
- Anthropic's llm-consistency-vis algorithm (MIT License)
- Google's Gemma 270M model (Apache 2.0 License)
- Transformers.js (Apache 2.0 License)

## 🙏 Acknowledgments

- **Anthropic** - Original llm-consistency-vis algorithm
- **Google** - Gemma 270M language model
- **Xenova** - Transformers.js library
- **D3.js** - Visualization framework

## 🔗 Links

- [Live Demo](https://1kaiser.github.io/llm-wordgraph-exact/)
- [Original Algorithm](https://github.com/anthropics/llm-consistency-vis)
- [Gemma Model](https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX)
- [Transformers.js](https://github.com/xenova/transformers.js)

---

**Made with ❤️ using Gemma AI + D3.js**

*No API keys • No servers • Pure browser magic* ✨
