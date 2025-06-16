# Development Guide

## Running Tests

### LLM Player Test Harness

The LLM Player test harness runs automated tests where an LLM acts as a player to test interactive fiction stories.

**Basic usage:**
```bash
npm run test:llm-player tests/scenarios/[scenario-file]
```

**Auto mode (non-interactive):**
```bash
npm run test:llm-player:auto tests/scenarios/[scenario-file]
```

**Available scenarios:**
- `tests/scenarios/friday-night-rain-connection.yaml` - Romance story test
- `tests/scenarios/test-chamber-perfect-exit.yaml` - Logic puzzle test

**Example:**
```bash
npm run test:llm-player:auto tests/scenarios/test-chamber-perfect-exit.yaml
```

### Standard Unit Tests

```bash
npm run test           # Watch mode
npm run test:run       # One-time run
npm run test:ui        # Visual interface
```

### Story Validation

```bash
npm run validate-story examples/[story-file].yaml
```

## Environment Setup

Create `.env` file with API keys:
```
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```

## Test Output

LLM player tests generate logs in `tests/logs/` with:
- `full-transcript.md` - Complete game transcript
- `debug.json` - Detailed debugging information
- `summary.yaml` - Test results summary