# Project "Iffy" - Lessons Learned

*Last Updated: 2025-06-16*

This document chronicles the hard-won insights from developing the Iffy interactive fiction engine. It serves as both a historical record and a guide for future architectural decisions, transforming painful failures into actionable wisdom.

## The Central Challenge: Balancing Control and Emergence

The heart of this project lies in reconciling two opposing forces:
- **Authorial Control**: The need for reliable, deterministic story progression
- **Player Freedom**: The desire for emergent, dynamic narrative experiences

My journey through three major architectural approaches taught me that neither extreme is sustainable. The path forward requires a hybrid approach that leverages the strengths of both philosophies.

## The Evolution of Iffy: Three Architectures, Three Philosophies

### Architecture 1: The Architect (v1.0) - Traditional State Machine with LLM Prose

This initial approach treated the LLM as a sophisticated prose generator within a rigid framework.

**Implementation:**
- LLM analyzes player actions and emits structured flags/state changes
- Engine checks these flags against scene/ending requirements
- When transitions occur, engine makes a second LLM call for narrative prose
- Previous responses are provided to enable smooth transitions

**What Worked:**
- Deterministic and predictable behavior
- Clear separation between logic (engine) and prose (LLM)
- Reliable state management

**What Failed:**
- Noticeable "blips" between initial responses and transitions
- Two-call pattern felt mechanical and broke immersion
- Limited potential for emergent storytelling

### Architecture 2: The Impressionist (v3.x) - Progressive LLM Control

This represented a philosophical shift toward giving the LLM more narrative control. It evolved through three increasingly problematic iterations:

#### Attempt A: The All-in-One Mega Prompt
**Implementation:**
Single prompt asked the LLM to simultaneously:
- Evaluate all transition conditions
- Generate appropriate narrative response
- Either continue the current scene OR transition with elaborated sketches

**What Failed:**
- Unreliable transition triggering
- Poor elaboration of destination sketches
- Cognitive overload in a single prompt

#### Attempt B: The Split Prompt System
**Implementation:**
- First prompt: Generate response and signal if transition needed
- Second prompt (conditional): Generate transitional narrative
- LLM given previous output for narrative continuity

**What Failed:**
- Flaky transition detection
- Narrative "stutters" between prompts
- First prompt unaware of destination sketches, leading to contradictory prose

#### Attempt C: The Cavalier Solution (Current State)
**Implementation:**
- Separate ActionClassifier using cheaper model for logic decisions
- Classifier determines: stay in scene ("action") or transition (specific ID)
- Main LLM generates prose based on classification result

**Why It Seemed Brilliant:**
- Clean separation of concerns
- Cost-effective classification step
- LLM could focus purely on creative prose

**Why It Catastrophically Failed:**
- LLMs cannot reliably evaluate logical conditions
- Real example: With [Green, Blue] buttons pressed, classifier returns `perfect_exit` (requires all 3) instead of `incomplete_exit`
- Model disparities: Gemini 2.0 Flash succeeded, Claude Haiku 3.5 failed 80% of the time
- The fundamental assumption—using an LLM as a logic gate—was flawed

## Core Lessons Learned

### Lesson 1: The LLM is an Interpreter, Not an Executor

The most critical architectural mistake was promoting the LLM from content generator to logic decider.

**LLMs Excel At:**
- Understanding context and nuance
- Interpreting player intent
- Generating creative, contextual prose
- Classifying semantic meaning

**LLMs Fail At:**
- Deterministic logical evaluation
- Consistent state management
- Reliable condition checking
- Reproducible decision-making

**The Rule:** Never allow an LLM's output to be the sole source of truth for critical state changes.

### Lesson 2: The Hybrid Engine is the Answer

Neither pure determinism nor pure emergence creates satisfying interactive fiction. The solution is a hybrid architecture that provides both hard-edged state machine tools and soft atmospheric prompts.

**Correct Division of Labor:**
1. **Player Action → LLM (Interpreter):** Analyzes input, suggests intents and possible trigger satisfactions
   ```json
   {
     "intent": "exit_scene",
     "satisfies_trigger": "when player attempts to leave"
   }
   ```

2. **LLM Output → Engine (Executor):** Makes final decisions using deterministic logic
   ```yaml
   requires: "has_flag:conversation_complete"
   ```

### Lesson 3: Test-Driven Development for Narrative Systems

The speed of LLM-assisted coding enabled massive architectural changes without safety nets, leading directly to the current crisis.

**The Solution: Narrative TDD**
- Implement an "LLM Player" agent with configurable personas
- Create comprehensive test suites for all critical story paths
- Validate every engine change against these tests
- Treat broken tests as immediate red flags, regardless of how "good" the change seems

This isn't a nice-to-have—it's essential for stability in non-deterministic systems.

### Lesson 4: Architecture Must Reflect Philosophy

The codebase itself must support the hybrid approach:

**Dual Trigger System:**
```yaml
# Soft trigger (LLM-interpreted)
leads_to:
  next_scene: "when the player expresses curiosity"

# Hard trigger (engine-enforced)
triggers:
  - if: "player_picks_up_key"
    set_flag: "has_key"
    go_to: "unlock_door_scene"
```

**Transparent State:**
Authors need robust debugging tools showing all flags, inventory, and character states to understand story behavior.

### Lesson 5: Recovery Requires Strategy, Not Panic

When facing critical failures, three recovery strategies exist:

1. **"Scorched Earth" Rollback:** Total reversion—costly and demoralizing
2. **"Archaeological Dig":** Methodical rollback to last-known-good state
3. **"Surgical Retrofit":** Fix forward by carefully reintroducing proven logic

**Best Practice:** 
- Write a failing test that reproduces the bug
- Attempt surgical retrofit first
- Fall back to archaeological dig if needed
- Always work on a new branch

## The Path Forward

The journey from Architect to Impressionist represents increasing—and misplaced—trust in LLM capabilities. Each iteration delegated more core logic to the LLM, and each made the system less reliable.

The lesson is clear: Build a hybrid engine that respects both the deterministic needs of state management and the creative potential of language models. Let each component do what it does best.

This is not a story of failure, but of learning. The broken system taught us exactly where the boundaries lie between machine logic and language understanding. Now we can build something better—something that truly bridges the gap between authorial control and emergent narrative.

The hybrid engine awaits.