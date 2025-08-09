# **PRD: Choice-Driven Stories**

## Executive Summary

The Emergent Narrative Engine enables authors to create interactive fiction by writing a single **Narrative Outline** in plain English. For each playthrough, the system's LLM-powered compiler interprets this outline to generate a **unique, self-contained story structure**, including a linear sequence of scenes and a set of corresponding, machine-readable ending conditions. At runtime, this unique structure guides the dynamic generation of emergent dialogue and choices, creating a rich, replayable experience that preserves the author's core intent without requiring them to write a single line of code or structured data.

## Problem Statement

Creating interactive fiction currently requires authors to either:

  - Write exhaustive branching narratives with every possible path
  - Learn complex authoring tools and specialized syntax
  - Accept rigid, predetermined story structures

This creates high barriers to entry and limits story replayability. Authors want to focus on storytelling, not programming or defining complex data structures.

## Solution Overview

The Emergent Narrative Engine uses a hybrid approach where roles are perfectly separated:

  - **Human Authoring**: The author provides the creative soul of the story in a single, prose-based outline.
  - **LLM as Architect**: At the start of each playthrough, the LLM acts as a story architect, reading the author's outline and generating a complete, logical game structure for that session.
  - **Deterministic Engine**: The engine executes the LLM-generated structure, managing state and flow with perfect reliability.
  - **LLM as Narrator**: At runtime, the LLM acts as a narrator, generating dynamic content within the established structure.

## System Architecture

### Core Components

1.  **Story Compiler (Per-Playthrough)**: At the start of each game, reads the author's Markdown and uses an LLM to generate a unique Story Structure (JSON).
2.  **State Manager**: Tracks all game variables deterministically for the current playthrough.
3.  **Content Generator**: LLM that creates scene content, dialogue, and choices based on the run-specific structure.
4.  **Sequence Controller**: Manages the linear progression of scenes and ending conditions based on the run-specific structure.

### Data Flow

```
Author's Narrative Outline (Markdown)
     ↓ [Player starts new game]
LLM-Powered Story Compiler
     ↓
Unique Story Structure for this Run (JSON)
     ↓
Runtime Engine
     ├── State Manager
     ├── Sequence Controller
     ├── Content Generator
     └── Effect Applicator
```

## Story Definition Format

### Author Input

The author provides **only one component**: a **Narrative Outline** written in Markdown. They describe the plot, characters, and possible outcomes in natural language.

#### Example Author Input

```markdown
# The Lighthouse Keeper

## Summary
You've kept the lighthouse alone for twenty years. Tonight, during a terrible storm, someone is knocking at the door. It's your child whom you haven't seen since they were young—they're injured and need shelter, but they don't recognize you.

## Key Elements
The story is about whether you reveal your identity before they leave in the morning. The core conflict is the desire to reconnect versus the fear of rejection. The visitor's trust in you should be a key factor. Time is also important, as the story ends when the storm passes at dawn.

## Potential Endings
A good ending happens if you reveal your identity and have earned their complete trust, leading to a hopeful reconciliation.

A sad ending happens if time runs out and you never revealed your secret. They leave, and you remain alone with your thoughts.

A tense ending could occur if you reveal yourself but haven't earned their trust, leading to a difficult and uncertain confrontation.
```

### The Per-Playthrough Compilation Process

When a player starts a new game, the engine sends the author's outline to the LLM with a comprehensive directive:

> "Read the following narrative outline. Generate a complete JSON 'Story Structure' for a single, unique playthrough.
>
> 1.  Define `initial_state` variables based on the text.
> 2.  Generate an ordered `scene_sequence` of 3-5 scenes that tells a complete story. For each scene, provide a unique `id` and a narrative `goal`.
> 3.  Based on the 'Potential Endings' prose, define a list of `endings`. For each ending, provide an `id`, a `tone`, and a logical `condition` string using the state variables that would trigger it."

#### Example Generated Story Structure (For One Specific Run)

This JSON is **produced entirely by the LLM** at the start of a playthrough.

```json
{
  "title": "The Lighthouse Keeper",
  "initial_state": {
    "visitor_trust": 0,
    "identity_revealed": false,
    "hours_until_dawn": 6
  },
  "scene_sequence": [
    { "id": "arrival_in_storm", "goal": "Let the stranger in and assess their condition." },
    { "id": "an_uneasy_truce", "goal": "Provide comfort and build initial trust." },
    { "id": "a_shared_memory", "goal": "Hint at a shared past without revealing the secret, testing the visitor's reaction." },
    { "id": "the_moment_of_truth", "goal": "The storm is subsiding; the player must decide whether to reveal their identity." }
  ],
  "endings": [
    {
      "id": "reconciliation",
      "tone": "bittersweet but hopeful",
      "condition": "identity_revealed && visitor_trust >= 5"
    },
    {
      "id": "confrontation",
      "tone": "difficult and uncertain",
      "condition": "identity_revealed && visitor_trust < 5"
    },
    {
      "id": "secret_kept",
      "tone": "melancholic",
      "condition": "hours_until_dawn <= 0 && !identity_revealed"
    }
  ]
}
```

## Runtime Behavior

The engine executes the unique story structure generated for the current session.

### Scene Progression and Content Generation

The engine progresses linearly through the `scene_sequence`. For each scene, it uses the LLM to generate narrative beats and choices "just-in-time." The prompt to the LLM always includes the scene's `goal` and the current game `state` to ensure the generated content is purposeful and context-aware. A scene is considered complete when its narrative goal is fulfilled, as determined by state changes from player choices.

### Ending Evaluation

After every player choice, the engine applies the `effects` to the state and then iterates through the `endings` list that was generated for this playthrough. It evaluates each `condition` string against the current state. If a condition is met, the corresponding ending is triggered, and the story concludes.

## Key Design Principles

1.  **Author as Vision-Holder**: The author's sole focus is on the creative vision: crafting a compelling narrative premise, defining characters, and describing the thematic possibilities of the story.
2.  **LLM as Architect and Narrator**: The LLM serves two distinct roles. First, as an architect, it interprets the author's vision to build a unique, logical story structure for each playthrough. Second, as a narrator, it populates that structure with dynamic, emergent content at runtime.
3.  **Engine as Executor**: The engine is the deterministic foundation. It reliably manages state, executes the LLM-defined sequence, and evaluates the LLM-defined conditions, ensuring the game is always functional and logical.
4.  **Total Emergence**: By generating both the story's high-level structure and its low-level content for each playthrough, the system delivers a maximally emergent and replayable narrative experience.