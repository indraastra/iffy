import { richTextParser, RenderContext } from '@/utils/richTextParser';
import { InteractionPair } from '@/types/story';

export type MessageType = 'story' | 'input' | 'error' | 'system' | 'choices' | 'title';

/**
 * Manages the story output display area
 */
export class MessageDisplay {
  private storyOutput: HTMLElement;
  private getItem?: (itemId: string) => { name: string; display_name?: string } | undefined;

  constructor(storyOutputElement: HTMLElement) {
    this.storyOutput = storyOutputElement;
  }

  /**
   * Set the item lookup function for rich text rendering
   */
  setItemLookup(getItem: (itemId: string) => { name: string; display_name?: string } | undefined): void {
    this.getItem = getItem;
  }

  /**
   * Add a message to the story output
   */
  addMessage(text: string, type: MessageType): void {
    this.createAndAppendMessage(text, type);
  }

  /**
   * Create and append a message element to the output
   */
  private createAndAppendMessage(text: string, type: MessageType): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `story-text ${type}`;
    
    // Use rich text formatting for story content, plain text for others
    if (type === 'story') {
      const context: RenderContext = {
        type: 'narrative',
        getItem: this.getItem
      };
      const richContent = richTextParser.renderContent(text, context);
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

  /**
   * Restore conversation history from memory manager interactions
   */
  restoreConversationHistory(interactions: InteractionPair[]): void {
    // Clear current display but don't reset history tracking
    this.storyOutput.innerHTML = '';
    
    // Show a restoration message
    this.createAndAppendMessage('📖 Restoring conversation from save...', 'system');
    
    // Restore interactions in chronological order
    for (const interaction of interactions) {
      // Add player input
      this.createAndAppendMessage(`> ${interaction.playerInput}`, 'input');
      
      // Add LLM response
      this.createAndAppendMessage(interaction.llmResponse, 'story');
    }
    
    // Add a separator to indicate current session
    if (interactions.length > 0) {
      this.createAndAppendMessage('✅ Save loaded. You can continue from here.', 'system');
    }
  }
}