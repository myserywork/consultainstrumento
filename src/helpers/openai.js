import OpenAI from 'openai';
import { envManager } from '../di.js';

/**
 * Represents a virtual assistant for veterinary health.
 * @constructor
 * @property {string} name - The name of the assistant.
 * @property {Array} chatHistory - The chat history of the assistant.
 * @property {Object} openai - The OpenAI instance used for generating responses.
 */
class OpenAIAssistant {
  constructor() {
    this.name = "Assistant";
    this.chatHistory = [];
    this.openai = new OpenAI({ apiKey: envManager.get('OPENAI') });
  }

  addMessage(content, role = "system") {
    this.chatHistory.push({ role, content });
  }

  getChatHistory() {
    return this.chatHistory;
  }

  async buildCompletion() {
    const chatHistory = this.getChatHistory();
    const completion = await this.openai.chat.completions.create({
      messages: chatHistory,
      model: "gpt-3.5-turbo",
    });

    return completion.choices[0].message.content;
  }

  async getResponse(content, role = "user") {
    const userMessage = { role, content };
    this.addMessage(content, role); // Add user message to chat history

    const completionText = await this.buildCompletion();

    if (completionText) {
      const assistantMessage = {
        role: "assistant",
        content: completionText,
      };
      this.addMessage(assistantMessage.content, "assistant"); // Add assistant response to chat history
      return assistantMessage.content;
    } else {
      const errorMessage = "I'm sorry, I couldn't generate a response.";
      this.addMessage(errorMessage, "assistant");
      return errorMessage;
    }
  }

  async getSimpleResponseString(content, role = "user") {
    // Get a simple response without message history by directly providing a prompt

    const completion = await this.openai.chat.completions.create({
        messages: [{ role: role, content: content }],
        model: "gpt-3.5-turbo",
      });
  
      return completion.choices[0].message.content;

  }
}

export default OpenAIAssistant;
