import { readFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';
import { TestScenario, TestCombination, ModelProfiles } from '../core/matrix-types';
import { loadProfiles, getEngineProfile, getPlayerProfile } from './profileLoader';
import { enrichModelConfigWithApiKey } from './apiConfig';

export async function loadScenario(filePath: string): Promise<TestScenario> {
  const content = await readFile(filePath, 'utf-8');
  const data = yaml.load(content) as any;

  // Validate and transform the loaded data
  const scenario: TestScenario = {
    name: data.name || 'Unnamed Test',
    storyFile: data.storyFile,
    goals: data.goals || [],
    maxTurns: data.maxTurns,
    successCriteria: data.successCriteria || {
      allRequiredGoals: true,
      withinTurnLimit: true
    },
    // New profile references
    engineProfile: data.engineProfile,
    playerProfile: data.playerProfile,
    // Legacy direct model specification
    engineModels: data.engineModels,
    playerModel: data.playerModel,
    // Additional settings
    observability: data.observability,
    logging: data.logging
  };

  // Set defaults for goals
  scenario.goals = scenario.goals.map(goal => ({
    ...goal,
    priority: goal.priority || 'required'
  }));

  return scenario;
}

export async function generateTestCombinations(
  scenarioPaths: string[],
  engineProfileNames: string[],
  playerProfileNames: string[],
  profilesPath?: string
): Promise<TestCombination[]> {
  const profiles = await loadProfiles(profilesPath);
  const combinations: TestCombination[] = [];

  for (const scenarioPath of scenarioPaths) {
    const scenario = await loadScenario(scenarioPath);

    for (const engineProfileName of engineProfileNames) {
      const engineProfile = getEngineProfile(profiles, engineProfileName);

      for (const playerProfileName of playerProfileNames) {
        const playerProfile = getPlayerProfile(profiles, playerProfileName);

        combinations.push({
          scenario,
          engineProfile: engineProfileName,
          playerProfile: playerProfileName,
          engineModels: {
            costModel: enrichModelConfigWithApiKey(engineProfile.costModel),
            qualityModel: enrichModelConfigWithApiKey(engineProfile.qualityModel)
          },
          playerModel: enrichModelConfigWithApiKey({
            provider: playerProfile.provider,
            model: playerProfile.model,
            apiKey: playerProfile.apiKey,
            temperature: playerProfile.temperature
          })
        });
      }
    }
  }

  return combinations;
}

export function expandTestCombination(
  scenario: TestScenario,
  profiles: ModelProfiles
): TestCombination {
  // If the scenario has profile references, expand them
  if (scenario.engineProfile && scenario.playerProfile) {
    const engineProfile = getEngineProfile(profiles, scenario.engineProfile);
    const playerProfile = getPlayerProfile(profiles, scenario.playerProfile);

    return {
      scenario,
      engineProfile: scenario.engineProfile,
      playerProfile: scenario.playerProfile,
      engineModels: {
        costModel: enrichModelConfigWithApiKey(engineProfile.costModel),
        qualityModel: enrichModelConfigWithApiKey(engineProfile.qualityModel)
      },
      playerModel: enrichModelConfigWithApiKey({
        provider: playerProfile.provider,
        model: playerProfile.model,
        apiKey: playerProfile.apiKey,
        temperature: playerProfile.temperature
      })
    };
  }

  // Legacy format support
  if (scenario.engineModels && scenario.playerModel) {
    return {
      scenario,
      engineProfile: 'custom',
      playerProfile: 'custom',
      engineModels: {
        costModel: enrichModelConfigWithApiKey(scenario.engineModels.costModel || { provider: 'anthropic', model: 'claude-3-5-haiku-latest' }),
        qualityModel: enrichModelConfigWithApiKey(scenario.engineModels.qualityModel || { provider: 'anthropic', model: 'claude-3-5-sonnet-latest' })
      } as any,
      playerModel: enrichModelConfigWithApiKey(scenario.playerModel)
    };
  }

  throw new Error('Scenario must specify either profile references or direct model configuration');
}