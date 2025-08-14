/**
 * @file main.js
 * @description Main controller script. Version 4.0.
 * Handles UI, structured API responses, and proactive learning. English version.
 */

document.addEventListener('DOMContentLoaded', () => {

    console.log("[main.js] DOM loaded. Finding UI elements...");
    const ui = {
        chatContainer: document.getElementById('chat-container'),
        userInput: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        feedbackContainer: document.getElementById('feedback-container'),
        feedbackQuery: document.getElementById('feedback-query'),
        feedbackDecision: document.getElementById('feedback-decision'),
        correctBtn: document.getElementById('correct-btn'),
        incorrectBtn: document.getElementById('incorrect-btn'),
        teachContainer: document.getElementById('teach-container'),
        teachQuery: document.getElementById('teach-query'),
        responseInput: document.getElementById('response-input'),
        teachBtn: document.getElementById('teach-btn')
    };

    let allUiElementsFound = true;
    for (const key in ui) {
        if (ui[key] === null) {
            console.error(`[main.js] CRITICAL ERROR: UI element not found in HTML: '${key}'. Check the ID in index.html.`);
            allUiElementsFound = false;
        }
    }
    
    if (!allUiElementsFound) {
        alert("Critical error: failed to initialize the interface. Check the developer console (F12).");
        return;
    }
    console.log("[main.js] All UI elements found successfully.");

    let lastQuery = { text: '', decision: '' };
    let isBotThinking = false;

    const handleSendMessage = async () => {
        const userText = ui.userInput.value.trim();
        if (!userText || isBotThinking) return;
        isBotThinking = true;
        ui.sendBtn.disabled = true;
        ui.userInput.value = '';
        hideAllPanels();
        appendMessage('user', userText);
        const decision = gatekeeper.classify(userText);
        lastQuery = { text: userText, decision: decision };
        if (decision === 'simple') {
            const simpleResponse = gatekeeper.getSimpleResponse(userText);
            appendMessage('bot', simpleResponse);
            showFeedbackPanel();
        } else {
            const thinkingMessage = appendMessage('bot', 'Thinking...');
            const serverData = await serverLLM.getResponse(userText);
            thinkingMessage.querySelector('p').textContent = serverData.userResponse;
            if (serverData.learningInstruction && serverData.learningInstruction.command === 'LEARN_SIMPLE_PHRASE') {
                const instruction = serverData.learningInstruction;
                appendMessage('system', `Received instruction from server: learning to respond to "${instruction.query}"`);
                await gatekeeper.learnFromFeedback(instruction.query, 'simple', instruction.response);
            } else {
                 showFeedbackPanel();
            }
        }
        isBotThinking = false;
        ui.sendBtn.disabled = false;
    };
    
    const handleIncorrectFeedback = () => {
        hideAllPanels();
        const correctDecision = lastQuery.decision === 'simple' ? 'complex' : 'simple';
        if (correctDecision === 'simple') {
            ui.teachQuery.textContent = lastQuery.text;
            ui.teachContainer.classList.remove('hidden');
            ui.responseInput.focus();
        } else {
            appendMessage('system', `Understood! I will now send similar requests to the server.`);
            gatekeeper.learnFromFeedback(lastQuery.text, 'complex');
        }
    };
    
    const handleTeachNewResponse = async () => {
        const query = ui.teachQuery.textContent;
        const newResponse = ui.responseInput.value.trim();
        if (!newResponse) return;
        hideAllPanels();
        appendMessage('system', `Got it! Learning a new response for the phrase: "${query}"`);
        await gatekeeper.learnFromFeedback(query, 'simple', newResponse);
        ui.responseInput.value = '';
    };

    function appendMessage(sender, text) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('message', `message-${sender}`);
        const p = document.createElement('p');
p.textContent = text;
        messageEl.appendChild(p);
        ui.chatContainer.appendChild(messageEl);
        ui.chatContainer.scrollTop = ui.chatContainer.scrollHeight;
        return messageEl;
    }
    
    function showFeedbackPanel() {
        ui.feedbackQuery.textContent = lastQuery.text;
        ui.feedbackDecision.textContent = lastQuery.decision === 'simple' ? 'SIMPLE' : 'COMPLEX';
        ui.feedbackContainer.classList.remove('hidden');
    }

    function hideAllPanels() {
        ui.feedbackContainer.classList.add('hidden');
        ui.teachContainer.classList.add('hidden');
    }

    console.log("[main.js] Assigning event handlers...");
    ui.sendBtn.addEventListener('click', handleSendMessage);
    ui.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    ui.correctBtn.addEventListener('click', () => {
        hideAllPanels();
    });
    ui.incorrectBtn.addEventListener('click', handleIncorrectFeedback);
    ui.teachBtn.addEventListener('click', handleTeachNewResponse);
    console.log("[main.js] Event handlers assigned.");
    
    appendMessage('system', 'Initializing "Gatekeeper"...');
    gatekeeper.init().then(() => {
        console.log("[Gatekeeper] Gatekeeper is ready to work!");
    }).catch(error => {
        console.error("Error initializing Gatekeeper:", error);
    });
});