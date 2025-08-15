/**
 * @file gatekeeper.js
 * @description Core of the "Smart Gatekeeper" project. Final Multilingual Version with N-gram logic.
 * The initial brain contains both English and Russian phrases.
 * This version adds bigram checking for more accurate classification.
 */

const gatekeeper = {
    brain: {
        vocab: {},
        simpleVocab: new Set(),
        simpleNgrams: new Set(), // NEW: For storing word pairs like "how are"
        categories: ["simple", "complex"],
        simpleResponses: {},
        memory: []
    },
    isInitialized: false,

    async init() {
        this.brain.simpleVocab = new Set();
        this.brain.simpleNgrams = new Set();
        // Новый ключ для мультиязычного мозга, чтобы не было конфликтов
        const savedBrain = localStorage.getItem('gatekeeper_brain_v1_multi');
        if (savedBrain) {
            console.log("[Gatekeeper] Loading multilingual brain from localStorage...");
            const loadedBrain = JSON.parse(savedBrain);
            this.brain.vocab = loadedBrain.vocab;
            this.brain.simpleResponses = loadedBrain.simpleResponses;
            this.brain.memory = loadedBrain.memory;
            this.brain.simpleVocab = new Set(loadedBrain.simpleVocab || []);
            this.brain.simpleNgrams = new Set(loadedBrain.simpleNgrams || []); // NEW: Load n-grams
        } else {
            console.log("[Gatekeeper] Brain not found. Creating a new multilingual one...");
            this._prepareInitialBrain();
        }
        this.isInitialized = true;
        console.log("[Gatekeeper] Initialization complete.");
        this._saveBrain();
    },

    classify(text) {
        if (!this.isInitialized) return "complex";
        const normalizedText = this._normalizeText(text);

        // Rule #1: Exact Match. Highest priority.
        if (this.brain.simpleResponses.hasOwnProperty(normalizedText)) {
            return "simple";
        }

        const words = normalizedText.split(/\s+/).filter(word => word.length > 0);
        if (words.length === 0) return "simple"; // Empty query is simple

        // Rule #2: Unknown Word Check. If any word is unfamiliar, it's complex.
        for (const word of words) {
            if (!this.brain.simpleVocab.has(word)) {
                console.log(`[Gatekeeper] Found an unknown/complex word: "${word}". Query classified as 'complex'.`);
                return "complex";
            }
        }

        // Rule #3: N-gram Structure Check. All words are known, but is their order correct?
        // We only perform this check for multi-word queries. Single known words that passed Rule #2 are simple.
        if (words.length > 1) {
            for (let i = 0; i < words.length - 1; i++) {
                const bigram = `${words[i]} ${words[i+1]}`;
                if (!this.brain.simpleNgrams.has(bigram)) {
                    console.log(`[Gatekeeper] Known words, but unknown structure (bigram): "${bigram}". Query classified as 'complex'.`);
                    return "complex";
                }
            }
        }

        // If all words and their bigram structures are known, classify as simple.
        return "simple";
    },


    getSimpleResponse(text) {
        const normalizedText = this._normalizeText(text);
        return this.brain.simpleResponses[normalizedText] || "Okay!";
    },

    async learnFromFeedback(text, correctCategory, newResponse = null) {
        console.log(`[Gatekeeper] Learning. Text: "${text}", Category: "${correctCategory}", Response: "${newResponse || 'N/A'}"`);
        const normalizedText = this._normalizeText(text);
        const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
        if (correctCategory === 'simple') {
            if (newResponse) {
                this.brain.simpleResponses[normalizedText] = newResponse;
            }
            words.forEach(word => this.brain.simpleVocab.add(word));
            
            // NEW: Learn bigrams from the simple phrase
            if (words.length > 1) {
                for (let i = 0; i < words.length - 1; i++) {
                    const bigram = `${words[i]} ${words[i+1]}`;
                    this.brain.simpleNgrams.add(bigram);
                }
            }
        }
        this._updateVocab(normalizedText);
        if (!this.brain.memory.some(mem => mem.input === normalizedText)) {
            this.brain.memory.push({ input: normalizedText, category: correctCategory });
        }
        this._saveBrain();
        console.log("[Gatekeeper] Brain updated and saved.");
    },

    _saveBrain() {
        const brainToSave = {
            ...this.brain,
            simpleVocab: Array.from(this.brain.simpleVocab),
            simpleNgrams: Array.from(this.brain.simpleNgrams) // NEW: Save n-grams
        };
        localStorage.setItem('gatekeeper_brain_v1_multi', JSON.stringify(brainToSave));
    },
    
    _normalizeText(text) {
        return text.toLowerCase().replace(/[.,!?;:]/g, '').trim();
    },
    
    _updateVocab(text) {
        text.split(/\s+/).forEach(word => {
            if (word && !this.brain.vocab.hasOwnProperty(word)) {
                this.brain.vocab[word] = Object.keys(this.brain.vocab).length;
            }
        });
    },

    /**
     * Готовит богатый, двуязычный стартовый мозг.
     */
    _prepareInitialBrain() {
        const initialMemory = [
            // --- English Simple Phrases ---
            { input: "hello", category: "simple", response: "Hello there!" },
            { input: "hi", category: "simple", response: "Hi!" },
            { input: "hey", category: "simple", response: "Hey!" },
            { input: "hello there", category: "simple", response: "Hello to you too!" },
            { input: "how are you", category: "simple", response: "I'm doing great, thanks for asking!" },
            { input: "thanks", category: "simple", response: "You're welcome!" },
            { input: "thank you", category: "simple", response: "Happy to help!" },
            { input: "thx", category: "simple", response: "Anytime!" },
            { input: "ty", category: "simple", response: "No problem!" },
            { input: "ok", category: "simple", response: "Got it." },
            { input: "okay", category: "simple", response: "Alright." },
            { input: "bye", category: "simple", response: "See you later!" },
            { input: "goodbye", category: "simple", response: "Goodbye!" },

            // --- Russian Simple Phrases ---
            { input: "привет", category: "simple", response: "Приветствую!" },
            { input: "здравствуй", category: "simple", response: "Здравствуйте!" },
            { input: "как дела", category: "simple", response: "Все отлично, спасибо!" },
            { input: "спасибо", category: "simple", response: "Пожалуйста!" },
            { input: "благодарю", category: "simple", response: "Рад помочь!" },
            { input: "спс", category: "simple", response: "Не за что!" },
            { input: "пока", category: "simple", response: "До скорой встречи!" },
            { input: "хорошо", category: "simple", response: "Отлично!" },
            { input: "ок", category: "simple", response: "Принято." },
            
            // --- Complex Phrases (Mixed) ---
            { input: "tell me a joke", category: "complex" },
            { input: "what is the weather in london", category: "complex" },
            { input: "расскажи анекдот", category: "complex" },
            { input: "кто такой исаак ньютон", category: "complex" },
            { input: "compare javascript and python", category: "complex" }
        ];

        initialMemory.forEach(mem => {
            const normalizedInput = this._normalizeText(mem.input);
            this.brain.memory.push({ input: normalizedInput, category: mem.category });
            this._updateVocab(normalizedInput);
            if(mem.category === 'simple') {
                this.brain.simpleResponses[normalizedInput] = mem.response;
                const words = normalizedInput.split(/\s+/).filter(w => w);

                words.forEach(word => {
                    this.brain.simpleVocab.add(word);
                });

                // NEW: Add bigrams for initial simple phrases
                if (words.length > 1) {
                    for (let i = 0; i < words.length - 1; i++) {
                        const bigram = `${words[i]} ${words[i+1]}`;
                        this.brain.simpleNgrams.add(bigram);
                    }
                }
            }
        });
    }
};