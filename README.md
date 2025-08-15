# slmnet Hybrid

**slmnet Hybrid** is a client-side hybrid AI engine designed to optimize interactions between users and large language models (LLMs). It operates directly in the user's browser, acting as an intelligent filter that instantly handles simple, repetitive queries locally while passing only genuinely complex requests to a server.

## About The Project

Modern large language models are incredibly powerful, but their use is computationally expensive and introduces latency in responses. A significant portion of user queries in dialogue systems consists of simple, recurring phrases such as greetings, thanks, or short affirmations. Sending every such query to a server is inefficient, costly, and degrades the user experience with unnecessary waiting times.

**slmnet Hybrid** solves this problem by implementing a lightweight "Gatekeeper" on the client side. This engine analyzes every user query *before* it is sent to the server. Simple, pre-defined, or previously learned phrases are processed instantly within the browser. Only queries that require true reasoning or complex knowledge are passed on.

This creates a fast, responsive, and cost-effective hybrid system that delivers a superior user experience and significantly reduces the load on server-side LLMs.

## Key Features

*   **Hybrid Architecture:** Combines instant client-side processing with the power of server-based models.
*   **Intelligent Filtering:** Utilizes a strict, hierarchical rule-based system to accurately classify queries as "simple" or "complex."
*   **Instantaneous Response:** Answers to simple queries are delivered with zero latency, making the AI interaction feel more natural and fluid.
*   **Dual Learning System:** The Gatekeeper grows smarter in two ways:
    1.  **Proactive Learning:** It receives learning instructions directly from the server-side LLM.
    2.  **Interactive Learning:** It learns from direct user feedback through an intuitive UI.
*   **Zero Dependencies:** Written in pure JavaScript, HTML, and CSS, requiring no external libraries or frameworks.
*   **Persistent Memory:** The entire "brain" (vocabularies and learned responses) is saved in the browser's `localStorage`, ensuring learning continuity across sessions.

## Architecture and How It Works

The core logic is centered in the client-side "Gatekeeper" module, which intercepts every user query and performs the following steps:

1.  **Normalization:** The input text is cleaned of punctuation and converted to lowercase.

2.  **Rule-Based Classification:** The query is processed through a strict hierarchy of rules:
    *   **Rule #1: Exact Match.** The system first checks if the normalized phrase exists as a key in its database of simple responses (`simpleResponses`). If a match is found, the query is immediately classified as `simple`.
    *   **Rule #2: Unknown Word Check.** If no exact match is found, the system splits the query into individual words. It then checks each word against a dedicated "simple words" vocabulary (`simpleVocab`). If it encounters **even one word** that is not in this vocabulary, the entire query is immediately classified as `complex`.
    *   **Rule #3: Fully Known Composition.** If all words in the query are found within the `simpleVocab`, the query is classified as `simple`.

3.  **Routing:**
    *   If the query is `simple`, the response is retrieved from the local database and instantly displayed to the user.
    *   If the query is `complex`, it is sent to the server-side LLM's API.

4.  **Server Response Handling:** The client expects a structured JSON response from the server, which may contain not only the text to display to the user but also an optional learning instruction.

## Learning Mechanism

The innovation of **slmnet Hybrid** lies in its ability to learn and adapt.

#### Proactive Learning (Server-Taught)

The server-side LLM can act as a "teacher." If it receives a query it deems simple (e.g., "thx"), it can return a special JSON object:

```json
{
  "userResponse": "You're welcome!",
  "learningInstruction": {
    "command": "LEARN_SIMPLE_PHRASE",
    "query": "thx",
    "response": "You're welcome!"
  }
}
```

Upon receiving this instruction, the client-side Gatekeeper automatically adds the new phrase and response to its local knowledge base. The next time the user sends "thx," it will be handled locally.

#### Interactive Learning (User-Taught)

If the Gatekeeper misclassifies a query, the user can correct it:
1.  The user clicks the "No, that's wrong" feedback button.
2.  If a query was incorrectly classified as `complex`, a teaching panel appears.
3.  The user provides the correct response for this "simple" query.
4.  The Gatekeeper updates its knowledge base, adding the new phrase, its response, and all of its words to the `simpleVocab`.

## Project Structure

```
.
├── index.html          # The main HTML structure of the application.
├── style.css           # All styles for the user interface.
├── api.js              # A stub that simulates the server-side LLM API.
├── gatekeeper.js       # The project's core: classification, storage, and learning logic.
└── main.js             # The main script: connects the UI to the gatekeeper and manages events.
```

## How to Run

1.  Ensure all 6 files are in the same directory.
2.  Open `index.html` in any modern web browser.
3.  For best performance and to avoid potential issues with `localStorage`, it is recommended to run the project via a local web server (e.g., the Live Server extension for VS Code).