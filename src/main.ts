import * as d3 from 'd3';
import { Voy as VoyClient } from "voy-search";
import { pipeline, env } from '@xenova/transformers';

// Exact interfaces from llm-consistency-vis
interface NodeDatum {
    word: string;
    count: number;
    origWordIndices: Set<number>;
    origSentIndices: Set<number>;
    origSentences: Set<string>;
    children: NodeDatum[];
    parents: NodeDatum[];
    isEnd?: boolean;
    isRoot?: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rx: number;
    ry: number;
}

interface LinkDatum {
    source: NodeDatum;
    target: NodeDatum;
    sentence: string;
}

// Token mapping - exact from llm-consistency-vis
const tokensToOrigWord: { [key: string]: string } = {};
const embsDict: { [key: string]: { word: string, prevWord: string, nextWord: string, idx: number } } = {};

// Voy resource interface for proper typing
interface VoyResource {
    embeddings: Array<{
        id: string;
        title: string;
        url: string;
        embeddings: number[];
    }>;
}

interface VoySearchResult {
    neighbors: Array<{
        id: string;
        title: string;
        url: string;
    }>;
}

class LLMWordGraphExact {
    private hoveredNode: NodeDatum | null = null;
    private selectedNode: NodeDatum | null = null;
    private currentGenerations: string[] = [];
    private voyClient: VoyClient | null = null;
    private embedder: any = null;
    private isVoyReady: boolean = false;
    private isGenerating: boolean = false;
    private lastPrompt: string = "";
    private generationStartTime: number = 0;

    constructor() {
        this.initializeVoy();
        this.initializeEventListeners();
        this.detectNetworkIP();
        // No default sample - wait for Gemma to be ready
    }

    private initializeEventListeners() {
        // Generation controls
        d3.select('#generateBtn').on('click', () => this.handleGenerateClick());
        d3.select('#randomBtn').on('click', () => this.loadRandomSample());
        d3.select('#testBtn').on('click', () => this.runComparisonTests());
        
        // Input monitoring for button state changes
        d3.select('#promptInput').on('input', () => this.updateButtonState());
        d3.select('#promptInput').on('keydown', (event) => {
            if (event.key === 'Enter') {
                this.handleGenerateClick();
            }
        });
        
        // Initialize button state
        this.updateButtonState();
        
        // Zoom controls
        d3.select('#zoomIn').on('click', () => this.zoom(1.5));
        d3.select('#zoomOut').on('click', () => this.zoom(1/1.5));
        d3.select('#resetZoom').on('click', () => this.resetZoom());

        // Window resize
        window.addEventListener('resize', () => {
            if (this.currentGenerations.length > 0) {
                this.renderGraph(this.currentGenerations);
            }
        });
    }

    // Initialize Voy WASM with proper HuggingFace embeddings
    private async initializeVoy() {
        try {
            console.log('🚀 Initializing Voy WASM with HuggingFace embeddings...');
            
            // Configure transformers to use local models and disable logging
            env.allowRemoteModels = false;
            env.allowLocalModels = true;
            env.useBrowserCache = true;
            
            // Initialize HuggingFace embeddings pipeline
            console.log('📦 Loading embeddings model (Xenova/all-MiniLM-L6-v2)...');
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: true,
                revision: 'main',
            });
            
            // Initialize Voy client with dynamic import
            const { Voy } = await import("voy-search");
            this.voyClient = new Voy();
            
            console.log('✅ Voy WASM and embeddings model initialized successfully');
            this.isVoyReady = true;
        } catch (error) {
            console.warn('⚠️ Voy initialization failed, using fallback text generation:', error);
            this.isVoyReady = false;
        }
    }

    // Generate real embeddings using HuggingFace model
    private async generateEmbedding(text: string): Promise<number[]> {
        if (!this.embedder || !this.isVoyReady) {
            throw new Error('Embeddings model not initialized');
        }
        
        try {
            const output = await this.embedder(text, { 
                pooling: 'mean', 
                normalize: true 
            });
            
            // Convert tensor to array
            return Array.from(output.data);
        } catch (error) {
            console.error('Failed to generate embedding:', error);
            throw error;
        }
    }

    // Enhanced text generation using Voy vector search for similarity matching
    private async generateVoyEnhancedCompletions(prompt: string, count: number): Promise<string[]> {
        if (!this.voyClient || !this.isVoyReady) {
            console.log('🔄 Voy not ready, using fallback generation');
            return this.simulateLLMCompletions(prompt, count);
        }

        try {
            console.log('🔍 Generating completions with Voy vector search...');
            
            // Base completion templates for semantic variation
            const completionTemplates = [
                "will transform how we work and live through intelligent automation and enhanced productivity.",
                "can revolutionize industries by augmenting human capabilities with advanced machine learning algorithms.",
                "has the potential to reshape society through personalized experiences and data-driven insights.",
                "might accelerate scientific discovery by processing vast amounts of information more efficiently.",
                "could democratize access to powerful analytical tools for researchers and innovators worldwide.",
                "will create new opportunities while requiring careful consideration of ethical implications.",
                "can augment human creativity and problem-solving abilities across multiple domains.",
                "enables breakthrough innovations in healthcare, education, and environmental sustainability."
            ];

            // Generate embeddings for each template and the prompt
            const queryEmbedding = await this.generateEmbedding(prompt);
            const embeddingsData = await Promise.all(
                completionTemplates.map(async (template, i) => ({
                    id: String(i),
                    title: `${prompt} ${template}`,
                    url: `/completion/${i}`,
                    embeddings: await this.generateEmbedding(`${prompt} ${template}`)
                }))
            );

            // Index the completions in Voy for similarity search
            this.voyClient.index({ embeddings: embeddingsData });

            // Search for most relevant completions using vector similarity
            const searchResults = this.voyClient.search(new Float32Array(queryEmbedding), count);
            
            const results = searchResults.neighbors.slice(0, count).map(neighbor => neighbor.title);
            
            console.log(`✅ Generated ${results.length} Voy-enhanced completions with vector search`);
            return results;
        } catch (error) {
            console.warn('❌ Voy generation failed, falling back to standard generation:', error);
            return this.simulateLLMCompletions(prompt, count);
        }
    }


    // Exact tokenization function from llm-consistency-vis utils.tsx
    private tokenize(sent: string, sentenceIdx: number = 0): string[] {
        let chunks = sent.split(/\s+/);
        chunks = chunks.filter(c => c.length > 0);

        let tokens: string[] = chunks.map((chunk, i) => {
            chunk = chunk.replace(/[^\w\s\'.!?]|_/g, "").replace(/\s+/g, " ");
            chunk = chunk.toLowerCase().trim();

            let tokenKey = chunk + sentenceIdx + i;

            embsDict[tokenKey] = {
                word: chunk,
                prevWord: chunks[i - 1] || '',
                nextWord: chunks[i + 1] || '',
                idx: i
            };

            tokensToOrigWord[tokenKey] = chunk;
            return tokenKey;
        });

        return tokens;
    }

    // Exact similarity function from llm-consistency-vis utils.tsx
    private similarity(a: string, b: string): number {
        const embA = embsDict[a] || {} as any;
        const embB = embsDict[b] || {} as any;
        let counter = 0;
        
        if (embA.prevWord === embB.prevWord) {
            counter += 0.25; // First word match
        }
        if (embA.word === embB.word) {
            counter += 0.5; // Actual word exact match
        }
        if (embA.nextWord === embB.nextWord) {
            counter += 0.25; // Third word match
        }
        counter -= Math.abs((embA.idx || 0) - (embB.idx || 0)) / 20; // Similar positions

        return counter;
    }

    // Exact graph creation algorithm from llm-consistency-vis
    private createGraphDataFromGenerations(generations: string[]): { nodesData: NodeDatum[], linksData: LinkDatum[] } {
        const linksDict: { [key: string]: { [key: string]: Set<string> } } = {};
        const nodesDict: { [key: string]: NodeDatum } = {};

        // Process generations to create nodes and links - exact algorithm
        generations.forEach((generation, i) => {
            let prevWord = '';
            const words = this.tokenize(generation, i);
            words.forEach((word, j) => {
                const currentWords = Object.keys(nodesDict);

                // Check if the word is similar to any existing node - exact threshold
                const similarityThreshold = 0.5;
                let similarNodes = currentWords.map((existingWord) => [this.similarity(existingWord, word), existingWord])
                    .sort((a: any, b: any) => b[0] - a[0]) as any;
                
                similarNodes = similarNodes.filter((pair: any) => {
                    const [similarityScore, similarWord] = pair;
                    const isAboveThreshold = similarityScore > similarityThreshold;
                    const isFromSameSentence = nodesDict[similarWord]?.origSentIndices.has(i);
                    return isAboveThreshold && !isFromSameSentence;
                });

                const similarNode = similarNodes?.[0]?.[1] || null;
                
                if (similarNode && similarNode !== prevWord) {
                    word = similarNode;
                }

                if (!nodesDict[word]) {
                    nodesDict[word] = {
                        x: 0,
                        y: 0,
                        vx: 0,
                        vy: 0,
                        rx: 0,
                        ry: 0,
                        count: 0,
                        word,
                        origSentences: new Set<string>(),
                        origWordIndices: new Set<number>(),
                        origSentIndices: new Set<number>(),
                        isRoot: j === 0,
                        children: [],
                        parents: [],
                    };
                }
                
                nodesDict[word].count += 1;
                nodesDict[word].origSentences.add(generation);
                nodesDict[word].origWordIndices.add(j);
                nodesDict[word].origSentIndices.add(i);
                
                if (j === 0) {
                    nodesDict[word].isRoot = true;
                }
                if (j === words.length - 1) {
                    nodesDict[word].isEnd = true;
                }

                // Add a link from the previous word
                if (j > 0) {
                    linksDict[prevWord] = linksDict[prevWord] || {};
                    const sentences = linksDict[prevWord][word] || new Set<string>();
                    sentences.add(generation);
                    linksDict[prevWord][word] = sentences;
                }
                prevWord = word;
            });
        });

        this.mergeSequentialNodes(nodesDict, linksDict);

        // Process nodes and links to create data arrays
        const nodesData = Object.values(nodesDict);
        const linksData: LinkDatum[] = [];

        Object.entries(linksDict).forEach(([source, targets]) => {
            Object.entries(targets).forEach(([target, sentences]) => {
                const targetNode = nodesDict[target];
                const sourceNode = nodesDict[source];
                
                if (targetNode && sourceNode) {
                    // Add parent-child relationships
                    if (!sourceNode.children.includes(targetNode)) {
                        sourceNode.children.push(targetNode);
                    }
                    if (!targetNode.parents.includes(sourceNode)) {
                        targetNode.parents.push(sourceNode);
                    }

                    // Create links for each sentence
                    Array.from(sentences).forEach(sentence => {
                        linksData.push({
                            source: sourceNode,
                            target: targetNode,
                            sentence
                        });
                    });
                }
            });
        });

        return { nodesData, linksData };
    }

    // Exact merge function from llm-consistency-vis utils.tsx
    private mergeSequentialNodes(nodesDict: { [key: string]: NodeDatum }, linksDict: { [key: string]: { [key: string]: Set<string> } }) {
        for (let i = 0; i < Object.keys(nodesDict).length; i++) {
            for (const source in nodesDict) {
                if (!(source in linksDict)) {
                    continue;
                }

                const targets = Object.keys(linksDict[source]);
                
                // We found an edge to be merged
                const target = targets[0];
                const inEdgesForTarget = Object.keys(linksDict).filter(otherSource => linksDict[otherSource] && linksDict[otherSource][target]);
                const shouldMerge = targets.length === 1 && inEdgesForTarget.length === 1;
                
                if (shouldMerge) {
                    const word = source + ' ' + target;
                    tokensToOrigWord[word] = (tokensToOrigWord[source] || source) + ' ' + (tokensToOrigWord[target] || target);
                    
                    // Create a new node with the merged word
                    nodesDict[word] = { ...nodesDict[source], word };

                    if (nodesDict[target].isEnd) {
                        nodesDict[word].isEnd = true;
                    }

                    // Delete the old nodes
                    delete nodesDict[target];
                    delete nodesDict[source];

                    // Merge the edges
                    linksDict[word] = { ...linksDict[target] };
                    delete linksDict[target];
                    delete linksDict[source];

                    // Update the links to point to the new node
                    for (const otherSource in linksDict) {
                        let otherTargets = linksDict[otherSource];
                        if (source in otherTargets) {
                            otherTargets[word] = otherTargets[source];
                            delete otherTargets[source];
                        }
                    }
                }
            }
        }
    }

    // Enhanced positioning with centered graph and 10% margins
    private getExpectedX(d: NodeDatum): number {
        const width = window.innerWidth;
        const graphMarginPercent = 0.1;
        const graphLeftMargin = width * graphMarginPercent;
        const graphWidth = width * (1 - 2 * graphMarginPercent);
        
        const padBetweenWords = Math.max(30, graphWidth / 50); // Dynamic padding based on screen width
        const parents = d.parents.filter(p => this.selectedNode ? this.nodeIsInSents(p) : true);
        
        if (d.isRoot && !parents.length) {
            return graphLeftMargin + padBetweenWords;
        }
        if (!parents.length) {
            return d.x || graphLeftMargin + padBetweenWords;
        }
        if (this.selectedNode && !this.nodeIsInSents(d)) {
            return d.x || graphLeftMargin + padBetweenWords;
        }
        
        const parentRights = parents.map((p: NodeDatum) => {
            return (p.x || 0) + this.textLength(p) + padBetweenWords;
        });
        
        const calculatedX = d3.mean(parentRights) || (d.x || graphLeftMargin + padBetweenWords);
        
        // Ensure word stays within graph boundaries
        const maxX = graphLeftMargin + graphWidth - this.textLength(d) - padBetweenWords;
        return Math.min(calculatedX, maxX);
    }

    private getExpectedY(d: NodeDatum, height: number): number {
        const avgSentIndex = d3.min(Array.from(d.origSentIndices)) || 0;
        const percentage = avgSentIndex / Math.max(1, this.currentGenerations.length - 1);
        const pad = height * 0.1;
        return pad + percentage * (height - 2 * pad);
    }

    // Enhanced path rendering with smooth splines
    private renderPath(d: LinkDatum): string {
        const getY = (node: NodeDatum) => {
            const lineHeight = this.fontSize(node) * 0.5;
            const offsetY = Array.from(node.origSentences).indexOf(d.sentence) * this.fontSize(node) * 0.05;
            return node.y - lineHeight + offsetY;
        };

        const [y1, y2] = [getY(d.source), getY(d.target)];

        const getXLeftRightCenter = (node: NodeDatum) => {
            const textLength = this.textLength(node);
            const leftX = node.x;
            const rightX = leftX + textLength;
            const centerX = (leftX + rightX) / 2;
            return [leftX, rightX, centerX];
        };

        const [sourceLeftX, sourceRightX, sourceCenterX] = getXLeftRightCenter(d.source);
        const [targetLeftX, targetRightX, targetCenterX] = getXLeftRightCenter(d.target);

        // Enhanced connection points for better visual flow
        const sourceEnd = d.source?.isRoot ? sourceLeftX : sourceCenterX;
        const targetEnd = d.target.isEnd ? targetRightX : targetCenterX;

        // Calculate control points for smooth spline curves
        const dx = targetLeftX - sourceRightX;
        const midX = sourceRightX + dx * 0.5;
        const controlOffset = Math.min(Math.abs(dx) * 0.4, 80); // Dynamic control point offset
        
        // Create smooth spline with multiple control points
        const points = [
            { x: sourceEnd, y: y1 },
            { x: sourceRightX + controlOffset * 0.3, y: y1 - 5 }, // Subtle lift at start
            { x: midX, y: (y1 + y2) / 2 - 10 }, // Mid-point with slight arc
            { x: targetLeftX - controlOffset * 0.3, y: y2 - 5 }, // Subtle approach curve
            { x: targetEnd, y: y2 }
        ];

        // Use cardinal spline for smoother curves
        const lineGenerator = d3.line<{ x: number, y: number }>()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveCardinal.tension(0.4)); // Smooth cardinal spline with tension

        return lineGenerator(points) || '';
    }

    // Helper functions
    private linkIsInSents(d: LinkDatum): boolean {
        const activeNode = this.selectedNode || this.hoveredNode;
        return activeNode ? activeNode.origSentences.has(d.sentence) : true;
    }

    private nodeIsInSents(d: NodeDatum): boolean {
        const activeNode = this.selectedNode || this.hoveredNode;
        if (!activeNode) return true;
        
        const activeSents = Array.from(activeNode.origSentences);
        const sents = d.origSentences;
        const sharedElements = activeSents.filter(e => sents.has(e));
        return sharedElements.length > 0;
    }

    private fontSize(d: NodeDatum): number {
        const minFontSize = 11;
        const maxFontSize = 30;
        return Math.min(Math.max(minFontSize, d.count * 5), maxFontSize);
    }

    private textLength(d: NodeDatum): number {
        const displayText = tokensToOrigWord[d.word] || d.word;
        return displayText.length * this.fontSize(d) * 0.6;
    }

    private textHeight(d: NodeDatum): number {
        return this.fontSize(d) * 1.2;
    }

    private addBoundingBoxData(nodes: NodeDatum[]) {
        nodes.forEach((node) => {
            node.rx = this.textLength(node) / 2;
            node.ry = this.textHeight(node) / 2;
        });
    }

    // Main rendering function
    private renderGraph(generations: string[]) {
        this.currentGenerations = generations;
        
        const edgeColors = d3.scaleOrdinal(d3.schemeTableau10).domain(generations);
        const selectedColor = '#2d3436';
        const defaultColor = '#636e72';

        // Generate graph data using exact algorithm
        const { nodesData, linksData } = this.createGraphDataFromGenerations(generations);
        this.addBoundingBoxData(nodesData);

        console.log(`Generated ${nodesData.length} nodes and ${linksData.length} links`);

        // Update stats
        d3.select('#wordCount').text(nodesData.length);
        d3.select('#linkCount').text(linksData.length);
        d3.select('#genCount').text(generations.length);

        // Use full viewport dimensions with 10% margins for graph positioning
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Calculate graph boundaries (10% margins from left and right)
        const graphMarginPercent = 0.1;
        const graphLeftMargin = width * graphMarginPercent;
        const graphRightMargin = width * graphMarginPercent;
        const graphWidth = width - graphLeftMargin - graphRightMargin;
        
        const svg = d3.select("#graph")
            .html('')
            .attr("width", width)
            .attr("height", height)
            .style("cursor", "grab")
            .on('click', (event: any) => {
                if (event.target.tagName === 'svg') {
                    this.selectedNode = null;
                    this.hoveredNode = null;
                    updateSimulation();
                    update();
                }
            });

        // Add zoom behavior
        const g = svg.append("g");
        const zoom = d3.zoom()
            .scaleExtent([0.2, 5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        
        svg.call(zoom as any);
        (svg.node() as any).__zoom__ = zoom; // Store for external access

        // Force simulation with exact positioning
        const simulation = d3.forceSimulation(nodesData as any)
            .force("link", d3.forceLink(linksData as any)
                .id((d: any) => d.word)
                .strength(0.1))
            .force('y', d3.forceY((d: NodeDatum) => this.getExpectedY(d, height)).strength(0.1))
            .on("tick", () => update());

        const updateSimulation = () => {
            simulation.stop();
            
            const selectedLinks = this.selectedNode ? linksData.filter(d => this.linkIsInSents(d)) : linksData;
            const selectedNodes = this.selectedNode ? nodesData.filter(d => this.nodeIsInSents(d)) : nodesData;

            simulation
                .nodes(selectedNodes)
                .force("link", d3.forceLink(selectedLinks as any)
                    .id((d: any) => d.word)
                    .strength(0.1))
                .force('y', d3.forceY((d: NodeDatum) => this.getExpectedY(d, height)).strength(0.1));

            simulation.alpha(1).restart();
        };

        // Draw links as paths
        const links = g.selectAll(".link")
            .data(linksData)
            .enter()
            .append('path')
            .attr("class", "link")
            .attr("fill", "none");

        // Draw nodes as text
        const nodes = g.selectAll(".node")
            .data(nodesData)
            .enter()
            .append("g")
            .attr("class", "node")
            .on('mouseover', (event: any, d: NodeDatum) => {
                if (!this.selectedNode) {
                    this.hoveredNode = d;
                    update();
                }
            })
            .on('mouseout', (event: any, d: NodeDatum) => {
                if (!this.selectedNode) {
                    this.hoveredNode = null;
                    update();
                }
            })
            .on('click', (event: any, d: NodeDatum) => {
                event.stopPropagation();
                if (this.selectedNode === d) {
                    this.selectedNode = null;
                    this.hoveredNode = null;
                } else {
                    this.selectedNode = d;
                    this.hoveredNode = null;
                }
                updateSimulation();
                update();
            });

        nodes.append("text")
            .text(d => tokensToOrigWord[d.word] || d.word)
            .attr("font-size", (d: any) => this.fontSize(d))
            .attr("fill", defaultColor)
            .style("cursor", "pointer");

        const update = () => {
            // Position nodes horizontally using exact algorithm
            nodesData.forEach((d: NodeDatum) => {
                d.x = this.getExpectedX(d);
            });

            // Update links with exact path rendering
            links.attr("d", (d: any) => this.renderPath(d))
                .attr("stroke", (d: any) => {
                    return this.linkIsInSents(d) ? edgeColors(d.sentence) : defaultColor;
                })
                .attr("stroke-width", (d: any) => {
                    return this.linkIsInSents(d) ? 2 : 1;
                })
                .attr("stroke-opacity", (d: any) => {
                    if (d.source.word === '') return 0;
                    return this.linkIsInSents(d) ? 0.7 : 0.2;
                })
                .classed('blur', (d: LinkDatum) => this.selectedNode ? !this.linkIsInSents(d) : false);

            // Update nodes
            nodes.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
                .select('text')
                .attr('fill', (d: NodeDatum) => {
                    return this.nodeIsInSents(d) ? selectedColor : defaultColor;
                })
                .style('opacity', (d: NodeDatum) => {
                    const activeNode = this.selectedNode || this.hoveredNode;
                    if (!activeNode) return 1;
                    return this.nodeIsInSents(d) ? 1 : 0.2;
                });

            nodes.classed('blur', (d: NodeDatum) => this.selectedNode ? !this.nodeIsInSents(d) : false);
        };

        updateSimulation();
        
        // Auto-reset zoom like pressing home button, then center the graph
        setTimeout(() => {
            this.resetZoom();
            // Small delay to let reset complete, then center using center of gravity
            setTimeout(() => {
                this.centerGraphView();
            }, 200);
        }, 100);
    }

    // Center the graph view using center of gravity with proper scaling
    private centerGraphView() {
        const svg = d3.select("#graph");
        const container = svg.select("g");
        const nodes = container.selectAll(".node");
        const zoom = (svg.node() as any).__zoom__;
        
        if (!zoom || nodes.empty()) {
            return;
        }
        
        // Screen dimensions and target area (with 10% margins)
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const screenCenterX = screenWidth / 2;
        const screenCenterY = screenHeight / 2;
        
        // Calculate available graph area (80% of screen width)
        const marginPercent = 0.1;
        const availableWidth = screenWidth * (1 - 2 * marginPercent);
        
        // Step 1: Calculate center of gravity (weighted by node importance)
        let totalWeightedX = 0;
        let totalWeightedY = 0;
        let totalWeight = 0;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        nodes.each(function(d: any) {
            if (d.x !== undefined && d.y !== undefined) {
                // Use node count as weight (more important nodes have higher count)
                const weight = d.count || 1;
                
                totalWeightedX += d.x * weight;
                totalWeightedY += d.y * weight;
                totalWeight += weight;
                
                // Track bounds for scaling
                minX = Math.min(minX, d.x);
                maxX = Math.max(maxX, d.x);
                minY = Math.min(minY, d.y);
                maxY = Math.max(maxY, d.y);
            }
        });
        
        if (totalWeight === 0) return;
        
        // Center of gravity (weighted center)
        const centerOfGravityX = totalWeightedX / totalWeight;
        const centerOfGravityY = totalWeightedY / totalWeight;
        
        // Step 2: Calculate current graph dimensions
        const currentGraphWidth = maxX - minX;
        const currentGraphHeight = maxY - minY;
        
        // Step 3: Calculate scale to fit graph within 80% of screen width
        let scale = 1;
        if (currentGraphWidth > 0) {
            scale = Math.min(availableWidth / currentGraphWidth, 2.0); // Cap at 2x zoom
            scale = Math.max(scale, 0.2); // Minimum 0.2x zoom
        }
        
        // Step 4: Calculate translation to center the graph's center of gravity
        const translateX = screenCenterX - (centerOfGravityX * scale);
        const translateY = screenCenterY - (centerOfGravityY * scale);
        
        // Step 5: Apply smooth transition with proper scaling and centering
        svg.transition()
            .duration(750)
            .ease(d3.easeQuadOut)
            .call(
                zoom.transform,
                d3.zoomIdentity.translate(translateX, translateY).scale(scale)
            );
            
        console.log(`🎯 Center of gravity (${centerOfGravityX.toFixed(1)}, ${centerOfGravityY.toFixed(1)}) centered at screen (${screenCenterX}, ${screenCenterY}) with scale ${scale.toFixed(2)}`);
        console.log(`📏 Graph dimensions: ${currentGraphWidth.toFixed(1)}x${currentGraphHeight.toFixed(1)} → scaled to fit ${availableWidth.toFixed(1)}px width`);
    }

    // Handle generate button click with smart state management
    private handleGenerateClick() {
        if (this.isGenerating) {
            return; // Prevent multiple simultaneous generations
        }

        // Always generate with Gemma AI
        this.generateLLMOutputs();
    }
    
    // Update button appearance based on current state
    private updateButtonState() {
        const generateBtn = d3.select('#generateBtn');
        const currentPrompt = (d3.select('#promptInput').node() as HTMLInputElement).value.trim();

        if (this.isGenerating) {
            // Generating state - show loading
            generateBtn.html('⏳');
            generateBtn.property('disabled', true);
            return;
        }

        // Check if Gemma is ready
        const gemmaGenerator = (window as any).gemmaGenerator;
        const isGemmaReady = gemmaGenerator && gemmaGenerator.isReady;

        if (!isGemmaReady) {
            generateBtn.html('⏸');
            generateBtn.property('disabled', true);
            return;
        }

        // Ready to generate
        generateBtn.html('Generate');
        generateBtn.property('disabled', !currentPrompt);
    }
    
    // Enhanced LLM output generation using Voy
    private async generateLLMOutputs() {
        const prompt = (d3.select('#promptInput').node() as HTMLInputElement).value;
        const numGenerations = parseInt((d3.select('#numGenerations').node() as HTMLInputElement).value);

        if (!prompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        // Get Gemma generator
        const gemmaGenerator = (window as any).gemmaGenerator;

        if (!gemmaGenerator || !gemmaGenerator.isReady) {
            alert('Gemma AI is not ready yet. Please wait for initialization to complete.');
            return;
        }

        // Start generation timing and UI state
        this.isGenerating = true;
        this.generationStartTime = performance.now();
        this.lastPrompt = prompt;
        this.updateButtonState();

        // Clear previous timing display
        d3.select('#timingDisplay').text('Generating...');

        try {
            console.log(`🤖 Generating ${numGenerations} variations with Gemma AI...`);

            const completions = await gemmaGenerator.generateVariations(prompt, numGenerations, {
                maxTokens: 50,
                temperature: 0.9
            });

            // Calculate generation time
            const generationTime = ((performance.now() - this.generationStartTime) / 1000).toFixed(2);

            // Update UI with results
            this.displayGenerations(completions);
            this.renderGraph(completions);

            // Show timing information
            d3.select('#timingDisplay').text(`${generationTime}s`);

            console.log(`⚡ Generated ${completions.length} AI completions in ${generationTime}s`);
        } catch (error) {
            console.error('❌ Gemma generation failed:', error);
            alert('Generation failed: ' + (error as Error).message);
            d3.select('#timingDisplay').text('Failed');
        } finally {
            // Reset generation state
            this.isGenerating = false;
            this.updateButtonState();
        }
    }

    // Realistic LLM data similar to llm-consistency-vis examples
    private getRealisticLLMSample(): string[] {
        // Based on real translation variations from their examples
        return [
            'In the days when Nature in her powerful creativity conceived monstrous children every day, I would have loved to live near a young giantess, like a voluptuous cat at the feet of a queen.',
            'In the days when Nature in her powerful creativity conceived monstrous children every day, I would have loved to live beside a young giantess, like a voluptuous cat at the feet of a queen.',
            'In the days when Nature in her powerful mood conceived monstrous children every day, I would have loved to live with a young giantess, like a voluptuous cat at the feet of a queen.',
            'In the time when Nature in her powerful mood conceived monstrous children every day, I would have loved to live near a young giantess, like a voluptuous cat at the feet of a queen.',
            'In the days when Nature in her powerful fervor conceived monstrous children every day, I would have loved to live with a young giantess, like a voluptuous cat at the feet of a queen.',
            'When Nature in her powerful mood was conceiving monstrous children every day, I would have loved to live beside a young giantess, like a voluptuous cat at the feet of a queen.',
            'In the days when Nature in her powerful verve conceived monstrous children each day, I would have loved to live beside a young giantess, like a voluptuous cat at the feet of a queen.'
        ];
    }

    private simulateLLMCompletions(prompt: string, count: number): string[] {
        // Use realistic variations similar to actual LLM outputs
        const realisticExamples = {
            'The future of artificial intelligence will': [
                'The future of artificial intelligence will transform how we work and live in unprecedented ways.',
                'The future of artificial intelligence will revolutionize industries through automation and intelligent systems.',
                'The future of artificial intelligence will reshape society by enhancing human capabilities and decision-making.',
                'The future of artificial intelligence will accelerate scientific discovery and innovation across all fields.',
                'The future of artificial intelligence will democratize access to powerful tools and knowledge.',
                'The future of artificial intelligence will create new opportunities while requiring careful ethical consideration.',
                'The future of artificial intelligence will augment human creativity and problem-solving abilities.',
                'The future of artificial intelligence will enable personalized experiences tailored to individual needs.'
            ],
            'Climate change solutions require': [
                'Climate change solutions require immediate global cooperation and coordinated action.',
                'Climate change solutions require innovative technologies and sustainable practices.',
                'Climate change solutions require significant investment in renewable energy sources.',
                'Climate change solutions require fundamental changes in how we produce and consume.',
                'Climate change solutions require both technological innovation and behavioral shifts.',
                'Climate change solutions require unprecedented international collaboration and commitment.',
                'Climate change solutions require comprehensive policies that address all sectors of society.',
                'Climate change solutions require urgent action from governments, businesses, and individuals.'
            ]
        };

        // Use realistic examples if available, otherwise generate variations
        const baseExamples = realisticExamples[prompt as keyof typeof realisticExamples];
        if (baseExamples) {
            return baseExamples.slice(0, count);
        }

        // Fallback to synthetic variations
        const continuations = [
            "revolutionize industries through automation and intelligent decision-making systems.",
            "transform education by providing personalized learning experiences for students.",
            "reshape healthcare with predictive analytics and precision medicine approaches.",
            "enhance creative industries through powerful generative tools and AI collaboration.",
            "improve environmental sustainability via smart resource management systems.",
            "democratize knowledge by making advanced analytical tools accessible worldwide.",
            "accelerate scientific discovery through automated hypothesis generation and testing.",
            "transform transportation with autonomous vehicles and intelligent traffic systems."
        ];

        const results: string[] = [];
        for (let i = 0; i < count; i++) {
            const continuation = continuations[i % continuations.length];
            results.push(`${prompt} ${continuation}`);
        }
        
        return results;
    }

    private displayGenerations(generations: string[]) {
        const section = d3.select('#generationsSection');
        const list = d3.select('#generationsList');
        
        d3.select('#totalCount').text(`(${generations.length})`);
        
        list.selectAll('*').remove();
        
        const items = list.selectAll('.generation-item')
            .data(generations)
            .enter()
            .append('div')
            .attr('class', 'generation-item')
            .on('click', (event, d) => {
                const isSelected = d3.select(event.currentTarget).classed('selected');
                d3.selectAll('.generation-item').classed('selected', false);
                
                if (!isSelected) {
                    d3.select(event.currentTarget).classed('selected', true);
                    // Re-render with focus on selected generation
                    this.renderGraph([d]);
                } else {
                    // Re-render with all generations if deselecting
                    this.renderGraph(generations);
                }
            });

        items.append('div')
            .attr('class', 'generation-number')
            .text((d, i) => `${i + 1}`);

        items.append('div')
            .style('padding-right', '25px') // Make room for number
            .text(d => d);
            
        // Auto-expand the list when generations are added
        section.classed('open', true);
    }

    // Zoom controls
    private zoom(scaleFactor: number) {
        const svg = d3.select('#graph');
        const zoom = (svg.node() as any).__zoom__;
        if (zoom) {
            svg.transition().duration(300).call(
                zoom.scaleBy as any, scaleFactor
            );
        }
    }

    private resetZoom() {
        const svg = d3.select('#graph');
        const zoom = (svg.node() as any).__zoom__;
        if (zoom) {
            svg.transition().duration(500).call(
                zoom.transform as any, d3.zoomIdentity
            );
        }
    }

    // Initialize default view with centered graph
    private initializeCenteredView() {
        // Graph is already full screen by default with 10% margins
        // Center the initial view on the graph
        const svg = d3.select('#graph');
        const zoom = (svg.node() as any).__zoom__;
        if (zoom && this.currentGenerations.length > 0) {
            // Center on the graph area
            const width = window.innerWidth;
            const graphMarginPercent = 0.1;
            const graphCenterX = width * 0.5; // Center of screen
            
            svg.transition().duration(1000).call(
                zoom.transform as any, 
                d3.zoomIdentity.translate(0, 0).scale(1)
            );
        }
    }

    // Sample data - using realistic LLM variations similar to llm-consistency-vis
    private loadDefaultSample() {
        // Use one of the realistic examples
        const realisticGenerations = this.getRealisticLLMSample();
        this.displayGenerations(realisticGenerations);
        this.renderGraph(realisticGenerations);
    }

    private loadRandomSample() {
        const prompts = [
            "The future of artificial intelligence will",
            "Climate change is caused by",
            "The benefits of regular exercise include",
            "Quantum computing will revolutionize",
            "Space exploration helps us",
            "The impact of social media on",
            "Renewable energy sources are",
            "Machine learning can improve"
        ];

        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        (d3.select('#promptInput').node() as HTMLInputElement).value = randomPrompt;
        this.updateButtonState(); // Update button appearance for new prompt
        // Don't auto-generate - let user click Generate button
    }

    // Enhanced network IP detection
    private async detectNetworkIP() {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            pc.createDataChannel('');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            let ipFound = false;
            pc.onicecandidate = (event) => {
                if (event.candidate && !ipFound) {
                    const candidate = event.candidate.candidate;
                    const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                    if (ipMatch && !ipMatch[1].startsWith('127.')) {
                        const localIP = ipMatch[1];
                        const port = '5173';
                        d3.select('#networkAddress')
                            .text(`${localIP}:${port}`);
                        ipFound = true;
                        pc.close();
                    }
                }
            };

            // Fallback after 3 seconds
            setTimeout(() => {
                if (!ipFound) {
                    pc.close();
                    d3.select('#networkAddress').text('localhost:5173');
                }
            }, 3000);

        } catch (error) {
            console.log('Could not detect local IP, using localhost');
            d3.select('#networkAddress').text('localhost:5173');
        }
    }

    // Test suite for comparing with llm-consistency-vis
    public runComparisonTests() {
        console.log('🧪 Running comparison tests with llm-consistency-vis...');
        
        const testGenerations = this.getRealisticLLMSample().slice(0, 3);
        console.log('📝 Test input:', testGenerations);
        
        // Test tokenization
        console.log('\n🔤 Testing tokenization:');
        testGenerations.forEach((gen, i) => {
            const tokens = this.tokenize(gen, i);
            console.log(`Generation ${i+1}: ${tokens.length} tokens`);
            console.log(`  First 5 tokens:`, tokens.slice(0, 5).map(t => tokensToOrigWord[t] || t));
        });

        // Test graph generation
        console.log('\n📊 Testing graph generation:');
        const { nodesData, linksData } = this.createGraphDataFromGenerations(testGenerations);
        console.log(`Generated ${nodesData.length} nodes, ${linksData.length} links`);
        
        // Test word similarity and merging
        console.log('\n🔗 Testing word similarity:');
        const uniqueWords = new Set<string>();
        nodesData.forEach(node => {
            const originalWord = tokensToOrigWord[node.word] || node.word;
            uniqueWords.add(originalWord);
        });
        console.log(`Unique words after similarity merging: ${uniqueWords.size}`);
        console.log('Sample words:', Array.from(uniqueWords).slice(0, 10));

        // Test positioning
        console.log('\n📍 Testing positioning algorithm:');
        this.addBoundingBoxData(nodesData);
        nodesData.forEach((node, i) => {
            if (i < 5) { // Show first 5 nodes
                const x = this.getExpectedX(node);
                const y = this.getExpectedY(node, 600);
                const word = tokensToOrigWord[node.word] || node.word;
                console.log(`"${word}": x=${Math.round(x)}, y=${Math.round(y)}, parents=${node.parents.length}, children=${node.children.length}`);
            }
        });

        return {
            totalNodes: nodesData.length,
            totalLinks: linksData.length,
            uniqueWords: uniqueWords.size,
            sampleNode: {
                word: tokensToOrigWord[nodesData[0]?.word] || nodesData[0]?.word,
                x: Math.round(this.getExpectedX(nodesData[0])),
                y: Math.round(this.getExpectedY(nodesData[0], 600)),
                parents: nodesData[0]?.parents.length || 0,
                children: nodesData[0]?.children.length || 0
            }
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new LLMWordGraphExact();
    
    // Add test button to run comparison
    const controls = document.querySelector('.controls');
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Run Comparison Tests';
    testBtn.style.backgroundColor = '#28a745';
    testBtn.onclick = () => {
        const results = app.runComparisonTests();
        alert(`Test Results:\n• Nodes: ${results.totalNodes}\n• Links: ${results.totalLinks}\n• Unique Words: ${results.uniqueWords}\n• Sample Node: ${results.sampleNode.word} at (${results.sampleNode.x}, ${results.sampleNode.y})`);
    };
    controls?.appendChild(testBtn);
});