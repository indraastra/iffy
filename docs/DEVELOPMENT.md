# Development Guide

## Building and Running

### Development Server

Start the development server with hot reload:
```bash
npm run dev
```

This starts the Vite development server for the web interface at `http://localhost:5173`.

### Building for Production

Build the application for production:
```bash
npm run build
```

This will:
1. Bundle example stories using `bundle-examples.ts`
2. Compile TypeScript
3. Build optimized assets with Vite
4. Copy story files from `public/stories/` to `dist/stories/`

The production build is configured to run under the `/iffy/` base path for GitHub Pages deployment.

### Testing Production Build Locally

To test the production build with the correct base path:
```bash
npm run preview
```

This serves the built application at `http://localhost:4173/iffy/`, simulating the GitHub Pages environment.

### Type Checking

Run TypeScript type checking without compilation:
```bash
npm run type-check
```

### Story Validation

Validate story YAML files for syntax and structure:
```bash
npm run validate-story public/stories/friday_night_rain.yaml
```

Note: Example stories have been moved from `examples/` to `public/stories/` to ensure they're included in production builds.

## Running Tests

### Matrix Test Framework (Recommended)

The Matrix Test Framework runs scenarios across multiple AI model configurations to test reliability and performance.

**Test a single scenario with quick setup:**
```bash
npm run test:matrix -- --scenario tests/scenarios/friday-night-rain-connection.yaml --suite quick
```

**Test all scenarios for a story:**
```bash
npm run test:matrix -- --scenarios "tests/scenarios/friday-night-rain-*.yaml" --suite comprehensive
```

**Custom model combinations:**
```bash
npm run test:matrix -- tests/scenarios/*.yaml \
  --engine-profiles anthropic,google \
  --player-profiles standard \
  --parallel 2
```

**Available test suites:**
- `quick` - Fast test with Anthropic models only
- `standard` - Test across Anthropic and Google
- `comprehensive` - Test across all three providers
- `full` - Complete matrix with all model variations

**Model profiles:**
- **Engine profiles**: `anthropic`, `google`, `openai` (dual-model configs)
- **Player profiles**: `basic`, `standard`, `advanced`, `google-player`, `openai-player`

### Single Scenario Tests (Legacy)

For debugging individual scenarios:

**Basic usage:**
```bash
npm run test:llm-player tests/scenarios/[scenario-file]
```

**Auto mode (non-interactive):**
```bash
npm run test:llm-player:auto tests/scenarios/[scenario-file]
```

**Alternative auto mode syntax:**
```bash
npx tsx tests/integration/llm-player/run-test.ts --auto tests/scenarios/[scenario-file]
```

**Available scenarios:**
- `tests/scenarios/friday-night-rain-connection.yaml` - Romance story connection ending
- `tests/scenarios/friday-night-rain-missed-chance.yaml` - Romance story missed chance ending  
- `tests/scenarios/friday-night-rain-friendship.yaml` - Romance story friendship ending
- `tests/scenarios/test-chamber-perfect-exit.yaml` - Logic puzzle test
- `tests/scenarios/test-chamber-incomplete-exit.yaml` - Logic puzzle incomplete test

### Standard Unit Tests

```bash
npm run test           # Watch mode
npm run test:run       # One-time run
npm run test:ui        # Visual interface
```

**Test Coverage Areas:**
- **Flag System**: Comprehensive tests for flag types, dependencies, and conditions
- **LangChain Director**: AI response handling and flag updates
- **Memory Manager**: Context tracking and summarization
- **Story Parser**: YAML validation and structure checking
- **Integration Tests**: End-to-end scenario testing with flag transitions

### Story Validation

```bash
npm run validate-story public/stories/[story-file].yaml
```

## Environment Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file with API keys:
   ```
   ANTHROPIC_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   GOOGLE_API_KEY=your_key_here
   ```

### First Run

Start the development server:
```bash
npm run dev
```

The web interface will be available at `http://localhost:5173`.

## Test Output

### Matrix Test Reports

Matrix tests generate comprehensive reports in `tests/results/` with:
- `matrix-[timestamp].md` - Readable report with tables and analysis
- `matrix-[timestamp].html` - Styled HTML report for viewing in browser
- `matrix-[timestamp].json` - Raw data for programmatic analysis

The reports include:
- **Summary tables** with success rates and costs per model configuration
- **Engine profile comparison** showing reliability vs cost trade-offs  
- **Player profile analysis** showing which test players work best
- **Scenario breakdown** with detailed results for each story ending
- **Failure analysis** with links to detailed logs
- **Recommendations** for optimal model configurations

### Single Test Logs

Individual LLM player tests generate logs in `tests/logs/` with:
- `full-transcript.md` - Complete game transcript
- `debug.json` - Detailed debugging information  
- `summary.yaml` - Test results summary

## Model Configuration

The test framework uses profiles defined in `tests/config/model-profiles.yaml`:

- **Engine profiles** define dual-model configs (cost model for classification + quality model for generation)
- **Player profiles** define the test player model independently
- **Test suites** combine profiles for different testing scenarios (quick, standard, comprehensive, full)

## Debugging and Development Tools

### ActionClassifier Debug Tool

Test ActionClassifier prompts directly against models:
```bash
npm run debug-classifier
```

### Flag System Debugging

The enhanced flag system supports debugging through:

1. **Debug Pane**: Real-time flag state visualization
   - Shows all active flags with their current values
   - Color-coded by type (boolean, string, number)
   - Updates live as the story progresses

2. **Flag Manager API**:
   ```typescript
   flagManager.getAllFlags()        // Get all current flag values
   flagManager.getStoryFlags()      // Get flags excluding location flags
   flagManager.checkConditions()    // Test flag conditions
   flagManager.getDebugString()     // Get formatted debug output
   ```

3. **Test Utilities**:
   ```bash
   npm run test src/tests/flagManager.test.ts    # Run flag system tests
   npm run test src/tests/flagSystemIntegration.test.ts  # Integration tests
   ```

This tool helps debug classification failures by testing different temperatures and model configurations.

### Prompt Testing

Test individual prompts against models:
```bash
npm run test-prompt
```

### Documentation Server

Serve documentation locally:
```bash
npm run docs:serve
```

Available at `http://localhost:8080`