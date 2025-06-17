# Friday Night Rain - Ending Test Scenarios

This document maps each test scenario to the ending conditions from the story.

## Story Ending Conditions

From `examples/friday_night_rain.yaml`:

### Global Requirements (ALL endings must meet these):
- "conversation has concluded"
- "the player and/or Alex leaves the cafe"

### Specific Ending Conditions:

1. **connection** (ID: `connection`)
   - When: "player and Alex leave the café together"
   - Test file: `friday-night-rain-connection.yaml`
   - Goal description: "Both you and Alex leave the café together - foster a romantic connection"

2. **missed_chance** (ID: `missed_chance`)
   - When: ["player lets Alex leave without resolution", "conversation spirals into hurt"]
   - Test file: `friday-night-rain-missed-chance.yaml`
   - Goal description: "Let Alex leave without resolution or let conversation spiral into hurt - miss the romantic opportunity"

3. **friendship_preserved** (ID: `friendship_preserved`)
   - When: "player acknowledges the moment but chooses friendship"
   - Test file: `friday-night-rain-friendship.yaml`
   - Goal description: "Acknowledge the moment but choose friendship - preserve the existing relationship without romance"

## Test Coverage

All three endings have corresponding test scenarios that:
- Use the LLM Player framework to simulate player actions
- Target specific ending conditions through goal descriptions
- Allow up to 20 turns to reach the desired ending
- Use Claude 3.5 Sonnet for both player and engine models
- Save full transcripts and debug information for analysis

## Running the Tests

To run an individual test:
```bash
npm run test:scenario -- tests/scenarios/friday-night-rain-connection.yaml
```

To run all Friday Night Rain ending tests:
```bash
npm run test:scenario -- tests/scenarios/friday-night-rain-*.yaml
```