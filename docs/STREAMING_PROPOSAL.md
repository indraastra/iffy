# Streaming Response Format Proposal

## Problem Statement

The current JSON-based response format for LLM interactions creates several challenges for streaming:

1. **JSON Parsing Limitations**: JSON cannot be parsed until completely received, negating streaming benefits
2. **Poor User Experience**: Users wait for complete responses before seeing any text
3. **Narrative Buried in Structure**: The actual story content is wrapped in JSON metadata
4. **Streaming Incompatibility**: LLM token streaming doesn't work well with structured JSON output

## Proposed Solution: Markdown + Metadata Comments

### Format Overview

Replace JSON responses with a hybrid format that separates streamable content from metadata:

```markdown
You step into the shadowy corridor, your footsteps echoing against ancient stone walls. The air carries a musty scent of forgotten years, and somewhere in the distance, you hear the faint **drip** of water.

As you move forward, three doorways become visible:
- One carved with intricate *symbols*
- Another plain and weathered  
- A third that seems to shimmer with an otherworldly light

What draws your attention most?

<!-- METADATA
importance: 7
reasoning: Player is making a significant choice between three paths that will affect story direction
memories: 
  - "entered the ancient corridor"
  - "discovered three mysterious doorways"
signals:
  transition: "scene:three_paths"
-->
```

### Benefits

1. **True Streaming**: Narrative text appears immediately as tokens arrive
2. **Rich Formatting**: Native markdown support enhances presentation
3. **Clean Separation**: Content streams first, metadata parsed at completion
4. **LLM-Friendly**: More natural output format for language models
5. **Progressive Enhancement**: Formatting applies as content streams
6. **Backward Compatible**: Can parse existing JSON responses as fallback

## Technical Implementation

### Phase 1: Format Specification

#### Response Structure
- **Narrative Content**: Standard markdown (streamable)
- **Metadata Block**: HTML comment at end containing YAML-structured data
- **Comment Format**: `<!-- METADATA\n[yaml content]\n-->`

#### Metadata Schema
```yaml
importance: 1-10           # Interaction significance
reasoning: string          # LLM decision explanation  
memories: string[]         # New memories to store
signals:                   # Game state changes
  transition: string       # "scene:id" or "ending:id"
  discover: string         # Item discovery
```

#### Markdown Support
- **Basic formatting**: bold, italic, headers
- **Lists**: bullet points and numbered lists
- **Rich text**: character/item highlighting with custom CSS classes
- **Line breaks**: Preserved for proper story formatting

### Phase 2: Parser Implementation

#### Streaming Parser
```typescript
class StreamingMarkdownParser {
  private buffer = '';
  private metadataExtracted = false;
  
  appendToken(token: string): {
    content: string;
    isComplete: boolean;
    metadata?: ResponseMetadata;
  }
  
  extractMetadata(fullResponse: string): ResponseMetadata
  
  parseMarkdown(content: string): string  // Convert to HTML
}
```

#### Progressive Rendering
- Stream content to UI as tokens arrive
- Apply markdown formatting in real-time
- Handle incomplete markdown gracefully
- Extract metadata when response completes

### Phase 3: Engine Integration

#### LLMDirector Updates
```typescript
// Replace parseJsonResponse with:
private parseMarkdownResponse(
  rawResponse: string, 
  input: string, 
  context: DirectorContext
): DirectorResponse {
  const parser = new StreamingMarkdownParser();
  const result = parser.extractMetadata(rawResponse);
  const narrative = parser.parseMarkdown(result.content);
  
  return {
    narrative,
    signals: result.metadata.signals,
    importance: result.metadata.importance,
    memories: result.metadata.memories
  };
}
```

#### Prompt Updates
Update system prompts to request new format:

```
Respond in markdown format with metadata at the end.

Write your response as natural markdown text, then add metadata in an HTML comment:

Example response:
The ancient door creaks open, revealing a **dimly lit chamber**. Strange symbols glow faintly on the walls.

<!-- METADATA
importance: 6
reasoning: Player successfully opened the door, advancing to next area
memories: ["opened the ancient door", "entered the symbol chamber"]
signals:
  transition: "scene:symbol_chamber"
-->
```

### Phase 4: Enhanced Streaming Experience

#### Real-time Markdown Rendering
- Progressive bold/italic application
- Live list formatting
- Character/item highlighting as content streams
- Smooth visual transitions

#### Rich Text Streaming
```typescript
class StreamingRenderer {
  private partialFormatting = new Set();
  
  renderToken(token: string): void {
    // Apply formatting as tokens arrive
    this.updatePartialMarkdown(token);
    this.highlightGameElements(token);
    this.maintainScrollPosition();
  }
}
```

### Phase 5: Validation & Testing

#### Test Cases
- **Incomplete responses**: Handle cut-off metadata gracefully  
- **Malformed metadata**: Fallback to content-only parsing
- **Large responses**: Ensure streaming performance
- **Edge cases**: Empty responses, metadata-only responses
- **Format mixing**: JSON fallback for compatibility

#### Performance Requirements
- **Latency**: First tokens visible within 200ms
- **Streaming rate**: No noticeable lag during token arrival
- **Memory usage**: Efficient buffer management
- **Error recovery**: Graceful handling of parse failures

## Implementation Timeline

### Week 1: Foundation
- [ ] Define format specification
- [ ] Create basic markdown parser
- [ ] Implement metadata extraction
- [ ] Update response interfaces

### Week 2: Core Integration  
- [ ] Update LLMDirector prompt templates
- [ ] Implement streaming parser
- [ ] Add progressive markdown rendering
- [ ] Test with simple responses

### Week 3: Enhanced Features
- [ ] Add rich text streaming support
- [ ] Implement game element highlighting
- [ ] Polish streaming animations
- [ ] Performance optimization

### Week 4: Testing & Polish
- [ ] Comprehensive testing suite
- [ ] Edge case handling
- [ ] Backward compatibility validation
- [ ] Documentation and examples

## Risk Mitigation

### LLM Compliance
**Risk**: Models may not consistently follow new format
**Mitigation**: 
- Provide clear examples in prompts
- Implement format validation
- Fallback to JSON parsing on detection

### Performance Impact
**Risk**: Real-time parsing affects UI responsiveness  
**Mitigation**:
- Efficient streaming algorithms
- Progressive rendering optimizations
- Background processing for metadata

### Backward Compatibility
**Risk**: Breaking existing functionality
**Mitigation**:
- Dual parser support (JSON + Markdown)
- Gradual migration path
- Comprehensive testing

## Success Metrics

### User Experience
- **Perceived Latency**: 50% reduction in time-to-first-content
- **Engagement**: Improved story immersion through streaming
- **Responsiveness**: No UI lag during streaming

### Technical Performance  
- **Streaming Latency**: <200ms first token display
- **Parse Accuracy**: >99% successful metadata extraction
- **Error Recovery**: Graceful fallback for malformed responses

### Development Impact
- **Code Maintainability**: Cleaner separation of content/metadata
- **Extensibility**: Easy addition of new metadata fields
- **Debug Experience**: Human-readable response format

## Next Steps

1. **Approve proposal scope and timeline**
2. **Create feature branch for implementation**
3. **Begin with format specification and basic parser**
4. **Implement streaming infrastructure** 
5. **Test with example stories and iterate**

This proposal provides a path to true streaming responses while maintaining all existing functionality and improving the overall user experience.