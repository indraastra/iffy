import { readFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';
import { TestScenario } from '../core/types';

export async function loadScenario(filePath: string): Promise<TestScenario> {
  const content = await readFile(filePath, 'utf-8');
  const data = yaml.load(content) as any;

  // Validate and transform the loaded data
  const scenario: TestScenario = {
    name: data.name || 'Unnamed Test',
    storyFile: data.storyFile,
    playerModel: data.playerModel,
    engineModel: data.engineModel,
    goals: data.goals || [],
    maxTurns: data.maxTurns,
    successCriteria: data.successCriteria || {
      allRequiredGoals: true,
      withinTurnLimit: true
    },
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