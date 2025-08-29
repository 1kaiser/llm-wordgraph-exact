import * as d3 from 'd3';

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

class LLMWordGraphExact {
    private hoveredNode: NodeDatum | null = null;
    private selectedNode: NodeDatum | null = null;
    private currentGenerations: string[] = [];

    constructor() {
        this.initializeEventListeners();
        this.detectNetworkIP();
        this.loadDefaultSample();
    }

    private initializeEventListeners() {
        // Generation controls
        d3.select('#generateBtn').on('click', () => this.generateLLMOutputs());
        d3.select('#randomBtn').on('click', () => this.loadRandomSample());
        
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

    // Exact positioning functions from llm-consistency-vis
    private getExpectedX(d: NodeDatum): number {
        const padBetweenWords = 50;
        const parents = d.parents.filter(p => this.selectedNode ? this.nodeIsInSents(p) : true);
        
        if (d.isRoot && !parents.length) {
            return padBetweenWords;
        }
        if (!parents.length) {
            return d.x;
        }
        if (this.selectedNode && !this.nodeIsInSents(d)) {
            return d.x;
        }
        
        const parentRights = parents.map((p: NodeDatum) => {
            return p.x + this.textLength(p) + padBetweenWords;
        });
        
        return d3.mean(parentRights) || d.x;
    }

    private getExpectedY(d: NodeDatum, height: number): number {
        const avgSentIndex = d3.min(Array.from(d.origSentIndices)) || 0;
        const percentage = avgSentIndex / Math.max(1, this.currentGenerations.length - 1);
        const pad = height * 0.1;
        return pad + percentage * (height - 2 * pad);
    }

    // Exact path rendering from llm-consistency-vis
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

        // If the source is a root node, align to left edge
        const sourceEnd = d.source?.isRoot ? sourceLeftX : sourceCenterX;
        // If the target is an end node, align to right edge  
        const targetEnd = d.target.isEnd ? targetRightX : targetCenterX;

        const points = [
            { x: sourceEnd, y: y1 },
            { x: sourceRightX, y: y1 },
            { x: targetLeftX, y: y2 },
            { x: targetEnd, y: y2 }
        ];

        const lineGenerator = d3.line<{ x: number, y: number }>()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveMonotoneY);

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

        const width = Math.min(window.innerWidth * 0.95, 5000);
        const height = Math.min(window.innerHeight * 0.6, 800);
        
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
    }

    // LLM output generation (simulated)
    private generateLLMOutputs() {
        const prompt = (d3.select('#promptInput').node() as HTMLInputElement).value;
        const numGenerations = parseInt((d3.select('#numGenerations').node() as HTMLInputElement).value);
        
        if (!prompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        // Simulate diverse LLM completions
        const completions = this.simulateLLMCompletions(prompt, numGenerations);
        this.displayGenerations(completions);
        this.renderGraph(completions);
    }

    private simulateLLMCompletions(prompt: string, count: number): string[] {
        const continuations = [
            "revolutionize industries through automation and intelligent decision-making systems that enhance human capabilities.",
            "transform education by providing personalized learning experiences tailored to individual student needs and learning styles.",
            "reshape healthcare with predictive analytics and precision medicine that improves patient outcomes significantly.",
            "enhance creative industries by augmenting human creativity with powerful generative tools and collaborative AI systems.",
            "improve environmental sustainability through smart resource management and optimization of energy consumption patterns.",
            "democratize knowledge by making advanced analytical tools accessible to researchers and innovators worldwide.",
            "accelerate scientific discovery through automated hypothesis generation and experimental design optimization systems.",
            "transform transportation with autonomous vehicles and intelligent traffic management systems for safer and more efficient travel.",
            "revolutionize communication by enabling seamless real-time translation and cross-cultural understanding.",
            "enhance decision-making processes by providing data-driven insights and predictive modeling capabilities."
        ];

        const results: string[] = [];
        for (let i = 0; i < count; i++) {
            const continuation = continuations[i % continuations.length];
            // Add slight variations to simulate real LLM diversity
            const variation = Math.random() > 0.5 ? 
                continuation : 
                continuation.replace(/\b(through|with|by)\b/g, match => {
                    const alternatives: any = { 'through': 'via', 'with': 'using', 'by': 'through' };
                    return alternatives[match] || match;
                });
            
            results.push(`${prompt} ${variation}`);
        }
        
        return results;
    }

    private displayGenerations(generations: string[]) {
        const section = d3.select('#generationsSection').style('display', 'block');
        const list = d3.select('#generationsList');
        
        d3.select('#totalCount').text(`(${generations.length})`);
        
        list.selectAll('*').remove();
        
        const items = list.selectAll('.generation-item')
            .data(generations)
            .enter()
            .append('div')
            .attr('class', 'generation-item')
            .on('click', (event, d) => {
                d3.selectAll('.generation-item').classed('selected', false);
                d3.select(event.currentTarget).classed('selected', true);
                // Re-render with focus on selected generation
                this.renderGraph([d]);
            });

        items.append('div')
            .attr('class', 'generation-number')
            .text((d, i) => `${i + 1}`);

        items.append('div')
            .text(d => d);
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

    // Sample data
    private loadDefaultSample() {
        const prompt = (d3.select('#promptInput').node() as HTMLInputElement).value;
        if (prompt) {
            const generations = this.simulateLLMCompletions(prompt, 3);
            this.displayGenerations(generations);
            this.renderGraph(generations);
        }
    }

    private loadRandomSample() {
        const prompts = [
            "The future of artificial intelligence will",
            "Climate change solutions require",
            "Space exploration enables humanity to",
            "Quantum computing will revolutionize",
            "The metaverse represents a new paradigm for"
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        (d3.select('#promptInput').node() as HTMLInputElement).value = randomPrompt;
        this.generateLLMOutputs();
    }

    // Network IP detection (exact copy)
    private async detectNetworkIP() {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            pc.createDataChannel('');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidate = event.candidate.candidate;
                    const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                    if (ipMatch && !ipMatch[1].startsWith('127.')) {
                        const localIP = ipMatch[1];
                        const port = '5173'; // Vite default port
                        d3.select('#networkAddress')
                            .html(`🌍 Network: <code>http://${localIP}:${port}</code>`);
                        pc.close();
                    }
                }
            };

            setTimeout(() => {
                pc.close();
                d3.select('#networkAddress')
                    .html(`🌍 Network: <code>Check network settings</code>`);
            }, 5000);

        } catch (error) {
            console.log('Could not detect local IP automatically');
            d3.select('#networkAddress')
                .html(`🌍 Network: <code>Check network settings</code>`);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LLMWordGraphExact();
});