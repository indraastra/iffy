# Prompt Architecture Documentation

This document outlines all the prompts used in the Iffy engine, their structure, when they're used, and how they work together.

## Overview

The Iffy engine uses a layered prompt architecture with two main components:
1. **LangChainDirector** - Handles narrative generation and flag management
2. **ImpressionistEngine** - Orchestrates the overall game flow

## Prompt Flow Diagram

```
Player Input
    ↓
ImpressionistEngine
    ↓
LangChainDirector.processInputStreaming()
    ├── processAction() [Main narrative]
    ├── processSceneTransition() [If flags trigger transition]  
    ├── processEndingAction() [If flags trigger ending]
    └── processPostEndingInput() [After story ends]
```

## Core Prompts

### 1. Action Processing Prompt
**File:** `src/engine/langChainPrompts.ts`  
**Method:** `buildActionInstructionsWithFlagGuidance()`  
**When Used:** Processing normal player actions during gameplay

**Structure:**
```
ROLE: Narrative Architect
STORY CONTEXT: [From story YAML]
GLOBAL GUIDANCE: [From story guidance]
FLAG PROGRESSION: [Current flags and requirements]
NARRATIVE STYLE: [Voice, tone, themes]
WORLD ELEMENTS: [Characters, locations, items]
CURRENT SCENE: [Active scene details]
MEMORIES: [Recent player actions]
CURRENT FLAGS: [Active flag states]

PLAYER ACTION: [Input text]

INSTRUCTIONS:
- Generate narrative response
- Update flags based on action
- Maintain story consistency
```

**Key Features:**
- Organized for optimal prefix caching (static content first)
- Includes flag management instructions
- Contains character behavior states based on flags

### 2. Scene Transition Prompt
**File:** `src/engine/langChainPrompts.ts`  
**Method:** `buildTransitionInstructions()`  
**When Used:** When flag conditions trigger a scene change

**Structure:**
```
[Context from buildContextWithFlagManager]

TRANSITION TASK:
Previous Action: [What player just did]
Previous Response: [Action narrative]
Target Scene: [New scene ID and sketch]

INSTRUCTIONS:
- Create smooth narrative bridge
- Acknowledge player action
- Establish new scene atmosphere
- Maintain narrative momentum
```

**Key Features:**
- Includes previous action response for narrative handoff
- Ensures smooth continuity between scenes
- Preserves player agency acknowledgment

### 3. Ending Prompt
**File:** `src/engine/langChainPrompts.ts`  
**Method:** `buildEndingInstructions()`  
**When Used:** When flag conditions trigger a story ending

**Structure:**
```
[Context from buildContextWithFlagManager]

ENDING TASK:
Player Action: [Final action]
Ending ID: [Which ending triggered]
Ending Sketch: [Narrative guidance for ending]

INSTRUCTIONS:
- Generate powerful conclusion
- Acknowledge player's journey
- Provide emotional closure
- Reference key story moments
```

### 4. Initial Scene Prompt
**File:** `src/engine/langChainPrompts.ts`  
**Method:** `buildInitialSceneInstructions()`  
**When Used:** When establishing the opening scene

**Structure:**
```
[Context from buildContextWithFlagManager]

SCENE ESTABLISHMENT:
Scene ID: [Opening scene]
Scene Sketch: [Atmospheric description]

INSTRUCTIONS:
- Establish atmosphere
- Introduce key elements
- Set narrative tone
- Invite player engagement
```

### 5. Post-Ending Prompt
**File:** `src/engine/langChainDirector.ts`  
**Method:** `processPostEndingInput()`  
**When Used:** After story has ended but player continues

**Structure:**
```
[Full context with storyComplete flag]

PLAYER ACTION: [Post-ending input]

Continue the narrative exploration:
- Acknowledge story has concluded
- Allow reflective exploration
- Maintain character consistency
```

## Schema Enforcement

**File:** `src/schemas/directorSchemas.ts`  
**Schema:** `DirectorResponseSchema`

All prompts must return structured data:
```typescript
{
  narrativeParts: string[],  // Narrative paragraphs
  memories: string[],         // Important events to remember
  importance: number,         // 1-10 importance score
  flagChanges: {             // Flag updates
    values: {
      flag_name: value
    }
  },
  signals: {                 // Special signals
    discovery?: string,
    error?: string
  }
}
```

## Flag Management Instructions

**File:** `src/engine/FlagManager.ts`  
**Method:** `generateFlagManagementInstructions()`

Included in all action prompts:
```
FLAG MANAGEMENT:
- Current flags: [List of active flags with values]
- Available flags: [Flags that can be set]
- Requirements: [Dependencies between flags]
- Update format: { "flag_name": value }
```

## Context Building

### Static vs Dynamic Content
The prompts are carefully structured for caching optimization:

**Static (Cacheable):**
- Story context
- Global guidance  
- Character definitions
- Location descriptions
- Narrative style

**Dynamic (Changes per request):**
- Current flags
- Recent memories
- Player action
- Current scene state

### Memory Context
**File:** `src/engine/memoryManager.ts`

Memories are included as:
- Full recent memories (last 5-10 actions)
- Summarized older memories
- Key story moments always retained

## Prompt Optimization Strategies

### 1. Prefix Caching
- Static content placed first for Gemini/Anthropic caching
- Dynamic content at the end

### 2. Temperature Settings
- Action processing: 0.7 (creative)
- Schema repair: 0.1 (precise)
- Flag evaluation: 0.3 (balanced)

### 3. Token Management  
- Automatic memory summarization when context grows
- Progressive detail reduction for older events
- Critical moments preserved in full

## Error Handling

### Malformed Response Repair
**File:** `src/engine/langChainDirector.ts`  
**Method:** `repairAndRetryStructuredRequest()`

When initial parsing fails:
1. Extract malformed response
2. Send repair prompt with schema
3. Use temperature 0.1 for precision
4. Fall back to safe default if repair fails

## Testing & Debugging

### Debug Tools
- `npm run debug-classifier` - Test classification prompts
- `npm run test:llm-player` - Test full prompt flows
- Debug pane shows real-time prompt/response

### Prompt Validation
Each prompt type has corresponding tests:
- `src/tests/langChainDirector.test.ts`
- `src/tests/impressionistEngine.test.ts`
- `src/tests/flagSystemIntegration.test.ts`

## Best Practices

### When Modifying Prompts

1. **Maintain Structure:** Keep static/dynamic separation
2. **Update Tests:** Ensure tests reflect prompt changes
3. **Schema Sync:** Update DirectorResponseSchema if needed
4. **Document Changes:** Update this file and inline comments
5. **Test Coverage:** Run integration tests with actual LLMs

### Adding New Prompt Types

1. Add method to `LangChainPrompts` class
2. Define structured response schema
3. Add processing method to `LangChainDirector`
4. Wire up in `ImpressionistEngine`
5. Add tests and documentation

## Synchronization Strategy

To keep prompts synchronized with documentation:

1. **Inline Documentation:** Each prompt method has JSDoc comments
2. **Schema Comments:** Schema definitions include descriptions
3. **Test Examples:** Tests serve as usage documentation
4. **Version Tracking:** CHANGELOG.md tracks prompt changes

### Automated Sync Points

Key files that must stay synchronized:
- `src/engine/langChainPrompts.ts` ← → `docs/PROMPTS.md`
- `src/schemas/directorSchemas.ts` ← → Schema section here
- `src/engine/FlagManager.ts` ← → Flag instruction section

When any of these files change, update corresponding documentation.