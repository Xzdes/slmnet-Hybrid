/**
 * @file api.js
 * @description API stub for the large language model (LLM). Version 2.0.
 * Returns a structured JSON with a response and, optionally, a learning instruction.
 */

const serverLLM = {
    async getResponse(query) {
        console.log(`[API STUB] Request sent to server: "${query}"`);
        const delay = 800 + Math.random() * 700;
        await new Promise(resolve => setTimeout(resolve, delay));

        const normalizedQuery = query.toLowerCase().replace(/[.,!?;:]/g, '').trim();

        // Simulate the "Teacher" LLM recognizing 'thx' as a simple phrase
        if (normalizedQuery === 'thx') {
            console.log('[API STUB] LLM recognized the query as simple and sent a learning instruction.');
            return {
                userResponse: "You're welcome!",
                learningInstruction: {
                    command: "LEARN_SIMPLE_PHRASE",
                    query: normalizedQuery,
                    response: "You're welcome!"
                }
            };
        }

        console.log('[API STUB] LLM processed the query as complex.');
        return {
            userResponse: `This is a detailed response from the large model for your query: "${query}". In a commercial version, this would be meaningful text.`,
            learningInstruction: null
        };
    }
};