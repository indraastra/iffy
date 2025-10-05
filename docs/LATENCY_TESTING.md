# Latency Testing Guide

The latency testing script (`scripts/latency-test.ts`) measures performance characteristics across different AI providers and models for interactive fiction scenarios.

## Usage

```bash
# Run with default settings (5 actions per model)
npm run test:latency

# Run with custom number of actions
npm run test:latency -- --actions=10

# Show help
npm run test:latency -- --help
```

## Environment Setup

The script requires API keys for the providers you want to test:

```bash
# In your .env file or environment
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key  
GOOGLE_API_KEY=your_google_key
```

You only need the API keys for the providers you want to test. Missing keys will simply skip those models.

## Test Models

The script tests a balanced selection of quality and cost models:

### Anthropic
- **Claude Sonnet 4.5** (quality tier)
- **Claude 3.5 Haiku** (cost tier)

### OpenAI  
- **GPT-4o** (quality tier)
- **GPT-4o Mini** (cost tier)

### Google
- **Gemini 2.5 Pro** (quality tier) 
- **Gemini 2.5 Flash** (cost tier)

## Test Scenario

The script runs realistic interactive fiction scenarios:

1. **Story**: Uses "Intermission: Side A" as the test story
2. **Actions**: Runs a series of typical player actions:
   - "look around"
   - "walk over and say hello"
   - "ask about the weather"
   - "examine the room carefully"
   - "say \"I need to think about this\""

3. **Fresh State**: Each action uses a fresh game engine instance to ensure consistent testing conditions

## Output

The script generates a comprehensive report including:

### Individual Model Results
- Average, minimum, maximum, and P95 latency
- Success rate (percentage of successful responses)
- Token usage (input/output tokens per request)
- Cost per test run

### Summary Statistics
- Fastest and slowest models
- Total cost across all tests
- Overall success rate
- Quality vs Cost tier analysis

### Example Output
```
==================================================
🏁 LATENCY TEST RESULTS  
==================================================
| Model                  | Tier    | Avg (ms) | Min (ms) | Max (ms) | P95 (ms) | Success % | Tokens In/Out | Cost ($) |
|------------------------|---------|----------|----------|----------|----------|-----------|---------------|----------|
| Claude 3.5 Haiku      | cost    |      850 |      720 |     1200 |     1150 |     100.0% | 1250/185     | $0.0023  |
| GPT-4o Mini           | cost    |      920 |      800 |     1350 |     1300 |     100.0% | 1180/210     | $0.0018  |
| Claude Sonnet 4.5     | quality |     1200 |      950 |     1800 |     1750 |     100.0% | 1300/220     | $0.0085  |
| GPT-4o                | quality |     1350 |     1100 |     2100 |     2000 |     100.0% | 1220/195     | $0.0095  |
| Gemini 2.5 Flash     | cost    |     1450 |     1200 |     2200 |     2100 |      80.0% | 1100/180     | $0.0012  |
| Gemini 2.5 Pro       | quality |     1650 |     1300 |     2800 |     2700 |      80.0% | 1150/200     | $0.0045  |

📊 SUMMARY:
🏆 Fastest: Claude 3.5 Haiku (850ms avg)
🐌 Slowest: Gemini 2.5 Pro (1650ms avg)  
💰 Total Cost: $0.0278
✅ Overall Success Rate: 93.3%

📈 TIER ANALYSIS:
🎯 Quality Models Average: 1400ms
💸 Cost Models Average: 1073ms
```

## Use Cases

### Performance Benchmarking
- Compare latency across different providers
- Identify the fastest models for real-time interactions
- Monitor performance changes over time

### Cost Analysis
- Compare token usage and costs between models
- Find the most cost-effective options
- Budget planning for production deployments

### Quality vs Speed Trade-offs
- Understand performance differences between quality and cost tiers
- Make informed decisions about model selection
- Balance user experience with operational costs

### Reliability Testing
- Monitor success rates across different models
- Identify models with consistency issues
- Test API reliability under realistic loads

## Technical Details

### Timing Methodology
- Measures end-to-end latency from request start to response completion
- Includes network latency, API processing time, and response parsing
- Uses fresh game engine instances to avoid caching effects

### Token Counting
- Tracks both input and output tokens for accurate cost calculation
- Uses provider-specific token counting when available
- Includes structured output overhead in measurements

### Error Handling
- Gracefully handles API errors and timeouts
- Reports success rates to identify reliability issues
- Continues testing other models even if some fail

### Safety Features
- Includes delays between requests to avoid rate limiting
- Uses reasonable token limits to prevent runaway costs
- Provides cost estimates before running expensive tests

## Configuration

You can modify the test configuration by editing `scripts/latency-test.ts`:

- **TEST_MODELS**: Add or remove models to test
- **TEST_ACTIONS**: Customize the test actions
- **testStory**: Change the story used for testing
- **Sleep delays**: Adjust timing between requests

## Troubleshooting

### Common Issues

**Missing API Keys**: Models will be skipped if API keys are not provided
**Rate Limiting**: Increase delays between requests if you hit rate limits  
**Token Limits**: Models may fail if responses exceed token limits
**Network Issues**: Retries are not implemented - network failures will show as errors

### Debug Mode

For debugging, you can:
1. Reduce the number of actions: `--actions=1`
2. Check console output for detailed error messages
3. Verify API keys are correctly set in your environment
4. Test individual providers by commenting out others in TEST_MODELS

## Contributing

When adding new models or providers:

1. Add the model configuration to `TEST_MODELS`
2. Ensure proper API key handling in `getApiKey()`
3. Update pricing information if needed
4. Test with a single action first: `--actions=1`