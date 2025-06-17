import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { InteractionLog, TestScenario, TestResult, GameState } from '../core/types';
import { generateTimestamp } from './cliUtils';

export class InteractionLogger {
  private logs: InteractionLog[] = [];
  private logDir: string;
  private formats: Set<'markdown' | 'json' | 'summary'>;
  
  constructor(options: {
    logDir: string;
    formats?: ('markdown' | 'json' | 'summary')[];
  }) {
    this.logDir = options.logDir;
    this.formats = new Set(options.formats || ['markdown', 'json', 'summary']);
  }

  async initialize(): Promise<void> {
    await mkdir(this.logDir, { recursive: true });
  }

  addInteraction(log: InteractionLog): void {
    this.logs.push(log);
  }

  async save(scenario: TestScenario, result: TestResult): Promise<void> {
    const savePromises: Promise<void>[] = [];

    if (this.formats.has('markdown')) {
      savePromises.push(this.saveMarkdown(scenario, result));
    }
    
    if (this.formats.has('json')) {
      savePromises.push(this.saveJson(scenario, result));
    }
    
    if (this.formats.has('summary')) {
      savePromises.push(this.saveSummary(scenario, result));
    }

    await Promise.all(savePromises);
  }

  private async saveMarkdown(scenario: TestScenario, result: TestResult): Promise<void> {
    const lines: string[] = [
      `# ${scenario.name} - Test Run ${generateTimestamp()}`,
      '',
      '## Configuration',
      `- Story: ${scenario.storyFile}`,
      `- Player Model: ${scenario.playerModel?.model || 'default'} (${scenario.playerModel?.provider || 'default'})`,
      `- Engine Model: ${scenario.engineModel?.model || 'default'} (${scenario.engineModel?.provider || 'default'})`,
      `- Goals: ${scenario.goals.map(g => `${g.type}: ${g.target}`).join(', ')}`,
      `- Max Turns: ${scenario.maxTurns || 'unlimited'}`,
      '',
      '## Game Transcript',
      ''
    ];

    for (const log of this.logs) {
      lines.push(`### Turn ${log.turnNumber}`);
      lines.push(`**Scene**: ${log.gameState.currentScene}`);
      lines.push('');
      lines.push(log.gameState.visibleText);
      lines.push('');
      
      if (log.gameState.availableActions.length > 0) {
        lines.push('**Available Actions**:');
        log.gameState.availableActions.forEach((action, i) => {
          lines.push(`${i + 1}. ${action}`);
        });
        lines.push('');
      }

      if (log.player.thinking && scenario.observability?.showThinking) {
        lines.push('**Player Thinking**:');
        lines.push(`> ${log.player.thinking}`);
        lines.push('');
      }

      lines.push(`**Action**: ${log.player.chosenAction}`);
      lines.push('');
      lines.push('**Response**:');
      lines.push(log.engineResponse.narrative);
      lines.push('');
      
      if (log.engineResponse.errors && log.engineResponse.errors.length > 0) {
        lines.push('**Errors**:');
        log.engineResponse.errors.forEach(error => {
          lines.push(`- ❌ ${error}`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    lines.push('## Test Result');
    lines.push(`- **Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`- **Turns Played**: ${result.turnsPlayed}`);
    lines.push(`- **Duration**: ${(result.duration / 1000).toFixed(2)}s`);
    lines.push('');
    lines.push('### Goals Achievement:');
    result.goalsAchieved.forEach(status => {
      const icon = status.achieved ? '✅' : '❌';
      const turn = status.achievedAtTurn ? ` (turn ${status.achievedAtTurn})` : '';
      lines.push(`- ${icon} ${status.goal.type}: ${status.goal.target}${turn}`);
    });

    if (result.errorMessage) {
      lines.push('');
      lines.push(`### Error: ${result.errorMessage}`);
    }

    await writeFile(join(this.logDir, 'full-transcript.md'), lines.join('\n'));
  }

  private async saveJson(scenario: TestScenario, result: TestResult): Promise<void> {
    const debugData = {
      testRun: {
        id: `test-${Date.now()}`,
        scenario: scenario.name,
        startTime: this.logs[0]?.timestamp || generateTimestamp(),
        endTime: generateTimestamp(),
        config: {
          storyFile: scenario.storyFile,
          playerModel: scenario.playerModel,
          engineModel: scenario.engineModel,
          goals: scenario.goals,
          maxTurns: scenario.maxTurns,
          observability: scenario.observability,
        }
      },
      interactions: this.logs,
      result: result
    };

    await writeFile(
      join(this.logDir, 'debug.json'), 
      JSON.stringify(debugData, null, 2)
    );
  }

  private async saveSummary(scenario: TestScenario, result: TestResult): Promise<void> {
    const summary = {
      testName: scenario.name,
      timestamp: generateTimestamp(),
      success: result.success,
      turnsPlayed: result.turnsPlayed,
      duration: `${(result.duration / 1000).toFixed(2)}s`,
      goals: result.goalsAchieved.map(status => ({
        goal: `${status.goal.type}: ${status.goal.target}`,
        achieved: status.achieved,
        achievedAtTurn: status.achievedAtTurn
      })),
      finalScene: result.finalState.currentScene,
      errorMessage: result.errorMessage,
      assessment: (result as any).assessment || null
    };

    const yamlContent = this.toYaml(summary);
    await writeFile(join(this.logDir, 'summary.yaml'), yamlContent);
  }

  private toYaml(obj: any, indent = 0): string {
    const spaces = ' '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      result += `${spaces}${key}: `;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        result += '\n' + this.toYaml(value, indent + 2);
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          result += '[]\n';
        } else if (typeof value[0] === 'object') {
          result += '\n';
          value.forEach(item => {
            result += `${spaces}- \n${this.toYaml(item, indent + 2).split('\n').map(line => '  ' + line).join('\n')}\n`;
          });
        } else {
          result += '\n';
          value.forEach(item => {
            result += `${spaces}- ${item}\n`;
          });
        }
      } else {
        result += `${value}\n`;
      }
    }

    return result;
  }

  getLatestLog(): InteractionLog | undefined {
    return this.logs[this.logs.length - 1];
  }

  getAllLogs(): InteractionLog[] {
    return [...this.logs];
  }
}