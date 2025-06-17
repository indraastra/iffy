import { readFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';
import { resolve } from 'node:path';
import { ModelProfiles, EngineProfile, PlayerProfile } from '../core/matrix-types';

const DEFAULT_PROFILES_PATH = 'tests/config/model-profiles.yaml';

export async function loadProfiles(profilesPath?: string): Promise<ModelProfiles> {
  const path = resolve(profilesPath || DEFAULT_PROFILES_PATH);
  const content = await readFile(path, 'utf-8');
  const data = yaml.load(content) as any;

  // Validate the loaded profiles
  if (!data.engineProfiles || !data.playerProfiles || !data.testSuites) {
    throw new Error('Invalid profiles configuration: missing required sections');
  }

  return data as ModelProfiles;
}

export function getEngineProfile(profiles: ModelProfiles, profileName: string): EngineProfile {
  const profile = profiles.engineProfiles[profileName];
  if (!profile) {
    throw new Error(`Engine profile '${profileName}' not found. Available: ${Object.keys(profiles.engineProfiles).join(', ')}`);
  }
  return profile;
}

export function getPlayerProfile(profiles: ModelProfiles, profileName: string): PlayerProfile {
  const profile = profiles.playerProfiles[profileName];
  if (!profile) {
    throw new Error(`Player profile '${profileName}' not found. Available: ${Object.keys(profiles.playerProfiles).join(', ')}`);
  }
  return profile;
}

export function getTestSuite(profiles: ModelProfiles, suiteName: string) {
  const suite = profiles.testSuites[suiteName];
  if (!suite) {
    throw new Error(`Test suite '${suiteName}' not found. Available: ${Object.keys(profiles.testSuites).join(', ')}`);
  }
  return suite;
}