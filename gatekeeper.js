/**
 * @file gatekeeper.js
 * @description Core of the "Smart Gatekeeper" project. Final Multilingual Version.
 * The initial brain contains both English and Russian phrases.
 */

const gatekeeper = {
    brain: {
        vocab: {},
        simpleVocab: new Set(),
        categories: ["simple", "complex"],
        simpleResponses: {},
        memory: []
    },
    isInitialized: false,

    async init() {
        this.brain.simpleVocab = new Set();
        // Новый ключ для мультиязычного мозга, чтобы не было конфликтов
        const savedBrain = localStorage.getItem('gatekeeper_brain_v1_multi');
        if (savedBrain) {
            console.log("[Gatekeeper] Loading multilingual brain from localStorage...");
            const loadedBrain = JSON.parse(savedBrain);
            this.brain.vocab = loadedBrain.vocab;
            this.brain.simpleResponses = loadedBrain.simpleResponses;
            this.brain.memory = loadedBrain.memory;
            this.brain.simpleVocab = new Set(loadedBrain.simpleVocab || []);
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
        if (this.brain.simpleResponses.hasOwnProperty(normalizedText)) {
            return "simple";
        }
        const words = normalizedText.split(/\s+/).filter(word => word.length > 0);
        if (words.length === 0) return "simple";
        for (const word of words) {
            if (!this.brain.simpleVocab.has(word)) {
                console.log(`[Gatekeeper] Found an unknown/complex word: "${word}". Query classified as 'complex'.`);
                return "complex";
            }
        }
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
        }
        this._updateVocab(normalizedText);
        if (!this.brain.memory.some(mem => mem.input === normalizedText)) {
            this.brain.memory.push({ input: normalizedText, category: correctCategory });
        }
        this._saveBrain();
        console.log("[Gatekeeper] Brain updated and saved.");
    },

    _saveBrain() {
        const brainToSave = { ...this.brain, simpleVocab: Array.from(this.brain.simpleVocab) };
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
                normalizedInput.split(/\s+/).forEach(word => {
                    if(word) this.brain.simpleVocab.add(word);
                });
            }
        });
    }
};