import { richTextParser } from '@/utils/richTextParser';

export type MessageType = 'story' | 'input' | 'error' | 'system' | 'choices' | 'title';

/**
 * Manages the story output display area
 */
export class MessageDisplay {
  private storyOutput: HTMLElement;

  constructor(storyOutputElement: HTMLElement) {
    this.storyOutput = storyOutputElement;
  }

  /**
   * Add a message to the story output
   */
  addMessage(text: string, type: MessageType): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `story-text ${type}`;
    
    // Use rich text formatting for story content, plain text for others
    if (type === 'story') {
      const richContent = richTextParser.renderContent(text);
      messageDiv.appendChild(richContent);
    } else {
      messageDiv.textContent = text;
    }
    
    this.storyOutput.appendChild(messageDiv);
    this.scrollToBottom();
  }

  /**
   * Clear all messages from the output
   */
  clearOutput(): void {
    this.storyOutput.innerHTML = '';
  }

  /**
   * Scroll the output to the bottom
   */
  private scrollToBottom(): void {
    this.storyOutput.scrollTop = this.storyOutput.scrollHeight;
  }

  /**
   * Add a custom DOM element to the output (for special UI like API key prompt)
   */
  addCustomElement(element: HTMLElement): void {
    this.storyOutput.appendChild(element);
    this.scrollToBottom();
  }

  /**
   * Remove the last message if it matches the given text
   */
  removeLastMessageIfMatches(text: string): void {
    const messages = this.storyOutput.querySelectorAll('.story-text');
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.textContent === text) {
      lastMessage.remove();
    }
  }
}