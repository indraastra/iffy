# Multi-Model Support Design Proposal

## Overview

This proposal outlines how to extend Iffy to support multiple LLM providers (OpenAI, Google, Cohere, etc.) while maintaining our "Bring Your Own Model" philosophy. The implementation uses LangChain.js to provide a unified interface across providers.

## Goals

1. **Simple for Players**: One-click model switching in settings
2. **Minimal Code Changes**: Reuse existing `AnthropicService` interface
3. **Cost Effective**: Keep existing fallback logic for Anthropic models
4. **Developer Friendly**: Clear implementation path for junior engineers

## Implementation Plan

### Phase 1: Core Service Updates

#### 1.1 Install Dependencies

```bash
npm install langchain @langchain/anthropic @langchain/openai @langchain/google-genai
```

#### 1.2 Create Provider Types

Create `src/services/llm/types.ts`:

```typescript
export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'cohere';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
}

export interface ModelOption {
  provider: LLMProvider;
  model: string;
  displayName: string;
  description: string;
}

// Popular models for quick selection
export const POPULAR_MODELS: ModelOption[] = [
  // Anthropic
  {
    provider: 'anthropic',
    model: 'claude-opus-4',
    displayName: 'Claude Opus 4',
    description: 'Most intelligent, highest quality'
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    displayName: 'Claude Sonnet 4',
    description: 'Balanced performance and cost'
  },
  {
    provider: 'anthropic',
    model: 'claude-haiku-3.5',
    displayName: 'Claude Haiku 3.5',
    description: 'Fast and cost-effective'
  },
  // OpenAI
  {
    provider: 'openai',
    model: 'gpt-4.1',
    displayName: 'GPT-4.1',
    description: 'Latest general-purpose model'
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    description: 'Best value for most tasks'
  },
  {
    provider: 'openai',
    model: 'o3-mini',
    displayName: 'o3-mini',
    description: 'Advanced reasoning capabilities'
  },
  // Google
  {
    provider: 'google',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'State-of-the-art reasoning'
  },
  {
    provider: 'google',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    description: 'Balanced multimodal model'
  },
  {
    provider: 'google',
    model: 'gemini-2.0-flash-lite',
    displayName: 'Gemini Flash Lite',
    description: 'Most cost-effective option'
  }
];
```

#### 1.3 Create Multi-Model Service

Create `src/services/multiModelService.ts`:

```typescript
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LLMProvider, LLMConfig } from './llm/types';

interface LLMResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export class MultiModelService {
  private currentModel: BaseChatModel | null = null;
  private currentConfig: LLMConfig | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    this.loadSavedConfig();
  }

  private loadSavedConfig(): void {
    const saved = localStorage.getItem('iffy_llm_config');
    if (saved) {
      try {
        const config = JSON.parse(saved) as LLMConfig;
        this.setConfig(config);
      } catch (e) {
        console.error('Failed to load saved LLM config:', e);
      }
    }
  }

  public setConfig(config: LLMConfig): void {
    // Cancel any active requests when switching models
    this.cancelActiveRequests();
    
    this.currentConfig = config;
    localStorage.setItem('iffy_llm_config', JSON.stringify(config));
    
    // Initialize the appropriate model
    try {
      switch (config.provider) {
        case 'anthropic':
          this.currentModel = new ChatAnthropic({
            anthropicApiKey: config.apiKey,
            model: config.model,
            temperature: 0.7,
            maxTokens: 4000,
          });
          break;
          
        case 'openai':
          this.currentModel = new ChatOpenAI({
            openAIApiKey: config.apiKey,
            model: config.model,
            temperature: 0.7,
            maxTokens: 4000,
          });
          break;
          
        case 'google':
          this.currentModel = new ChatGoogleGenerativeAI({
            apiKey: config.apiKey,
            model: config.model,
            temperature: 0.7,
            maxTokens: 4000,
          });
          break;
          
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    } catch (error) {
      this.currentModel = null;
      throw error;
    }
  }

  public isConfigured(): boolean {
    return this.currentModel !== null && this.currentConfig !== null;
  }

  public getConfig(): LLMConfig | null {
    return this.currentConfig;
  }

  public async makeRequest(prompt: string): Promise<string> {
    const response = await this.makeRequestWithUsage(prompt);
    return response.content;
  }

  public async makeRequestWithUsage(prompt: string): Promise<LLMResponse> {
    if (!this.currentModel || !this.currentConfig) {
      throw new Error('No model configured. Please set up your API key in Settings.');
    }

    this.cancelActiveRequests();
    this.abortController = new AbortController();

    try {
      // Special handling for Anthropic to preserve fallback behavior
      if (this.currentConfig.provider === 'anthropic') {
        return await this.makeAnthropicRequestWithFallback(prompt);
      }

      // Standard request for other providers
      const response = await this.currentModel.invoke(
        [new HumanMessage(prompt)],
        { signal: this.abortController.signal }
      );

      return this.parseResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw this.normalizeError(error);
    } finally {
      this.abortController = null;
    }
  }

  private async makeAnthropicRequestWithFallback(prompt: string): Promise<LLMResponse> {
    const fallbackModels = [
      this.currentConfig!.model,
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307'
    ];

    let lastError: any;
    
    for (let i = 0; i < fallbackModels.length; i++) {
      try {
        const model = new ChatAnthropic({
          anthropicApiKey: this.currentConfig!.apiKey,
          model: fallbackModels[i],
          temperature: 0.7,
          maxTokens: 4000,
        });

        const response = await model.invoke(
          [new HumanMessage(prompt)],
          { signal: this.abortController!.signal }
        );

        if (i > 0) {
          console.log(`✅ Anthropic fallback succeeded with: ${fallbackModels[i]}`);
        }

        return this.parseResponse(response);
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled');
        }

        const isOverload = error.message?.includes('overload') ||
                          error.message?.includes('503') ||
                          error.message?.includes('429');

        if (isOverload && i < fallbackModels.length - 1) {
          console.warn(`⚠️ Model ${fallbackModels[i]} overloaded, trying ${fallbackModels[i + 1]}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('All Anthropic models failed');
  }

  private parseResponse(response: any): LLMResponse {
    const content = response.content || '';
    const metadata = response.response_metadata || {};
    const usage = metadata.token_usage || metadata.usage || {};

    // Normalize token field names across providers
    const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
    const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);

    return {
      content,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens
      }
    };
  }

  private normalizeError(error: any): Error {
    const message = error.message || 'Unknown error';
    
    if (message.includes('401') || message.includes('Unauthorized')) {
      return new Error('Invalid API key. Please check your settings.');
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return new Error('Rate limit exceeded. Please wait a moment.');
    }
    if (message.includes('402') || message.includes('insufficient')) {
      return new Error('API quota exceeded. Please check your billing.');
    }
    
    return new Error(`LLM Error: ${message}`);
  }

  public cancelActiveRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
```

### Phase 2: Update Existing Code

#### 2.1 Modify AnthropicService

Update `src/services/anthropicService.ts` to delegate to MultiModelService:

```typescript
import { MultiModelService } from './multiModelService';
import { LLMConfig } from './llm/types';

export class AnthropicService {
  private multiModelService: MultiModelService;

  constructor() {
    this.multiModelService = new MultiModelService();
    
    // Migrate existing Anthropic API key if present
    this.migrateExistingKey();
  }

  private migrateExistingKey(): void {
    const existingKey = localStorage.getItem('iffy_api_key');
    if (existingKey && !localStorage.getItem('iffy_llm_config')) {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        apiKey: existingKey
      };
      this.multiModelService.setConfig(config);
    }
  }

  // Preserve existing interface
  public setApiKey(apiKey: string): void {
    const currentConfig = this.multiModelService.getConfig();
    const config: LLMConfig = {
      provider: currentConfig?.provider || 'anthropic',
      model: currentConfig?.model || 'claude-sonnet-4',
      apiKey
    };
    this.multiModelService.setConfig(config);
  }

  public isConfigured(): boolean {
    return this.multiModelService.isConfigured();
  }

  public async makeRequest(prompt: string, options?: { model?: string }): Promise<string> {
    // For backward compatibility, temporarily switch model if specified
    if (options?.model) {
      const currentConfig = this.multiModelService.getConfig();
      if (currentConfig && currentConfig.provider === 'anthropic') {
        const tempConfig = { ...currentConfig, model: options.model };
        this.multiModelService.setConfig(tempConfig);
        const result = await this.multiModelService.makeRequest(prompt);
        this.multiModelService.setConfig(currentConfig); // Restore
        return result;
      }
    }
    
    return this.multiModelService.makeRequest(prompt);
  }

  public async makeRequestWithUsage(prompt: string, options?: { model?: string }) {
    // Similar temporary model switching for compatibility
    if (options?.model) {
      const currentConfig = this.multiModelService.getConfig();
      if (currentConfig && currentConfig.provider === 'anthropic') {
        const tempConfig = { ...currentConfig, model: options.model };
        this.multiModelService.setConfig(tempConfig);
        const result = await this.multiModelService.makeRequestWithUsage(prompt);
        this.multiModelService.setConfig(currentConfig); // Restore
        return result;
      }
    }
    
    return this.multiModelService.makeRequestWithUsage(prompt);
  }

  public cancelActiveRequests(): void {
    this.multiModelService.cancelActiveRequests();
  }

  // New method for UI to access multi-model functionality
  public getMultiModelService(): MultiModelService {
    return this.multiModelService;
  }
}
```

### Phase 3: UI Updates

#### 3.1 Update Settings Component

Add model selection to `src/ui/settingsModal.ts`:

```typescript
import { POPULAR_MODELS, LLMProvider, ModelOption } from '../services/llm/types';

private renderModelSelection(): string {
  const config = this.anthropicService.getMultiModelService().getConfig();
  
  return `
    <div class="setting-group">
      <h3>AI Model</h3>
      
      <div class="model-selector">
        <label>Provider</label>
        <select id="llm-provider" class="setting-input">
          <option value="anthropic" ${config?.provider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
          <option value="openai" ${config?.provider === 'openai' ? 'selected' : ''}>OpenAI (GPT)</option>
          <option value="google" ${config?.provider === 'google' ? 'selected' : ''}>Google (Gemini)</option>
        </select>
      </div>
      
      <div class="model-selector">
        <label>Model</label>
        <select id="llm-model" class="setting-input">
          ${this.renderModelOptions(config?.provider || 'anthropic')}
        </select>
      </div>
      
      <div class="api-key-section">
        <label>API Key</label>
        <input 
          type="password" 
          id="llm-api-key" 
          class="setting-input" 
          value="${config?.apiKey || ''}"
          placeholder="Enter your API key"
        />
        <small class="help-text">
          Get your API key from:
          ${this.getApiKeyHelpLink(config?.provider || 'anthropic')}
        </small>
      </div>
      
      <button id="save-model-config" class="primary-button">
        Save Model Configuration
      </button>
    </div>
  `;
}

private renderModelOptions(provider: LLMProvider): string {
  const models = POPULAR_MODELS.filter(m => m.provider === provider);
  const config = this.anthropicService.getMultiModelService().getConfig();
  
  return models.map(model => `
    <option value="${model.model}" ${config?.model === model.model ? 'selected' : ''}>
      ${model.displayName} - ${model.description}
    </option>
  `).join('');
}

private getApiKeyHelpLink(provider: LLMProvider): string {
  const links = {
    anthropic: '<a href="https://console.anthropic.com/api-keys" target="_blank">Anthropic Console</a>',
    openai: '<a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>',
    google: '<a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>',
    cohere: '<a href="https://dashboard.cohere.ai/api-keys" target="_blank">Cohere Dashboard</a>'
  };
  return links[provider] || 'your provider\'s dashboard';
}
```

### Phase 4: Testing Strategy

#### 4.1 Manual Testing Checklist

- [ ] Anthropic models work with existing stories
- [ ] Can switch to OpenAI and play games
- [ ] Can switch to Google and play games  
- [ ] API key errors show appropriate messages
- [ ] Model fallback still works for Anthropic
- [ ] Settings persist across page reloads
- [ ] Cancel requests when switching models

#### 4.2 Integration Test Architecture

Integration tests verify real gameplay across different models without burning through API quota unnecessarily.

##### Test Setup

```typescript
// tests/integration/multi-model.test.ts
describe('Multi-Model Gameplay Integration', () => {
  // Only run when explicitly enabled
  const RUN_INTEGRATION = process.env.RUN_INTEGRATION_TESTS === 'true';
  
  // API keys from environment (never committed)
  const API_KEYS = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY
  };
  
  beforeAll(() => {
    if (!RUN_INTEGRATION) {
      console.log('⏭️  Skipping integration tests (set RUN_INTEGRATION_TESTS=true)');
      return;
    }
  });
});
```

##### Core Test Categories

**1. Ending Enforcement Across Models**
```typescript
test('all models enforce ending conditions correctly', async () => {
  const testStory = TEST_CHAMBER_STORY; // Our controlled test story
  
  for (const [provider, apiKey] of Object.entries(API_KEYS)) {
    if (!apiKey) continue;
    
    const engine = new GameEngine(testStory, {
      provider,
      apiKey,
      model: getTestModel(provider) // Use cheapest model for tests
    });
    
    // Test: Should NOT trigger ending prematurely
    await engine.input("press red button");
    await engine.input("open door");
    
    expect(engine.hasEnded).toBe(false);
    expect(engine.getLastReasoning()).toMatch(/incomplete|missing|required/i);
    
    // Test: Should trigger correct ending
    await engine.input("press blue and green buttons");
    await engine.input("open door");
    
    expect(engine.hasEnded).toBe(true);
    expect(engine.ending).toBe("perfect_exit");
  }
});
```

**2. Model Behavior Consistency**
```typescript
test('models handle scene transitions consistently', async () => {
  const scenarios = [
    {
      story: FRIDAY_NIGHT_RAIN,
      input: "I love you, Alex",
      shouldEndImmediately: false,
      expectedReasoning: /not left|still in cafe/i
    },
    {
      story: THE_KEY,
      input: "smash the door with a rock",
      expectedScene: "opened_door",
      expectedImportance: { min: 7, max: 9 }
    }
  ];
  
  for (const scenario of scenarios) {
    const results = await testAcrossModels(scenario);
    
    // Verify all models behave similarly
    expect(results.every(r => r.success)).toBe(true);
    expect(new Set(results.map(r => r.outcome))).toHaveLength(1);
  }
});
```

##### Response Caching System

```typescript
class CachedMultiModelService extends MultiModelService {
  private cache = new Map<string, any>();
  private cacheFile = 'tests/fixtures/llm-cache.json';
  
  constructor() {
    super();
    this.loadCache();
  }
  
  private getCacheKey(provider: string, model: string, prompt: string): string {
    const normalized = prompt.trim().toLowerCase();
    return crypto.createHash('md5')
      .update(`${provider}:${model}:${normalized}`)
      .digest('hex');
  }
  
  async makeRequestWithUsage(prompt: string): Promise<LLMResponse> {
    const config = this.getConfig();
    const cacheKey = this.getCacheKey(
      config.provider, 
      config.model, 
      prompt
    );
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`📦 Using cached response for ${config.provider}`);
      return this.cache.get(cacheKey);
    }
    
    // Make real request
    console.log(`🌐 Making real API request to ${config.provider}`);
    const response = await super.makeRequestWithUsage(prompt);
    
    // Cache the response
    this.cache.set(cacheKey, response);
    this.saveCache();
    
    return response;
  }
}
```

##### Test Scenarios Library

```yaml
# tests/scenarios/model-consistency.yaml
scenarios:
  - name: "Ending Enforcement"
    story: "test_chamber"
    steps:
      - input: "press red button"
      - input: "try to exit"
      - expect:
          ended: false
          reasoning_includes: ["incomplete", "requirements"]
      
  - name: "Scene Transitions"  
    story: "sentient_quill"
    steps:
      - input: "examine the quill"
      - expect:
          scene: "partnership_begins"
      - input: "ask quill about the murder"
      - expect:
          scene_unchanged: true
          narrative_includes: ["poison", "evidence"]
          
  - name: "Memory Consistency"
    story: "friday_night_rain"
    interactions: 20  # Generate many to test memory
    verify:
      - memories_include: "Alex nervous"
      - memories_count: { max: 10 }
```

##### Running Tests

```bash
# Local development with caching
USE_CACHE=true RUN_INTEGRATION_TESTS=true npm test:integration

# Test specific provider
RUN_INTEGRATION_TESTS=true TEST_PROVIDER=openai npm test:integration

# CI/CD - manual workflow only
# .github/workflows/integration-tests.yml
name: Multi-Model Integration Tests
on:
  workflow_dispatch:
    inputs:
      providers:
        description: 'Providers to test (comma-separated)'
        default: 'anthropic,openai'
        
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Integration Tests
        env:
          RUN_INTEGRATION_TESTS: true
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
        run: |
          npm test:integration -- --providers=${{ inputs.providers }}
          
      - name: Upload Test Report
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-report
          path: tests/reports/
```

##### Cost Tracking

```typescript
class IntegrationTestReporter {
  private costs = new Map<string, number>();
  
  // Pricing per 1M tokens (as of June 2025)
  private modelRates = {
    // Anthropic
    'claude-opus-4': { input: 15.00, output: 75.00 },
    'claude-sonnet-4': { input: 3.00, output: 15.00 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 }, // Legacy
    'claude-haiku-3.5': { input: 0.80, output: 4.00 },
    'claude-3-haiku-20240307': { input: 0.80, output: 4.00 }, // Legacy
    
    // OpenAI
    'gpt-4.1': { input: 3.70, output: 11.10 },
    'gpt-4.1-mini': { input: 1.85, output: 5.55 },
    'gpt-4.1-nano': { input: 0.925, output: 2.775 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'o3-mini': { input: 1.10, output: 4.40 },
    
    // Google
    'gemini-2.5-pro': { input: 1.25, output: 10.00 }, // ≤200K context
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 }, // ≤128K context
    'gemini-1.5-flash': { input: 0.075, output: 0.30 }, // ≤128K context
    
    // Test models (cheapest per provider)
    'test-anthropic': { input: 0.80, output: 4.00 }, // Haiku 3.5
    'test-openai': { input: 0.15, output: 0.60 },    // GPT-4o-mini
    'test-google': { input: 0.075, output: 0.30 }    // Gemini Flash-Lite
  };
  
  trackUsage(provider: string, model: string, usage: any) {
    const rates = this.modelRates[model] || this.modelRates[`test-${provider}`];
    if (!rates) {
      console.warn(`Unknown model rates for ${model}`);
      return;
    }
    
    // Convert from per-million to actual cost
    const cost = (usage.input_tokens * rates.input / 1_000_000) + 
                 (usage.output_tokens * rates.output / 1_000_000);
    
    const key = `${provider}/${model}`;
    this.costs.set(key, (this.costs.get(key) || 0) + cost);
  }
  
  generateReport() {
    console.log('\n📊 Integration Test Report:');
    console.log('Model Costs:');
    
    let totalCost = 0;
    for (const [modelKey, cost] of this.costs) {
      console.log(`  ${modelKey}: $${cost.toFixed(4)}`);
      totalCost += cost;
    }
    
    console.log(`\nTotal Cost: $${totalCost.toFixed(4)}`);
    
    // Warn if costs are high
    if (totalCost > 1.00) {
      console.warn('⚠️  High test costs detected! Consider using more caching.');
    }
  }
}

// Helper to get cheapest test model per provider
function getTestModel(provider: string): string {
  const testModels = {
    anthropic: 'claude-haiku-3.5',      // $0.80/$4.00
    openai: 'gpt-4o-mini',              // $0.15/$0.60
    google: 'gemini-2.0-flash-lite'     // $0.075/$0.30
  };
  return testModels[provider] || POPULAR_MODELS
    .filter(m => m.provider === provider)[0]?.model;
}
```

## Migration Path

1. **Week 1**: Implement core MultiModelService
2. **Week 2**: Update AnthropicService wrapper
3. **Week 3**: Add UI components
4. **Week 4**: Testing and bug fixes

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing games | AnthropicService wrapper preserves interface |
| Different model behaviors | Test with "The Test Chamber" story |
| API key management | Clear error messages and help links |
| Cost overruns | Keep free tier models in quick selection |

## Success Metrics

- Users can switch between 3+ providers without errors
- Existing Anthropic users experience no breaking changes
- Settings UI remains simple and intuitive
- All example stories work across providers

## Next Steps

1. Review this proposal with the team
2. Create GitHub issues for each phase
3. Assign to junior engineer with clear subtasks
4. Set up test API keys for development